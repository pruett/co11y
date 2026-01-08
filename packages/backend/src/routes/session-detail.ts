import { Context } from 'hono';
import type { SessionDetail, TranscriptResponse } from '@co11y/shared';
import { scanClaudeProjects } from '../lib/project-scanner';
import { discoverSessions, discoverSubagents } from '../lib/session-discovery';
import { analyzeSession } from '../lib/session-analyzer';
import { parseJsonlFile } from '../lib/jsonl-parser';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Creates a handler for GET /api/sessions/:id endpoint
 * @param claudeDir - Optional override for Claude projects directory (for testing)
 */
export function getSessionDetail(claudeDir?: string) {
  return async (c: Context) => {
    try {
      const sessionId = c.req.param('id');
      const projectsDir = claudeDir || join(homedir(), '.claude', 'projects');

      // Discover all projects
      const projects = scanClaudeProjects(projectsDir);

      // Find the session across all projects
      for (const project of projects) {
        const sessions = discoverSessions(project.fullPath);
        const sessionFile = sessions.find((s) => s.id === sessionId);

        if (sessionFile) {
          // Parse transcript
          const transcript = parseJsonlFile(sessionFile.filePath);

          // Analyze session
          const analysis = analyzeSession(transcript);

          // Count subagents for this session
          const subagents = discoverSubagents(project.fullPath);
          const sessionSubagents = subagents.filter(
            (sa) => sa.sessionId === sessionId
          );

          // Build session detail object
          const sessionDetail: SessionDetail = {
            id: sessionId,
            project: project.decodedPath,
            projectPath: project.decodedPath,
            status: analysis.status,
            lastActivity: analysis.lastActivityTime || new Date().toISOString(),
            messageCount: analysis.messageCount,
            toolCallCount: analysis.toolCallCount,
            subagentCount: sessionSubagents.length,
            model: analysis.model,
            cwd: analysis.cwd,
            gitBranch: analysis.gitBranch,
            slug: analysis.slug,
            transcript,
          };

          return c.json(sessionDetail);
        }
      }

      // Session not found
      return c.json({ error: 'Session not found' }, 404);
    } catch (error) {
      console.error('Error fetching session detail:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

/**
 * Creates a handler for GET /api/sessions/:id/transcript endpoint
 * @param claudeDir - Optional override for Claude projects directory (for testing)
 */
export function getSessionTranscript(claudeDir?: string) {
  return async (c: Context) => {
    try {
      const sessionId = c.req.param('id');
      const limit = parseInt(c.req.query('limit') || '50', 10);
      const offset = parseInt(c.req.query('offset') || '0', 10);
      const projectsDir = claudeDir || join(homedir(), '.claude', 'projects');

      // Discover all projects
      const projects = scanClaudeProjects(projectsDir);

      // Find the session across all projects
      for (const project of projects) {
        const sessions = discoverSessions(project.fullPath);
        const sessionFile = sessions.find((s) => s.id === sessionId);

        if (sessionFile) {
          // Parse transcript
          const fullTranscript = parseJsonlFile(sessionFile.filePath);

          // Paginate transcript
          const paginatedTranscript = fullTranscript.slice(offset, offset + limit);

          const response: TranscriptResponse = {
            sessionId,
            transcript: paginatedTranscript,
            total: fullTranscript.length,
            limit,
            offset,
          };

          return c.json(response);
        }
      }

      // Session not found
      return c.json({ error: 'Session not found' }, 404);
    } catch (error) {
      console.error('Error fetching session transcript:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}
