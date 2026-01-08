import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { parseJsonlFile } from './jsonl-parser';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { TranscriptRecord } from '@co11y/shared';

const TEST_DIR = join(tmpdir(), 'co11y-test-fixtures');
const TEST_FILE = join(TEST_DIR, 'test.jsonl');

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('parseJsonlFile', () => {
  it('should parse valid JSONL file with user and assistant records', () => {
    const userRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'user',
      cwd: '/Users/test/project',
      sessionId: 'test-session-id',
      version: '1.0.0',
      gitBranch: 'main',
      uuid: 'user-uuid-1',
      timestamp: '2026-01-07T12:00:00.000Z',
      message: {
        role: 'user' as const,
        content: 'Hello',
      },
    };

    const assistantRecord = {
      type: 'assistant' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'user',
      cwd: '/Users/test/project',
      sessionId: 'test-session-id',
      version: '1.0.0',
      gitBranch: 'main',
      uuid: 'assistant-uuid-1',
      timestamp: '2026-01-07T12:00:01.000Z',
      requestId: 'req-123',
      message: {
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: 'Hi there!' }],
      },
    };

    const jsonlContent = `${JSON.stringify(userRecord)}\n${JSON.stringify(assistantRecord)}`;
    writeFileSync(TEST_FILE, jsonlContent);

    const records = parseJsonlFile(TEST_FILE);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual(userRecord);
    expect(records[1]).toEqual(assistantRecord);
  });

  it('should parse queue-operation records', () => {
    const queueRecord = {
      type: 'queue-operation' as const,
      operation: 'enqueue' as const,
      timestamp: '2026-01-07T12:00:00.000Z',
      sessionId: 'test-session-id',
      content: 'Test content',
    };

    const jsonlContent = JSON.stringify(queueRecord);
    writeFileSync(TEST_FILE, jsonlContent);

    const records = parseJsonlFile(TEST_FILE);

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(queueRecord);
  });

  it('should handle empty file', () => {
    writeFileSync(TEST_FILE, '');

    const records = parseJsonlFile(TEST_FILE);

    expect(records).toHaveLength(0);
  });

  it('should handle file with only whitespace', () => {
    writeFileSync(TEST_FILE, '\n\n\n');

    const records = parseJsonlFile(TEST_FILE);

    expect(records).toHaveLength(0);
  });

  it('should skip malformed lines and continue parsing', () => {
    const validRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'user',
      cwd: '/Users/test/project',
      sessionId: 'test-session-id',
      version: '1.0.0',
      gitBranch: 'main',
      uuid: 'user-uuid-1',
      timestamp: '2026-01-07T12:00:00.000Z',
      message: {
        role: 'user' as const,
        content: 'Hello',
      },
    };

    const jsonlContent = `${JSON.stringify(validRecord)}\n{invalid json}\n${JSON.stringify(validRecord)}`;
    writeFileSync(TEST_FILE, jsonlContent);

    const records = parseJsonlFile(TEST_FILE);

    // Should have 2 valid records, skipping the malformed one
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual(validRecord);
    expect(records[1]).toEqual(validRecord);
  });

  it('should handle records with complex nested content', () => {
    const complexRecord = {
      type: 'assistant' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'user',
      cwd: '/Users/test/project',
      sessionId: 'test-session-id',
      version: '1.0.0',
      gitBranch: 'main',
      uuid: 'assistant-uuid-1',
      timestamp: '2026-01-07T12:00:01.000Z',
      requestId: 'req-123',
      message: {
        role: 'assistant' as const,
        content: [
          { type: 'text' as const, text: 'Let me help' },
          {
            type: 'tool_use' as const,
            id: 'tool-1',
            name: 'Read',
            input: { file_path: '/test/file.ts' },
          },
        ],
        model: 'claude-sonnet-4-5',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation: {
            ephemeral_5m_input_tokens: 10,
            ephemeral_1h_input_tokens: 20,
          },
        },
      },
    };

    const jsonlContent = JSON.stringify(complexRecord);
    writeFileSync(TEST_FILE, jsonlContent);

    const records = parseJsonlFile(TEST_FILE);

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(complexRecord);
  });

  it('should handle multiple records in a file', () => {
    const records = Array.from({ length: 100 }, (_, i) => ({
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'user',
      cwd: '/Users/test/project',
      sessionId: 'test-session-id',
      version: '1.0.0',
      gitBranch: 'main',
      uuid: `user-uuid-${i}`,
      timestamp: `2026-01-07T12:00:${String(i).padStart(2, '0')}.000Z`,
      message: {
        role: 'user' as const,
        content: `Message ${i}`,
      },
    }));

    const jsonlContent = records.map((r) => JSON.stringify(r)).join('\n');
    writeFileSync(TEST_FILE, jsonlContent);

    const parsedRecords = parseJsonlFile(TEST_FILE);

    expect(parsedRecords).toHaveLength(100);
    expect((parsedRecords[0] as any).uuid).toBe('user-uuid-0');
    expect((parsedRecords[99] as any).uuid).toBe('user-uuid-99');
  });

  it('should throw error for non-existent file', () => {
    expect(() => {
      parseJsonlFile('/path/to/nonexistent.jsonl');
    }).toThrow();
  });

  it('should handle records with subagent metadata', () => {
    const subagentRecord = {
      type: 'user' as const,
      parentUuid: 'parent-uuid',
      isSidechain: true,
      userType: 'user',
      cwd: '/Users/test/project',
      sessionId: 'test-session-id',
      version: '1.0.0',
      gitBranch: 'main',
      uuid: 'user-uuid-1',
      timestamp: '2026-01-07T12:00:00.000Z',
      agentId: 'a0c831a',
      slug: 'test-slug',
      message: {
        role: 'user' as const,
        content: 'Subagent task',
      },
    };

    const jsonlContent = JSON.stringify(subagentRecord);
    writeFileSync(TEST_FILE, jsonlContent);

    const records = parseJsonlFile(TEST_FILE);

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(subagentRecord);
    expect((records[0] as any).isSidechain).toBe(true);
    expect((records[0] as any).agentId).toBe('a0c831a');
  });
});
