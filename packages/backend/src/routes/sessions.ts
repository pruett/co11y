import { Context } from 'hono';
import type { Session, SessionsResponse } from '@co11y/shared';
import { scanClaudeProjects } from '../lib/project-scanner';
import { discoverSessions, discoverSubagents } from '../lib/session-discovery';
import { analyzeSession } from '../lib/session-analyzer';
import { parseJsonlFile } from '../lib/jsonl-parser';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Creates a handler for GET /api/sessions endpoint
 * @param claudeDir - Optional override for Claude projects directory (for testing)
 */
export function getSessions(claudeDir?: string) {
  return async (c: Context) => {
    try {
      const activeOnly = c.req.query('active') === 'true';
      const projectsDir = claudeDir || join(homedir(), '.claude', 'projects');

      // Discover all projects
      const projects = scanClaudeProjects(projectsDir);
      const allSessions: Session[] = [];

      // Process each project
      for (const project of projects) {
        const sessions = discoverSessions(project.fullPath);
        const subagents = discoverSubagents(project.fullPath);

        // Process each session
        for (const sessionFile of sessions) {
          try {
            // Parse transcript
            const transcript = parseJsonlFile(sessionFile.filePath);

            // Analyze session
            const analysis = analyzeSession(transcript);

            // Count subagents for this session
            const sessionSubagents = subagents.filter(
              (sa) => sa.sessionId === sessionFile.id
            );

            // Build session object
            const session: Session = {
              id: sessionFile.id,
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
            };

            allSessions.push(session);
          } catch (error) {
            // Skip sessions that fail to parse/analyze
            console.warn(`Failed to process session ${sessionFile.id}:`, error);
          }
        }
      }

      // Sort by last activity (most recent first)
      allSessions.sort((a, b) => {
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      // Filter active sessions if requested
      const filteredSessions = activeOnly
        ? allSessions.filter((s) => s.status === 'active')
        : allSessions;

      // Calculate counts
      const total = allSessions.length;
      const activeCount = allSessions.filter((s) => s.status === 'active').length;

      const response: SessionsResponse = {
        sessions: filteredSessions,
        total,
        activeCount,
      };

      return c.json(response);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Return empty response on error
      return c.json({
        sessions: [],
        total: 0,
        activeCount: 0,
      });
    }
  };
}
