import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { SubagentBadge } from './SubagentBadge';
import type { Subagent } from '@co11y/shared';

afterEach(() => {
  cleanup();
});

describe('SubagentBadge', () => {
  it('renders agentId', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'running',
      task: 'Test task',
      startTime: new Date().toISOString(),
      messageCount: 5,
      toolCallCount: 3,
      currentTool: 'Read',
    };

    render(<SubagentBadge subagent={subagent} />);
    expect(screen.getByText(/a0c831a/)).toBeDefined();
  });

  it('displays current tool for running subagents', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'running',
      task: 'Test task',
      startTime: new Date().toISOString(),
      messageCount: 5,
      toolCallCount: 3,
      currentTool: 'Read',
    };

    render(<SubagentBadge subagent={subagent} />);
    expect(screen.getByText(/Read/)).toBeDefined();
  });

  it('does not display current tool for completed subagents', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'completed',
      task: 'Test task',
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date(Date.now() - 300000).toISOString(),
      duration: 300000,
      messageCount: 5,
      toolCallCount: 3,
    };

    render(<SubagentBadge subagent={subagent} />);
    expect(() => screen.getByText(/Read/)).toThrow();
  });

  it('applies blue color for running status', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'running',
      task: 'Test task',
      startTime: new Date().toISOString(),
      messageCount: 5,
      toolCallCount: 3,
      currentTool: 'Read',
    };

    const { container } = render(<SubagentBadge subagent={subagent} />);
    const badge = container.querySelector('.bg-blue-500');
    expect(badge).toBeDefined();
  });

  it('applies green color for completed status', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'completed',
      task: 'Test task',
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date(Date.now() - 300000).toISOString(),
      duration: 300000,
      messageCount: 5,
      toolCallCount: 3,
    };

    const { container } = render(<SubagentBadge subagent={subagent} />);
    const badge = container.querySelector('.bg-green-500');
    expect(badge).toBeDefined();
  });

  it('applies red color for error status', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'error',
      task: 'Test task',
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date(Date.now() - 300000).toISOString(),
      duration: 300000,
      messageCount: 5,
      toolCallCount: 3,
    };

    const { container } = render(<SubagentBadge subagent={subagent} />);
    const badge = container.querySelector('.bg-red-500');
    expect(badge).toBeDefined();
  });

  it('shows animated pulse for running subagents', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'running',
      task: 'Test task',
      startTime: new Date().toISOString(),
      messageCount: 5,
      toolCallCount: 3,
      currentTool: 'Read',
    };

    const { container } = render(<SubagentBadge subagent={subagent} />);
    const badge = container.querySelector('.animate-pulse');
    expect(badge).toBeDefined();
  });

  it('does not show animated pulse for completed subagents', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'completed',
      task: 'Test task',
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date(Date.now() - 300000).toISOString(),
      duration: 300000,
      messageCount: 5,
      toolCallCount: 3,
    };

    const { container } = render(<SubagentBadge subagent={subagent} />);
    const badge = container.querySelector('.animate-pulse');
    expect(badge).toBeNull();
  });

  it('does not show animated pulse for error subagents', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'error',
      task: 'Test task',
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date(Date.now() - 300000).toISOString(),
      duration: 300000,
      messageCount: 5,
      toolCallCount: 3,
    };

    const { container } = render(<SubagentBadge subagent={subagent} />);
    const badge = container.querySelector('.animate-pulse');
    expect(badge).toBeNull();
  });

  it('renders compact variant without current tool', () => {
    const subagent: Subagent = {
      agentId: 'a0c831a',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      status: 'running',
      task: 'Test task',
      startTime: new Date().toISOString(),
      messageCount: 5,
      toolCallCount: 3,
      currentTool: 'Read',
    };

    render(<SubagentBadge subagent={subagent} compact />);
    expect(screen.getByText(/a0c831a/)).toBeDefined();
    expect(() => screen.getByText(/Read/)).toThrow();
  });
});
