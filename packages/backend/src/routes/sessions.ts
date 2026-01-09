import { Context } from 'hono';
import type { Session, Project, ProjectsResponse } from '@co11y/shared';
import { scanClaudeProjects } from '../lib/project-scanner';
import { discoverSessions, discoverSubagents } from '../lib/session-discovery';
import { analyzeSession } from '../lib/session-analyzer';
import { parseJsonlFile } from '../lib/jsonl-parser';
import { homedir } from 'os';
import { join } from 'path';
import { statSync } from 'fs';

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
      const claudeProjects = scanClaudeProjects(projectsDir);
      const projectMap = new Map<string, Project>();

      // Process each project
      for (const claudeProject of claudeProjects) {
        const sessions = discoverSessions(claudeProject.fullPath);
        const subagents = discoverSubagents(claudeProject.fullPath);

        // Initialize project entry
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

        // Process each session
        for (const sessionFile of sessions) {
          try {
            // Parse transcript
            const transcript = parseJsonlFile(sessionFile.filePath);

            // Analyze session
            const analysis = analyzeSession(transcript);

            // Use file mtime as fallback for lastActivity
            let lastActivity = analysis.lastActivityTime;
            if (!lastActivity) {
              try {
                const stats = statSync(sessionFile.filePath);
                lastActivity = stats.mtime.toISOString();
              } catch {
                lastActivity = new Date(0).toISOString(); // Very old date as last resort
              }
            }

            // Count subagents for this session
            const sessionSubagents = subagents.filter(
              (sa) => sa.sessionId === sessionFile.id
            );

            // Build session object
            const session: Session = {
              id: sessionFile.id,
              project: claudeProject.decodedPath,
              projectPath: claudeProject.decodedPath,
              status: analysis.status,
              lastActivity,
              messageCount: analysis.messageCount,
              toolCallCount: analysis.toolCallCount,
              subagentCount: sessionSubagents.length,
              model: analysis.model,
              cwd: analysis.cwd,
              gitBranch: analysis.gitBranch,
              slug: analysis.slug,
            };

            // Add session to project
            project.sessions.push(session);
            project.sessionCount++;
            if (session.status === 'active') project.activeSessionCount++;
            project.totalMessages += session.messageCount;
            project.totalToolCalls += session.toolCallCount;
            project.totalSubagents += session.subagentCount;

            // Update project lastActivity if this session is more recent
            if (!project.lastActivity || new Date(session.lastActivity) > new Date(project.lastActivity)) {
              project.lastActivity = session.lastActivity;
            }
          } catch (error) {
            // Skip sessions that fail to parse/analyze
            console.warn(`Failed to process session ${sessionFile.id}:`, error);
          }
        }

        // Sort sessions within project by lastActivity (most recent first)
        project.sessions.sort((a, b) => {
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

        // Only add project if it has sessions
        if (project.sessions.length > 0) {
          projectMap.set(claudeProject.encodedPath, project);
        }
      }

      // Convert map to array and sort by sessionCount (descending)
      let allProjects = Array.from(projectMap.values());
      allProjects.sort((a, b) => {
        return b.sessionCount - a.sessionCount;
      });

      // Filter projects if active only requested
      if (activeOnly) {
        allProjects = allProjects
          .map(project => ({
            ...project,
            sessions: project.sessions.filter(s => s.status === 'active'),
            sessionCount: project.sessions.filter(s => s.status === 'active').length,
          }))
          .filter(project => project.sessions.length > 0);
      }

      // Calculate totals
      const totalSessions = allProjects.reduce((sum, p) => sum + p.sessionCount, 0);
      const activeSessionCount = allProjects.reduce((sum, p) => sum + p.activeSessionCount, 0);

      const response: ProjectsResponse = {
        projects: allProjects,
        totalProjects: allProjects.length,
        totalSessions,
        activeSessionCount,
      };

      return c.json(response);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Return empty response on error
      return c.json({
        projects: [],
        totalProjects: 0,
        totalSessions: 0,
        activeSessionCount: 0,
      });
    }
  };
}
