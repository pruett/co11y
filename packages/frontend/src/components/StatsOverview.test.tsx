import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { StatsOverview } from './StatsOverview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StatsResponse } from '@co11y/shared';

// Create a test wrapper with QueryClient
function renderWithQueryClient(ui: React.ReactElement, stats?: StatsResponse) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // Pre-populate the cache if stats are provided
  if (stats) {
    queryClient.setQueryData(['stats'], stats);
  }

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('StatsOverview', () => {
  it('should display loading state', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <StatsOverview />
      </QueryClientProvider>
    );

    // Check for loading skeletons (animated elements)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display stats when data is available', () => {
    const mockStats: StatsResponse = {
      stats: {
        totalSessions: 100,
        totalMessages: 5000,
        messagesToday: 250,
        sessionsToday: 10,
        toolCallsToday: 75,
        totalTokens: 1000000,
        modelUsage: {
          'claude-sonnet-4-5-20250929': {
            inputTokens: 50000,
            outputTokens: 150000,
            cacheReadInputTokens: 300000,
            cacheCreationInputTokens: 100000,
            webSearchRequests: 0,
            costUSD: 0,
            contextWindow: 0,
          },
        },
        dailyActivity: [],
        firstSessionDate: '2025-11-01T00:00:00.000Z',
        longestSession: {
          sessionId: 'test',
          duration: 1000,
          messageCount: 50,
          timestamp: '2025-11-01T00:00:00.000Z',
        },
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Check for total sessions
    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('Total Sessions');

    // Check for messages today
    expect(container.textContent).toContain('250');
    expect(container.textContent).toContain('Messages Today');

    // Check for total messages
    expect(container.textContent).toContain('5,000');
    expect(container.textContent).toContain('Total Messages');

    // Check for tokens
    expect(container.textContent).toContain('1,000,000');
    expect(container.textContent).toContain('Tokens Used');
  });

  it('should display model usage breakdown', () => {
    const mockStats: StatsResponse = {
      stats: {
        totalSessions: 50,
        totalMessages: 1000,
        messagesToday: 0,
        sessionsToday: 0,
        toolCallsToday: 0,
        totalTokens: 500000,
        modelUsage: {
          'claude-sonnet-4-5-20250929': {
            inputTokens: 10000,
            outputTokens: 20000,
            cacheReadInputTokens: 50000,
            cacheCreationInputTokens: 10000,
            webSearchRequests: 0,
            costUSD: 0,
            contextWindow: 0,
          },
          'claude-opus-4-5-20251101': {
            inputTokens: 5000,
            outputTokens: 8000,
            cacheReadInputTokens: 15000,
            cacheCreationInputTokens: 5000,
            webSearchRequests: 0,
            costUSD: 0,
            contextWindow: 0,
          },
        },
        dailyActivity: [],
        firstSessionDate: '2025-11-01T00:00:00.000Z',
        longestSession: {
          sessionId: 'test',
          duration: 1000,
          messageCount: 50,
          timestamp: '2025-11-01T00:00:00.000Z',
        },
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Check for Model Usage heading
    expect(container.textContent).toContain('Model Usage');

    // Check for model names (formatted)
    expect(container.textContent).toContain('Sonnet');
    expect(container.textContent).toContain('Opus');

    // Check for token breakdown
    expect(container.textContent).toContain('Input:');
    expect(container.textContent).toContain('Output:');
    expect(container.textContent).toContain('Cache Read:');
  });

  it('should handle empty model usage', () => {
    const mockStats: StatsResponse = {
      stats: {
        totalSessions: 10,
        totalMessages: 100,
        messagesToday: 5,
        sessionsToday: 1,
        toolCallsToday: 2,
        totalTokens: 0,
        modelUsage: {},
        dailyActivity: [],
        firstSessionDate: '2025-11-01T00:00:00.000Z',
        longestSession: {
          sessionId: 'test',
          duration: 1000,
          messageCount: 50,
          timestamp: '2025-11-01T00:00:00.000Z',
        },
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Should not display Model Usage section
    expect(container.textContent).not.toContain('Model Usage');

    // But should still display main stats
    expect(container.textContent).toContain('Total Sessions');
    expect(container.textContent).toContain('10');
  });

  it('should format large numbers with commas', () => {
    const mockStats: StatsResponse = {
      stats: {
        totalSessions: 1000,
        totalMessages: 50000,
        messagesToday: 2500,
        sessionsToday: 50,
        toolCallsToday: 500,
        totalTokens: 10000000,
        modelUsage: {},
        dailyActivity: [],
        firstSessionDate: '2025-11-01T00:00:00.000Z',
        longestSession: {
          sessionId: 'test',
          duration: 1000,
          messageCount: 50,
          timestamp: '2025-11-01T00:00:00.000Z',
        },
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Check for formatted numbers
    expect(container.textContent).toContain('1,000'); // total sessions
    expect(container.textContent).toContain('50,000'); // total messages
    expect(container.textContent).toContain('2,500'); // messages today
    expect(container.textContent).toContain('10,000,000'); // tokens
  });

  it('should display session and tool count for today', () => {
    const mockStats: StatsResponse = {
      stats: {
        totalSessions: 100,
        totalMessages: 5000,
        messagesToday: 250,
        sessionsToday: 15,
        toolCallsToday: 80,
        totalTokens: 1000000,
        modelUsage: {},
        dailyActivity: [],
        firstSessionDate: '2025-11-01T00:00:00.000Z',
        longestSession: {
          sessionId: 'test',
          duration: 1000,
          messageCount: 50,
          timestamp: '2025-11-01T00:00:00.000Z',
        },
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Check for today's session and tool count
    expect(container.textContent).toContain('15 sessions');
    expect(container.textContent).toContain('80 tools');
  });

  it('should display days since first session', () => {
    const mockStats: StatsResponse = {
      stats: {
        totalSessions: 100,
        totalMessages: 5000,
        messagesToday: 250,
        sessionsToday: 10,
        toolCallsToday: 75,
        totalTokens: 1000000,
        modelUsage: {},
        dailyActivity: [],
        firstSessionDate: '2025-11-01T00:00:00.000Z',
        longestSession: {
          sessionId: 'test',
          duration: 1000,
          messageCount: 50,
          timestamp: '2025-11-01T00:00:00.000Z',
        },
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Should display "Since X days/months ago"
    expect(container.textContent).toContain('Since');
  });

  it('should handle missing or empty data gracefully', () => {
    const mockStats: StatsResponse = {
      stats: {
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
      },
    };

    const { container } = renderWithQueryClient(<StatsOverview />, mockStats);

    // Should display zeros for all stats
    expect(container.textContent).toContain('0');
    expect(container.textContent).toContain('Total Sessions');
    expect(container.textContent).toContain('N/A'); // for days since first session
  });
});
