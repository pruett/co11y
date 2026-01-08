import { Context } from 'hono';
import type { TranscriptResponse, TranscriptRecord } from '@co11y/shared';
import { scanClaudeProjects } from '../lib/project-scanner';
import { discoverSubagents } from '../lib/session-discovery';
import { parseJsonlFile } from '../lib/jsonl-parser';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Creates a handler for GET /api/subagents/:agentId/transcript endpoint
 * @param claudeDir - Optional override for Claude projects directory (for testing)
 */
export function getSubagentTranscript(claudeDir?: string) {
  return async (c: Context) => {
    try {
      const agentId = c.req.param('agentId');
      const limit = parseInt(c.req.query('limit') || '50');
      const offset = parseInt(c.req.query('offset') || '0');
      const projectsDir = claudeDir || join(homedir(), '.claude', 'projects');

      // Discover all projects
      const projects = scanClaudeProjects(projectsDir);

      // Find the subagent file across all projects
      for (const project of projects) {
        const subagents = discoverSubagents(project.fullPath);
        const subagent = subagents.find((sa) => sa.agentId === agentId);

        if (subagent) {
          // Parse the subagent transcript
          const transcript = parseJsonlFile(subagent.filePath);
          const total = transcript.length;

          // Apply pagination
          const paginatedTranscript = transcript.slice(offset, offset + limit);

          const response: TranscriptResponse = {
            sessionId: subagent.sessionId,
            transcript: paginatedTranscript,
            total,
            limit,
            offset,
          };

          return c.json(response);
        }
      }

      // Subagent not found
      return c.json({ error: 'Subagent not found' }, 404);
    } catch (error) {
      console.error('Error fetching subagent transcript:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}
