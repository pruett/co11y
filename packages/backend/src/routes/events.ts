import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { SSEEvent, HookEvent, Session } from '@co11y/shared';
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

// Get all sessions for periodic updates
async function getAllSessions(claudeDir?: string): Promise<Session[]> {
  try {
    const baseDir = claudeDir || join(homedir(), '.claude', 'projects');
    const projects = scanClaudeProjects(baseDir);
    const allSessions: Session[] = [];

    for (const project of projects) {
      const sessions = discoverSessions(project.fullPath);
      const subagentFiles = discoverSubagents(project.fullPath);

      for (const session of sessions) {
        try {
          const transcript = parseJsonlFile(session.filePath);
          const analysis = analyzeSession(transcript);

          const subagents = subagentFiles.filter(
            (sub) => sub.sessionId === session.id
          );

          allSessions.push({
            id: session.id,
            project: project.decodedPath,
            projectPath: project.fullPath,
            status: analysis.status,
            lastActivity: analysis.lastActivityTime || new Date().toISOString(),
            messageCount: analysis.messageCount,
            toolCallCount: analysis.toolCallCount,
            subagentCount: subagents.length,
            model: analysis.model,
            cwd: analysis.cwd,
            gitBranch: analysis.gitBranch,
            slug: analysis.slug,
          });
        } catch (error) {
          console.error(`Error analyzing session ${session.id}:`, error);
        }
      }
    }

    return allSessions;
  } catch (error) {
    console.error('Error getting sessions:', error);
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

        // Set up periodic session updates (every 10 seconds)
        const sessionUpdateInterval = setInterval(async () => {
          try {
            const sessions = await getAllSessions(claudeDir);
            await stream.writeSSE({
              event: 'sessions',
              data: JSON.stringify(sessions),
            });
          } catch (error) {
            console.error('Error sending session update:', error);
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
        clearInterval(sessionUpdateInterval);
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
      // File changed, broadcast session update
      try {
        const sessions = await getAllSessions(claudeDir);
        broadcastEvent({
          type: 'sessions',
          data: sessions,
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
