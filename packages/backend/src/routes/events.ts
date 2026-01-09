import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { SSEEvent, HookEvent, Session, Project } from '@co11y/shared';
import { getEventStore, setBroadcastCallback } from './hooks';
import { scanClaudeProjects } from '../lib/project-scanner';
import { discoverSessions, discoverSubagents } from '../lib/session-discovery';
import { parseJsonlFile } from '../lib/jsonl-parser';
import { analyzeSession } from '../lib/session-analyzer';
import { createFileWatcher } from '../lib/file-watcher';
import type { FSWatcher } from 'chokidar';
import { homedir } from 'os';
import { join } from 'path';

// Track connected clients for broadcasting
const connectedClients = new Set<
  ReadableStreamDefaultController<string>
>();

// Broadcast event to all connected clients
export function broadcastEvent(event: SSEEvent): void {
  const eventData = formatSSEEvent(event);
  for (const client of connectedClients) {
    try {
      client.enqueue(eventData);
    } catch (error) {
      // Client disconnected, will be cleaned up
      console.error('Error broadcasting to client:', error);
    }
  }
}

// Format SSE event according to spec
function formatSSEEvent(event: SSEEvent): string {
  let data: unknown;

  if (event.type === 'heartbeat') {
    data = { timestamp: event.timestamp };
  } else if (event.type === 'hook') {
    data = event.data;
  } else if (event.type === 'sessions') {
    data = event.data;
  }

  return `event: ${event.type}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Get all projects for periodic updates
async function getAllProjects(claudeDir?: string): Promise<Project[]> {
  try {
    const baseDir = claudeDir || join(homedir(), '.claude', 'projects');
    const claudeProjects = scanClaudeProjects(baseDir);
    const projectMap = new Map<string, Project>();

    for (const claudeProject of claudeProjects) {
      const sessions = discoverSessions(claudeProject.fullPath);
      const subagentFiles = discoverSubagents(claudeProject.fullPath);

      // Initialize project
      const project: Project = {
        id: claudeProject.encodedPath,
        name: claudeProject.displayName,
        fullPath: claudeProject.decodedPath,
        sessions: [],
        sessionCount: 0,
        activeSessionCount: 0,
        lastActivity: '',
        totalMessages: 0,
        totalToolCalls: 0,
        totalSubagents: 0,
      };

      for (const session of sessions) {
        try {
          const transcript = parseJsonlFile(session.filePath);
          const analysis = analyzeSession(transcript);

          const subagents = subagentFiles.filter(
            (sub) => sub.sessionId === session.id
          );

          const sessionObj: Session = {
            id: session.id,
            project: claudeProject.decodedPath,
            projectPath: claudeProject.fullPath,
            status: analysis.status,
            lastActivity: analysis.lastActivityTime || new Date().toISOString(),
            messageCount: analysis.messageCount,
            toolCallCount: analysis.toolCallCount,
            subagentCount: subagents.length,
            model: analysis.model,
            cwd: analysis.cwd,
            gitBranch: analysis.gitBranch,
            slug: analysis.slug,
          };

          // Add session to project
          project.sessions.push(sessionObj);
          project.sessionCount++;
          if (sessionObj.status === 'active') project.activeSessionCount++;
          project.totalMessages += sessionObj.messageCount;
          project.totalToolCalls += sessionObj.toolCallCount;
          project.totalSubagents += sessionObj.subagentCount;

          // Update project lastActivity
          if (!project.lastActivity || new Date(sessionObj.lastActivity) > new Date(project.lastActivity)) {
            project.lastActivity = sessionObj.lastActivity;
          }
        } catch (error) {
          console.error(`Error analyzing session ${session.id}:`, error);
        }
      }

      // Sort sessions within project
      project.sessions.sort((a, b) => {
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      // Only add project if it has sessions
      if (project.sessions.length > 0) {
        projectMap.set(claudeProject.encodedPath, project);
      }
    }

    // Convert to array and sort by lastActivity
    const allProjects = Array.from(projectMap.values());
    allProjects.sort((a, b) => {
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return allProjects;
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

// Factory function for testability
export function getEventsHandler(claudeDir?: string) {
  return async (c: Context) => {
    return streamSSE(c, async (stream) => {
      // Track this client
      const controller = (stream as any).controller as ReadableStreamDefaultController<string>;
      connectedClients.add(controller);

      try {
        // Send initial heartbeat
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });

        // Send any existing hook events from the store
        const existingEvents = getEventStore().getEvents();
        for (const hookEvent of existingEvents) {
          await stream.writeSSE({
            event: 'hook',
            data: JSON.stringify(hookEvent),
          });
        }

        // Set up periodic project updates (every 10 seconds)
        const projectUpdateInterval = setInterval(async () => {
          try {
            const projects = await getAllProjects(claudeDir);
            await stream.writeSSE({
              event: 'projects',
              data: JSON.stringify(projects),
            });
          } catch (error) {
            console.error('Error sending project update:', error);
          }
        }, 10000);

        // Set up heartbeat interval (every 30 seconds)
        const heartbeatInterval = setInterval(async () => {
          try {
            await stream.writeSSE({
              event: 'heartbeat',
              data: JSON.stringify({ timestamp: new Date().toISOString() }),
            });
          } catch (error) {
            console.error('Error sending heartbeat:', error);
          }
        }, 30000);

        // Keep connection alive - wait for client to disconnect
        await new Promise<void>((resolve) => {
          // The stream will handle the connection lifecycle
          // This promise will resolve when the stream closes
          stream.onAbort(() => {
            resolve();
          });
        });

        // Cleanup on disconnect
        clearInterval(projectUpdateInterval);
        clearInterval(heartbeatInterval);
      } finally {
        // Remove client from tracking
        connectedClients.delete(controller);
      }
    });
  };
}

// Store file watcher instance
let fileWatcher: FSWatcher | null = null;

// Hook into event store to broadcast new events
// This will be called when new hook events are received
export function setupEventBroadcasting(claudeDir?: string): void {
  setBroadcastCallback((event: HookEvent) => {
    broadcastEvent({
      type: 'hook',
      data: event,
    });
  });

  // Setup file watcher for instant updates
  const watchDir = claudeDir || join(homedir(), '.claude', 'projects');

  // Close existing watcher if any
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = createFileWatcher(
    watchDir,
    async (filePath) => {
      // File changed, broadcast project update
      try {
        const projects = await getAllProjects(claudeDir);
        broadcastEvent({
          type: 'projects',
          data: projects,
        });
      } catch (error) {
        console.error('Error broadcasting file change:', error);
      }
    },
    500 // 500ms debounce
  );

  console.log(`File watcher started for: ${watchDir}`);
}

// Cleanup file watcher
export function stopFileWatcher(): void {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
    console.log('File watcher stopped');
  }
}
