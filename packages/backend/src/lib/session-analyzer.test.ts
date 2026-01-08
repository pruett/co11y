import { describe, it, expect } from 'bun:test';
import { analyzeSession } from './session-analyzer';
import type { TranscriptRecord } from '@co11y/shared';

describe('analyzeSession', () => {
  it('should analyze a session with user and assistant messages', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: '2026-01-07T10:00:00Z',
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
      {
        type: 'assistant' as const,
        parentUuid: 'uuid-1',
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-2',
        timestamp: '2026-01-07T10:00:05Z',
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Hi there!',
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
        },
      },
      {
        type: 'user' as const,
        parentUuid: 'uuid-2',
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-3',
        timestamp: '2026-01-07T10:01:00Z',
        message: {
          role: 'user',
          content: 'Thanks',
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.messageCount).toBe(3);
    expect(result.toolCallCount).toBe(0);
    expect(result.lastActivityTime).toBe('2026-01-07T10:01:00Z');
    expect(result.model).toBe('claude-3-5-sonnet-20241022');
    expect(result.cwd).toBe('/Users/test/project');
    expect(result.gitBranch).toBe('main');
    expect(result.slug).toBeUndefined();
  });

  it('should count tool calls in assistant messages', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: '2026-01-07T10:00:00Z',
        message: {
          role: 'user',
          content: 'Read a file',
        },
      },
      {
        type: 'assistant' as const,
        parentUuid: 'uuid-1',
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-2',
        timestamp: '2026-01-07T10:00:05Z',
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test.txt' },
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'Grep',
              input: { pattern: 'test' },
            },
          ],
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.messageCount).toBe(2);
    expect(result.toolCallCount).toBe(2);
  });

  it('should determine active status when last activity is within 5 minutes', () => {
    const now = new Date();
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: threeMinutesAgo.toISOString(),
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.status).toBe('active');
  });

  it('should determine idle status when last activity is older than 5 minutes', () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: tenMinutesAgo.toISOString(),
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.status).toBe('idle');
  });

  it('should extract slug from first record if present', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: '2026-01-07T10:00:00Z',
        slug: 'my-cool-session',
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.slug).toBe('my-cool-session');
  });

  it('should extract model from first assistant message', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: '2026-01-07T10:00:00Z',
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
      {
        type: 'assistant' as const,
        parentUuid: 'uuid-1',
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-2',
        timestamp: '2026-01-07T10:00:05Z',
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi' }],
          model: 'claude-opus-4-5-20251101',
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.model).toBe('claude-opus-4-5-20251101');
  });

  it('should handle empty transcript', () => {
    const result = analyzeSession([]);

    expect(result.messageCount).toBe(0);
    expect(result.toolCallCount).toBe(0);
    expect(result.lastActivityTime).toBeUndefined();
    expect(result.status).toBe('idle');
    expect(result.model).toBeUndefined();
    expect(result.cwd).toBeUndefined();
  });

  it('should skip queue-operation records when counting messages', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: '2026-01-07T10:00:00Z',
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
      {
        type: 'queue-operation' as const,
        operation: 'enqueue',
        timestamp: '2026-01-07T10:00:01Z',
        sessionId: 'session-1',
      },
      {
        type: 'assistant' as const,
        parentUuid: 'uuid-1',
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-2',
        timestamp: '2026-01-07T10:00:05Z',
        requestId: 'req-1',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi' }],
        },
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.messageCount).toBe(2);
    expect(result.lastActivityTime).toBe('2026-01-07T10:00:05Z');
  });

  it('should use most recent timestamp from any record type for lastActivityTime', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'user',
        cwd: '/Users/test/project',
        sessionId: 'session-1',
        version: '1.0.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: '2026-01-07T10:00:00Z',
        message: {
          role: 'user',
          content: 'Hello',
        },
      },
      {
        type: 'queue-operation' as const,
        operation: 'enqueue',
        timestamp: '2026-01-07T10:00:10Z',
        sessionId: 'session-1',
      },
    ];

    const result = analyzeSession(transcript);

    expect(result.lastActivityTime).toBe('2026-01-07T10:00:10Z');
  });
});
