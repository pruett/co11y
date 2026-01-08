import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface ClaudeProject {
  encodedPath: string;
  decodedPath: string;
  fullPath: string;
}

/**
 * Scans the Claude projects directory and returns all discovered projects.
 * Decodes dash-separated directory names to actual filesystem paths.
 * Example: -Users-name-code -> /Users/name/code
 *
 * @param projectsDir - Path to ~/.claude/projects/ directory
 * @returns Array of discovered projects with encoded and decoded paths
 */
export function scanClaudeProjects(projectsDir: string): ClaudeProject[] {
  try {
    const entries = readdirSync(projectsDir);

    const projects: ClaudeProject[] = [];

    for (const entry of entries) {
      const fullPath = join(projectsDir, entry);

      try {
        const stats = statSync(fullPath);

        // Only include directories
        if (!stats.isDirectory()) {
          continue;
        }

        // Decode the directory name from dash-separated to path
        // -Users-name-code -> /Users/name/code
        const decodedPath = entry
          .split('-')
          .filter((segment) => segment !== '') // Remove empty strings from leading dash
          .join('/');

        projects.push({
          encodedPath: entry,
          decodedPath: `/${decodedPath}`,
          fullPath,
        });
      } catch (error) {
        // Skip entries that can't be accessed (permission errors, etc.)
        console.warn(`Skipping ${entry}: ${(error as Error).message}`);
        continue;
      }
    }

    // Sort by encoded path for consistent ordering
    return projects.sort((a, b) => a.encodedPath.localeCompare(b.encodedPath));
  } catch (error) {
    // Handle case where projects directory doesn't exist or can't be accessed
    console.warn(
      `Unable to scan Claude projects directory: ${(error as Error).message}`
    );
    return [];
  }
}
