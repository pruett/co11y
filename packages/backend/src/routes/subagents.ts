import { Context } from 'hono';
import type {
  SubagentsResponse,
  Subagent,
  TranscriptRecord,
  MessageContent,
  UserTranscriptRecord,
  AssistantTranscriptRecord,
} from '@co11y/shared';
import { scanClaudeProjects } from '../lib/project-scanner';
import { discoverSessions, discoverSubagents } from '../lib/session-discovery';
import { parseJsonlFile } from '../lib/jsonl-parser';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Extracts task description from first user message in subagent transcript
 */
function extractTask(transcript: TranscriptRecord[]): string {
  const firstUserRecord = transcript.find(
    (r): r is UserTranscriptRecord => r.type === 'user'
  );

  if (!firstUserRecord) {
    return 'Unknown task';
  }

  const content = firstUserRecord.message.content;

  // Handle string content
  if (typeof content === 'string') {
    // Extract text after "Task:" if present
    const taskMatch = content.match(/Task:\s*(.+)/i);
    return taskMatch ? taskMatch[1].trim() : content;
  }

  // Handle array content
  if (Array.isArray(content)) {
    const textContent = content.find((c) => c.type === 'text');
    if (textContent && 'text' in textContent) {
      const taskMatch = textContent.text.match(/Task:\s*(.+)/i);
      return taskMatch ? taskMatch[1].trim() : textContent.text;
    }
  }

  return 'Unknown task';
}

/**
 * Determines subagent status based on transcript activity
 */
function determineStatus(
  transcript: TranscriptRecord[]
): 'running' | 'completed' | 'error' {
  if (transcript.length === 0) {
    return 'completed';
  }

  // Check for errors in tool results
  const hasError = transcript.some((record) => {
    if (record.type === 'user') {
      const content = record.message.content;
      if (Array.isArray(content)) {
        return content.some(
          (c) => c.type === 'tool_result' && c.is_error === true
        );
      }
    }
    return false;
  });

  if (hasError) {
    return 'error';
  }

  // Get last record timestamp
  const lastRecord = transcript[transcript.length - 1];
  const lastTimestamp = new Date(lastRecord.timestamp).getTime();
  const now = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000;

  // If last activity was within 5 minutes, consider it running
  if (now - lastTimestamp < fiveMinutesInMs) {
    return 'running';
  }

  // Otherwise, it's completed
  return 'completed';
}

/**
 * Extracts the current tool being used (for running subagents)
 */
function getCurrentTool(transcript: TranscriptRecord[]): string | undefined {
  // Find the last assistant message with tool_use
  for (let i = transcript.length - 1; i >= 0; i--) {
    const record = transcript[i];
    if (record.type === 'assistant') {
      const content = record.message.content;
      const toolUse = content.find((c) => c.type === 'tool_use');
      if (toolUse && 'name' in toolUse) {
        return toolUse.name;
      }
    }
  }
  return undefined;
}

/**
 * Analyzes a subagent transcript and returns Subagent metadata
 */
function analyzeSubagent(
  agentId: string,
  sessionId: string,
  transcript: TranscriptRecord[]
): Subagent {
  const task = extractTask(transcript);
  const status = determineStatus(transcript);
  const currentTool = status === 'running' ? getCurrentTool(transcript) : undefined;

  // Count messages and tool calls
  const messageCount = transcript.filter(
    (r) => r.type === 'user' || r.type === 'assistant'
  ).length;

  const toolCallCount = transcript.reduce((count, record) => {
    if (record.type === 'assistant') {
      const toolUses = record.message.content.filter((c) => c.type === 'tool_use');
      return count + toolUses.length;
    }
    return count;
  }, 0);

  // Get timestamps
  const startTime =
    transcript.length > 0
      ? transcript[0].timestamp
      : new Date().toISOString();
  const endTime =
    status !== 'running' && transcript.length > 0
      ? transcript[transcript.length - 1].timestamp
      : undefined;

  // Calculate duration
  let duration: number | undefined;
  if (endTime) {
    duration =
      new Date(endTime).getTime() - new Date(startTime).getTime();
  }

  return {
    agentId,
    sessionId,
    task,
    status,
    startTime,
    endTime,
    duration,
    messageCount,
    toolCallCount,
    currentTool,
  };
}

/**
 * Creates a handler for GET /api/sessions/:sessionId/subagents endpoint
 * @param claudeDir - Optional override for Claude projects directory (for testing)
 */
export function getSubagents(claudeDir?: string) {
  return async (c: Context) => {
    try {
      const sessionId = c.req.param('sessionId');
      const projectsDir = claudeDir || join(homedir(), '.claude', 'projects');

      // Discover all projects
      const projects = scanClaudeProjects(projectsDir);

      // Find the session across all projects
      for (const project of projects) {
        const sessions = discoverSessions(project.fullPath);
        const sessionExists = sessions.some((s) => s.id === sessionId);

        if (sessionExists) {
          // Find all subagents for this session
          const allSubagents = discoverSubagents(project.fullPath);
          const sessionSubagents = allSubagents.filter(
            (sa) => sa.sessionId === sessionId
          );

          // Analyze each subagent
          const subagents: Subagent[] = [];
          for (const subagentFile of sessionSubagents) {
            try {
              const transcript = parseJsonlFile(subagentFile.filePath);
              const analysis = analyzeSubagent(
                subagentFile.agentId,
                sessionId,
                transcript
              );
              subagents.push(analysis);
            } catch (error) {
              console.warn(
                `Failed to analyze subagent ${subagentFile.agentId}:`,
                error
              );
            }
          }

          const response: SubagentsResponse = {
            sessionId,
            subagents,
          };

          return c.json(response);
        }
      }

      // Session not found
      return c.json({ error: 'Session not found' }, 404);
    } catch (error) {
      console.error('Error fetching subagents:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}
