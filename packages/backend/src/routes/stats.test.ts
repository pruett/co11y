import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { getStats } from './stats';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { StatsResponse, StatsCache } from '@co11y/shared';

describe('GET /api/stats', () => {
  let app: Hono;
  let testDir: string;

  beforeEach(() => {
    // Create a fresh test directory
    testDir = join(tmpdir(), `stats-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create a new Hono app for each test
    app = new Hono();
    app.get('/api/stats', getStats(testDir));
  });

  it('should return stats from stats-cache.json', async () => {
    const today = new Date().toISOString().split('T')[0];
    const mockStatsCache: StatsCache = {
      version: 1,
      lastComputedDate: today,
      dailyActivity: [
        {
          date: today,
          messageCount: 100,
          sessionCount: 5,
          toolCallCount: 25,
        },
        {
          date: '2026-01-06',
          messageCount: 50,
          sessionCount: 3,
          toolCallCount: 10,
        },
      ],
      dailyModelTokens: [
        {
          date: '2026-01-07',
          tokensByModel: {
            'claude-sonnet-4-5-20250929': 50000,
            'claude-opus-4-5-20251101': 10000,
          },
        },
      ],
      modelUsage: {
        'claude-sonnet-4-5-20250929': {
          inputTokens: 15000,
          outputTokens: 25000,
          cacheReadInputTokens: 100000,
          cacheCreationInputTokens: 50000,
          webSearchRequests: 0,
          costUSD: 0,
          contextWindow: 0,
        },
        'claude-opus-4-5-20251101': {
          inputTokens: 5000,
          outputTokens: 5000,
          cacheReadInputTokens: 20000,
          cacheCreationInputTokens: 10000,
          webSearchRequests: 0,
          costUSD: 0,
          contextWindow: 0,
        },
      },
      totalSessions: 20,
      totalMessages: 500,
      longestSession: {
        sessionId: 'abc-123',
        duration: 1000000,
        messageCount: 50,
        timestamp: '2026-01-05T10:00:00.000Z',
      },
      firstSessionDate: '2025-11-01T00:00:00.000Z',
      hourCounts: { '9': 5, '10': 3 },
    };

    writeFileSync(
      join(testDir, 'stats-cache.json'),
      JSON.stringify(mockStatsCache)
    );

    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);

    const data = (await res.json()) as StatsResponse;
    expect(data.stats.totalSessions).toBe(20);
    expect(data.stats.totalMessages).toBe(500);
    expect(data.stats.messagesToday).toBe(100);
    expect(data.stats.sessionsToday).toBe(5);
    expect(data.stats.toolCallsToday).toBe(25);
    expect(data.stats.totalTokens).toBe(60000);
    expect(data.stats.modelUsage['claude-sonnet-4-5-20250929'].inputTokens).toBe(
      15000
    );
    expect(data.stats.dailyActivity).toHaveLength(2);
    expect(data.stats.longestSession.sessionId).toBe('abc-123');
    expect(data.stats.firstSessionDate).toBe('2025-11-01T00:00:00.000Z');
  });

  it('should return empty stats when stats-cache.json does not exist', async () => {
    // Don't create stats-cache.json
    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);

    const data = (await res.json()) as StatsResponse;
    expect(data.stats.totalSessions).toBe(0);
    expect(data.stats.totalMessages).toBe(0);
    expect(data.stats.messagesToday).toBe(0);
    expect(data.stats.sessionsToday).toBe(0);
    expect(data.stats.toolCallsToday).toBe(0);
    expect(data.stats.totalTokens).toBe(0);
    expect(data.stats.modelUsage).toEqual({});
    expect(data.stats.dailyActivity).toEqual([]);
  });

  it('should handle malformed stats-cache.json', async () => {
    writeFileSync(join(testDir, 'stats-cache.json'), 'invalid json');

    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);

    const data = (await res.json()) as StatsResponse;
    expect(data.stats.totalSessions).toBe(0);
  });

  it('should calculate today stats correctly', async () => {
    const today = new Date().toISOString().split('T')[0];
    const mockStatsCache: StatsCache = {
      version: 1,
      lastComputedDate: today,
      dailyActivity: [
        {
          date: today,
          messageCount: 150,
          sessionCount: 7,
          toolCallCount: 35,
        },
        {
          date: '2026-01-01',
          messageCount: 50,
          sessionCount: 2,
          toolCallCount: 10,
        },
      ],
      dailyModelTokens: [],
      modelUsage: {},
      totalSessions: 10,
      totalMessages: 200,
      longestSession: {
        sessionId: 'test',
        duration: 1000,
        messageCount: 10,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      firstSessionDate: '2026-01-01T00:00:00.000Z',
      hourCounts: {},
    };

    writeFileSync(
      join(testDir, 'stats-cache.json'),
      JSON.stringify(mockStatsCache)
    );

    const res = await app.request('/api/stats');
    const data = (await res.json()) as StatsResponse;
    expect(data.stats.messagesToday).toBe(150);
    expect(data.stats.sessionsToday).toBe(7);
    expect(data.stats.toolCallsToday).toBe(35);
  });

  it('should calculate total tokens from all models', async () => {
    const mockStatsCache: StatsCache = {
      version: 1,
      lastComputedDate: '2026-01-07',
      dailyActivity: [],
      dailyModelTokens: [
        {
          date: '2026-01-07',
          tokensByModel: {
            'model1': 10000,
            'model2': 20000,
            'model3': 30000,
          },
        },
      ],
      modelUsage: {},
      totalSessions: 0,
      totalMessages: 0,
      longestSession: {
        sessionId: '',
        duration: 0,
        messageCount: 0,
        timestamp: '',
      },
      firstSessionDate: '',
      hourCounts: {},
    };

    writeFileSync(
      join(testDir, 'stats-cache.json'),
      JSON.stringify(mockStatsCache)
    );

    const res = await app.request('/api/stats');
    const data = (await res.json()) as StatsResponse;
    expect(data.stats.totalTokens).toBe(60000);
  });

  it('should handle empty dailyActivity array', async () => {
    const mockStatsCache: StatsCache = {
      version: 1,
      lastComputedDate: '2026-01-07',
      dailyActivity: [],
      dailyModelTokens: [],
      modelUsage: {},
      totalSessions: 5,
      totalMessages: 100,
      longestSession: {
        sessionId: 'test',
        duration: 1000,
        messageCount: 10,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      firstSessionDate: '2026-01-01T00:00:00.000Z',
      hourCounts: {},
    };

    writeFileSync(
      join(testDir, 'stats-cache.json'),
      JSON.stringify(mockStatsCache)
    );

    const res = await app.request('/api/stats');
    const data = (await res.json()) as StatsResponse;
    expect(data.stats.messagesToday).toBe(0);
    expect(data.stats.sessionsToday).toBe(0);
    expect(data.stats.toolCallsToday).toBe(0);
  });
});
