import type { TranscriptRecord } from '@co11y/shared';

export interface SessionAnalysis {
  messageCount: number;
  toolCallCount: number;
  lastActivityTime?: string;
  status: 'active' | 'idle';
  model?: string;
  cwd?: string;
  gitBranch?: string;
  slug?: string;
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Analyzes a session transcript to extract metrics and metadata
 * @param transcript Array of transcript records
 * @returns Session analysis metrics
 */
export function analyzeSession(transcript: TranscriptRecord[]): SessionAnalysis {
  let messageCount = 0;
  let toolCallCount = 0;
  let lastActivityTime: string | undefined;
  let model: string | undefined;
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let slug: string | undefined;

  for (const record of transcript) {
    // Update last activity time from any record
    if (
      !lastActivityTime ||
      new Date(record.timestamp) > new Date(lastActivityTime)
    ) {
      lastActivityTime = record.timestamp;
    }

    // Skip queue-operation records for message counting
    if (record.type === 'queue-operation') {
      continue;
    }

    // Count messages (user and assistant)
    messageCount++;

    // Extract metadata from first record with those fields
    if (!cwd && record.cwd) {
      cwd = record.cwd;
    }
    if (!gitBranch && record.gitBranch) {
      gitBranch = record.gitBranch;
    }
    if (!slug && record.slug) {
      slug = record.slug;
    }

    // Count tool calls in assistant messages
    if (record.type === 'assistant') {
      const content = record.message.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'tool_use') {
            toolCallCount++;
          }
        }
      }

      // Extract model from first assistant message
      if (!model && record.message.model) {
        model = record.message.model;
      }
    }
  }

  // Determine active vs idle status
  let status: 'active' | 'idle' = 'idle';
  if (lastActivityTime) {
    const lastActivity = new Date(lastActivityTime);
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

    if (timeSinceLastActivity < ACTIVE_THRESHOLD_MS) {
      status = 'active';
    }
  }

  return {
    messageCount,
    toolCallCount,
    lastActivityTime,
    status,
    model,
    cwd,
    gitBranch,
    slug,
  };
}
