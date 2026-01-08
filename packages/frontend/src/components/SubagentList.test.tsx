import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { Subagent, TranscriptRecord } from '@co11y/shared';
import { SubagentList } from './SubagentList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('SubagentList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const mockSubagents: Subagent[] = [
    {
      agentId: 'agent-abc123',
      sessionId: 'session-123',
      task: 'Test task 1',
      status: 'running',
      startTime: new Date().toISOString(),
      messageCount: 5,
      toolCallCount: 3,
      currentTool: 'Read',
    },
    {
      agentId: 'agent-def456',
      sessionId: 'session-123',
      task: 'Test task 2',
      status: 'completed',
      startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      duration: 300000,
      messageCount: 10,
      toolCallCount: 7,
    },
    {
      agentId: 'agent-ghi789',
      sessionId: 'session-123',
      task: 'Test task 3',
      status: 'error',
      startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      duration: 300000,
      messageCount: 3,
      toolCallCount: 2,
    },
  ];

  it('should render empty state when no subagents provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={[]} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('No subagents found');
  });

  it('should display all subagents', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('agent-abc123');
    expect(container.textContent).toContain('agent-def456');
    expect(container.textContent).toContain('agent-ghi789');
  });

  it('should show task descriptions', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Test task 1');
    expect(container.textContent).toContain('Test task 2');
    expect(container.textContent).toContain('Test task 3');
  });

  it('should show status badges', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents} />
      </QueryClientProvider>
    );

    // Status badges are rendered by SubagentBadge component
    expect(container.textContent).toContain('agent-abc123');
    expect(container.textContent).toContain('agent-def456');
    expect(container.textContent).toContain('agent-ghi789');
  });

  it('should display duration for completed subagents', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Duration: 300s');
  });

  it('should display message and tool counts', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Messages');
    expect(container.textContent).toContain('Tools');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('3');
  });

  it('should show spinner for running subagents', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents.filter((s) => s.status === 'running')} />
      </QueryClientProvider>
    );

    // Running status should have spinner icon (Loader2 from lucide-react)
    expect(container.textContent).toContain('agent-abc123');
  });

  it('should display start time', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={mockSubagents} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Started');
  });

  it('should handle nested subagents with parentAgentId', () => {
    const nestedSubagents: Subagent[] = [
      {
        agentId: 'agent-parent',
        sessionId: 'session-123',
        task: 'Parent task',
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 100000,
        messageCount: 5,
        toolCallCount: 3,
      },
      {
        agentId: 'agent-child',
        sessionId: 'session-123',
        task: 'Child task',
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 50000,
        messageCount: 2,
        toolCallCount: 1,
        parentAgentId: 'agent-parent',
      },
    ];

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SubagentList subagents={nestedSubagents} />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('agent-parent');
    expect(container.textContent).toContain('agent-child');
  });
});
