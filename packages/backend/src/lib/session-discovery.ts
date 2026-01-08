import { readdirSync } from 'fs';
import { join } from 'path';
import { parseJsonlFile } from './jsonl-parser';

export interface SessionFile {
  id: string;
  filePath: string;
}

export interface SubagentFile {
  agentId: string;
  sessionId: string;
  filePath: string;
}

/**
 * Discovers all main session files (UUID.jsonl) in a project directory.
 * Main sessions are identified by UUID filenames (e.g., 1c5be2b5-7887-48c0-8f2a-0e55031f852b.jsonl).
 * Subagent files (agent-*.jsonl) are ignored.
 *
 * @param projectDir - Path to the project directory
 * @returns Array of discovered session files with id and path
 */
export function discoverSessions(projectDir: string): SessionFile[] {
  try {
    const entries = readdirSync(projectDir);
    const sessions: SessionFile[] = [];

    // UUID pattern: 8-4-4-4-12 hex characters
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

    for (const entry of entries) {
      // Check if filename matches UUID pattern
      if (uuidPattern.test(entry)) {
        const id = entry.replace('.jsonl', '');
        sessions.push({
          id,
          filePath: join(projectDir, entry),
        });
      }
    }

    // Sort by session ID for consistent ordering
    return sessions.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.warn(
      `Unable to discover sessions in ${projectDir}: ${(error as Error).message}`
    );
    return [];
  }
}

/**
 * Discovers all subagent files (agent-*.jsonl) in a project directory.
 * Associates subagents with parent sessions via sessionId from the transcript.
 * Main session files (UUID.jsonl) are ignored.
 *
 * @param projectDir - Path to the project directory
 * @returns Array of discovered subagent files with agentId, sessionId, and path
 */
export function discoverSubagents(projectDir: string): SubagentFile[] {
  try {
    const entries = readdirSync(projectDir);
    const subagents: SubagentFile[] = [];

    // Subagent pattern: agent-{shortId}.jsonl
    const subagentPattern = /^agent-([a-zA-Z0-9]+)\.jsonl$/;

    for (const entry of entries) {
      const match = entry.match(subagentPattern);

      if (match) {
        const agentId = match[1];
        const filePath = join(projectDir, entry);

        // Parse the first record to get sessionId
        try {
          const records = parseJsonlFile(filePath);

          // Find the first record with a sessionId
          const firstRecord = records.find((record) => 'sessionId' in record);

          if (firstRecord && 'sessionId' in firstRecord) {
            subagents.push({
              agentId,
              sessionId: firstRecord.sessionId,
              filePath,
            });
          } else {
            // No sessionId found, but still add the subagent with empty sessionId
            console.warn(
              `No sessionId found in subagent file ${entry}, adding with empty sessionId`
            );
            subagents.push({
              agentId,
              sessionId: '',
              filePath,
            });
          }
        } catch (error) {
          console.warn(
            `Failed to parse subagent file ${entry}: ${(error as Error).message}`
          );
          // Still add the subagent with empty sessionId if parsing fails
          subagents.push({
            agentId,
            sessionId: '',
            filePath,
          });
        }
      }
    }

    // Sort by agent ID for consistent ordering
    return subagents.sort((a, b) => a.agentId.localeCompare(b.agentId));
  } catch (error) {
    console.warn(
      `Unable to discover subagents in ${projectDir}: ${(error as Error).message}`
    );
    return [];
  }
}
