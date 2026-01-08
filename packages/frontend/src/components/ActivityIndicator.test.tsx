import { describe, it, expect, afterEach } from 'bun:test';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator } from './ActivityIndicator';
import type { UseEventSourceReturn } from '../hooks/useEventSource';
import type { SSEEvent } from '@co11y/shared';

// Helper to wrap components with QueryClientProvider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  return {
    ...result,
    rerender: (newUi: React.ReactElement) => {
      result.rerender(<QueryClientProvider client={queryClient}>{newUi}</QueryClientProvider>);
    },
  };
}

afterEach(() => {
  cleanup();
});

describe('ActivityIndicator', () => {
  it('should display "Live" with green badge when connected', () => {
    const testStatus: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: null,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    expect(container.textContent).toContain('Live');
    const badge = container.querySelector('[data-status="connected"]');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('bg-green-500');
  });

  it('should display "Connecting" with yellow badge when connecting', () => {
    const testStatus: UseEventSourceReturn = {
      status: 'connecting',
      error: null,
      lastEvent: null,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    expect(container.textContent).toContain('Connecting');
    const badge = container.querySelector('[data-status="connecting"]');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('bg-yellow-500');
  });

  it('should display "Disconnected" with gray badge when disconnected', () => {
    const testStatus: UseEventSourceReturn = {
      status: 'disconnected',
      error: null,
      lastEvent: null,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    expect(container.textContent).toContain('Disconnected');
    const badge = container.querySelector('[data-status="disconnected"]');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('bg-gray-500');
  });

  it('should display "Error" with red badge when status is error', () => {
    const testStatus: UseEventSourceReturn = {
      status: 'error',
      error: 'Connection failed',
      lastEvent: null,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    expect(container.textContent).toContain('Error');
    const badge = container.querySelector('[data-status="error"]');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('bg-red-500');
  });

  it('should show status indicator dot for connected state', () => {
    const testStatus: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: null,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    const dot = container.querySelector('span.rounded-full.h-2.w-2');
    expect(dot).toBeTruthy();
    expect(dot?.className).toContain('bg-white');
  });

  it('should not show status indicator dot for disconnected state', () => {
    const testStatus: UseEventSourceReturn = {
      status: 'disconnected',
      error: null,
      lastEvent: null,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    const dot = container.querySelector('span.rounded-full.h-2.w-2');
    expect(dot).toBeFalsy();
  });

  it('should pulse when receiving a hook event', () => {
    const hookEvent: SSEEvent = {
      type: 'hook',
      data: {
        type: 'SessionStart',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        cwd: '/test',
      },
    };

    const testStatus: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: hookEvent,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    const badge = container.querySelector('[data-pulsing="true"]');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('animate-pulse');
  });

  it('should not pulse when receiving non-hook events', () => {
    const sessionsEvent: SSEEvent = {
      type: 'sessions',
      data: { sessions: [] },
    };

    const testStatus: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: sessionsEvent,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    const badge = container.querySelector('[data-pulsing="true"]');
    expect(badge).toBeFalsy();
  });

  it('should stop pulsing after 2 seconds', async () => {
    const hookEvent: SSEEvent = {
      type: 'hook',
      data: {
        type: 'SessionStart',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        cwd: '/test',
      },
    };

    const testStatus: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: hookEvent,
    };

    const { container } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus} />);

    // Initially pulsing
    let badge = container.querySelector('[data-pulsing="true"]');
    expect(badge).toBeTruthy();

    // Wait for pulse to stop (2 seconds)
    await waitFor(
      () => {
        badge = container.querySelector('[data-pulsing="false"]');
        expect(badge).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('should handle rapid successive hook events', () => {
    const hookEvent1: SSEEvent = {
      type: 'hook',
      data: {
        type: 'PreToolUse',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        cwd: '/test',
        toolName: 'Read',
        toolInput: {},
        messageUuid: 'uuid1',
      },
    };

    const testStatus1: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: hookEvent1,
    };

    const { container, rerender } = renderWithQueryClient(<ActivityIndicator testStatus={testStatus1} />);

    // First event should trigger pulse
    let badge = container.querySelector('[data-pulsing="true"]');
    expect(badge).toBeTruthy();

    // Update with second hook event
    const hookEvent2: SSEEvent = {
      type: 'hook',
      data: {
        type: 'PostToolUse',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        cwd: '/test',
        toolName: 'Read',
        toolOutput: 'test output',
        success: true,
        duration: 100,
        messageUuid: 'uuid1',
      },
    };

    const testStatus2: UseEventSourceReturn = {
      status: 'connected',
      error: null,
      lastEvent: hookEvent2,
    };

    rerender(<ActivityIndicator testStatus={testStatus2} />);

    // Should still be pulsing
    badge = container.querySelector('[data-pulsing="true"]');
    expect(badge).toBeTruthy();
  });
});
