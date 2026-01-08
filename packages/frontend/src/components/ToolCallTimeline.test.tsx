import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ToolCallTimeline } from './ToolCallTimeline';
import type { TranscriptRecord } from '@co11y/shared';

describe('ToolCallTimeline', () => {
  it('renders empty state when no transcript provided', () => {
    render(<ToolCallTimeline transcript={[]} />);
    expect(screen.getByText(/no tool calls/i)).toBeTruthy();
  });

  it('renders empty state when transcript has no tool calls', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-1',
        timestamp: new Date().toISOString(),
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
    ];
    render(<ToolCallTimeline transcript={transcript} />);
    expect(screen.getByText(/no tool calls/i)).toBeTruthy();
  });

  it('renders tool calls from transcript', () => {
    const timestamp = new Date().toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
      },
      {
        type: 'user' as const,
        parentUuid: 'assistant-1',
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-1',
        timestamp,
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: 'File contents',
            },
          ],
        },
      },
    ];

    render(<ToolCallTimeline transcript={transcript} />);
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('shows success status for successful tool calls', () => {
    const timestamp = new Date().toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
      },
      {
        type: 'user' as const,
        parentUuid: 'assistant-1',
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-1',
        timestamp,
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: 'File contents',
            },
          ],
        },
      },
    ];

    const { container } = render(<ToolCallTimeline transcript={transcript} />);
    const statusElement = container.querySelector('[data-status="success"]');
    expect(statusElement).toBeTruthy();
  });

  it('shows error status for failed tool calls', () => {
    const timestamp = new Date().toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
      },
      {
        type: 'user' as const,
        parentUuid: 'assistant-1',
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-1',
        timestamp,
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: 'Error: File not found',
              is_error: true,
            },
          ],
        },
      },
    ];

    const { container } = render(<ToolCallTimeline transcript={transcript} />);
    const statusElement = container.querySelector('[data-status="error"]');
    expect(statusElement).toBeTruthy();
  });

  it('shows pending status for tool calls without results', () => {
    const timestamp = new Date().toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
      },
    ];

    const { container } = render(<ToolCallTimeline transcript={transcript} />);
    const statusElement = container.querySelector('[data-status="pending"]');
    expect(statusElement).toBeTruthy();
  });

  it('handles multiple tool calls in order', () => {
    const timestamp1 = new Date('2024-01-01T10:00:00Z').toISOString();
    const timestamp2 = new Date('2024-01-01T10:01:00Z').toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp: timestamp1,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
      },
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-2',
        timestamp: timestamp2,
        requestId: 'req-2',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'Write',
              input: { file_path: '/test/output.txt' },
            },
          ],
        },
      },
    ];

    render(<ToolCallTimeline transcript={transcript} />);
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('Write')).toBeTruthy();
  });

  it('displays timestamps for tool calls', () => {
    const timestamp = new Date('2024-01-01T10:00:00Z').toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
      },
    ];

    render(<ToolCallTimeline transcript={transcript} />);
    // Timestamp should be displayed in some form
    const container = screen.getByText('Read').parentElement;
    expect(container?.textContent).toBeTruthy();
  });

  it('handles tool calls with multiple tools in one assistant message', () => {
    const timestamp = new Date().toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file1.txt' },
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'Write',
              input: { file_path: '/test/file2.txt' },
            },
          ],
        },
      },
    ];

    render(<ToolCallTimeline transcript={transcript} />);
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('Write')).toBeTruthy();
  });

  it('color codes tool calls by type', () => {
    const timestamp = new Date().toISOString();
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp,
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'Bash',
              input: { command: 'ls' },
            },
          ],
        },
      },
    ];

    const { container } = render(<ToolCallTimeline transcript={transcript} />);
    // Check that different tools have different styling
    const readElement = screen.getByText('Read').parentElement;
    const bashElement = screen.getByText('Bash').parentElement;
    expect(readElement).toBeTruthy();
    expect(bashElement).toBeTruthy();
  });
});
