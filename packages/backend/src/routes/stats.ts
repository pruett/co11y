import { Context } from 'hono';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { StatsCache, Stats, StatsResponse } from '@co11y/shared';

/**
 * Factory function to create the stats handler with optional custom Claude directory
 */
export function getStats(claudeDir?: string) {
  return async (c: Context) => {
    try {
      const baseDir = claudeDir || join(homedir(), '.claude');
      const statsFilePath = join(baseDir, 'stats-cache.json');

      let statsCache: StatsCache | null = null;

      // Try to read stats-cache.json
      try {
        const fileContent = readFileSync(statsFilePath, 'utf-8');
        statsCache = JSON.parse(fileContent) as StatsCache;
      } catch (error) {
        // File doesn't exist or is malformed - return empty stats
        console.warn('Could not read stats-cache.json:', error);
      }

      // Build stats response
      const stats: Stats = statsCache
        ? buildStatsFromCache(statsCache)
        : getEmptyStats();

      const response: StatsResponse = {
        stats,
      };

      return c.json(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

/**
 * Build Stats object from StatsCache data
 */
function buildStatsFromCache(cache: StatsCache): Stats {
  const today = new Date().toISOString().split('T')[0];

  // Find today's activity
  const todayActivity = cache.dailyActivity.find((a) => a.date === today);

  // Calculate total tokens from dailyModelTokens
  const totalTokens = cache.dailyModelTokens.reduce((sum, day) => {
    return (
      sum +
      Object.values(day.tokensByModel).reduce((s, tokens) => s + tokens, 0)
    );
  }, 0);

  return {
    totalSessions: cache.totalSessions,
    totalMessages: cache.totalMessages,
    messagesToday: todayActivity?.messageCount || 0,
    sessionsToday: todayActivity?.sessionCount || 0,
    toolCallsToday: todayActivity?.toolCallCount || 0,
    totalTokens,
    modelUsage: cache.modelUsage,
    dailyActivity: cache.dailyActivity,
    firstSessionDate: cache.firstSessionDate,
    longestSession: cache.longestSession,
  };
}

/**
 * Return empty stats when no data is available
 */
function getEmptyStats(): Stats {
  return {
    totalSessions: 0,
    totalMessages: 0,
    messagesToday: 0,
    sessionsToday: 0,
    toolCallsToday: 0,
    totalTokens: 0,
    modelUsage: {},
    dailyActivity: [],
    firstSessionDate: '',
    longestSession: {
      sessionId: '',
      duration: 0,
      messageCount: 0,
      timestamp: '',
    },
  };
}
