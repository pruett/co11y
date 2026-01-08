import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import type { TranscriptResponse } from '@co11y/shared';
import { getSubagentTranscript } from './subagent-transcript';

describe('GET /api/subagents/:agentId/transcript', () => {
  let testDir: string;
  let app: Hono;

  beforeEach(() => {
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create test project structure
    const projectDir = join(testDir, '-Users-test-project');
    mkdirSync(projectDir, { recursive: true });

    app = new Hono();
    app.get('/api/subagents/:agentId/transcript', getSubagentTranscript(testDir));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return full subagent transcript', async () => {
    const projectDir = join(testDir, '-Users-test-project');
    const agentFile = join(projectDir, 'agent-abc123.jsonl');

    // Create test subagent transcript
    const records = [
      {
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Task: Test task' },
        parentUuid: null,
        isSidechain: true,
        userType: 'human',
        cwd: '/test',
        sessionId: 'session-123',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: new Date().toISOString(),
        agentId: 'abc123',
      },
      {
        type: 'assistant' as const,
        message: {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Test response' }],
        },
        parentUuid: null,
        isSidechain: true,
        userType: 'human',
        cwd: '/test',
        sessionId: 'session-123',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'uuid-2',
        timestamp: new Date().toISOString(),
        requestId: 'req-1',
        agentId: 'abc123',
      },
    ];

    writeFileSync(agentFile, records.map((r) => JSON.stringify(r)).join('\n'));

    const res = await app.request('/api/subagents/abc123/transcript');
    expect(res.status).toBe(200);

    const data = (await res.json()) as TranscriptResponse;
    expect(data.sessionId).toBe('session-123');
    expect(data.transcript.length).toBe(2);
    expect(data.total).toBe(2);
  });

  it('should support pagination with limit and offset', async () => {
    const projectDir = join(testDir, '-Users-test-project');
    const agentFile = join(projectDir, 'agent-abc123.jsonl');

    // Create 5 test records
    const records = Array.from({ length: 5 }, (_, i) => ({
      type: 'user' as const,
      message: { role: 'user' as const, content: `Message ${i}` },
      parentUuid: null,
      isSidechain: true,
      userType: 'human',
      cwd: '/test',
      sessionId: 'session-123',
      version: '1.0',
      gitBranch: 'main',
      uuid: `uuid-${i}`,
      timestamp: new Date().toISOString(),
      agentId: 'abc123',
    }));

    writeFileSync(agentFile, records.map((r) => JSON.stringify(r)).join('\n'));

    const res = await app.request('/api/subagents/abc123/transcript?limit=2&offset=1');
    expect(res.status).toBe(200);

    const data = (await res.json()) as TranscriptResponse;
    expect(data.transcript.length).toBe(2);
    expect(data.total).toBe(5);
    expect(data.limit).toBe(2);
    expect(data.offset).toBe(1);
  });

  it('should use default pagination values', async () => {
    const projectDir = join(testDir, '-Users-test-project');
    const agentFile = join(projectDir, 'agent-abc123.jsonl');

    const records = [
      {
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Test' },
        parentUuid: null,
        isSidechain: true,
        userType: 'human',
        cwd: '/test',
        sessionId: 'session-123',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: new Date().toISOString(),
        agentId: 'abc123',
      },
    ];

    writeFileSync(agentFile, records.map((r) => JSON.stringify(r)).join('\n'));

    const res = await app.request('/api/subagents/abc123/transcript');
    expect(res.status).toBe(200);

    const data = (await res.json()) as TranscriptResponse;
    expect(data.limit).toBe(50); // default limit
    expect(data.offset).toBe(0); // default offset
  });

  it('should return 404 if subagent not found', async () => {
    const res = await app.request('/api/subagents/nonexistent/transcript');
    expect(res.status).toBe(404);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Subagent not found');
  });

  it('should handle empty transcript', async () => {
    const projectDir = join(testDir, '-Users-test-project');
    const agentFile = join(projectDir, 'agent-abc123.jsonl');

    // Create empty file
    writeFileSync(agentFile, '');

    const res = await app.request('/api/subagents/abc123/transcript');
    expect(res.status).toBe(200);

    const data = (await res.json()) as TranscriptResponse;
    expect(data.transcript.length).toBe(0);
    expect(data.total).toBe(0);
  });

  it('should handle offset beyond total', async () => {
    const projectDir = join(testDir, '-Users-test-project');
    const agentFile = join(projectDir, 'agent-abc123.jsonl');

    const records = [
      {
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Test' },
        parentUuid: null,
        isSidechain: true,
        userType: 'human',
        cwd: '/test',
        sessionId: 'session-123',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'uuid-1',
        timestamp: new Date().toISOString(),
        agentId: 'abc123',
      },
    ];

    writeFileSync(agentFile, records.map((r) => JSON.stringify(r)).join('\n'));

    const res = await app.request('/api/subagents/abc123/transcript?offset=100');
    expect(res.status).toBe(200);

    const data = (await res.json()) as TranscriptResponse;
    expect(data.transcript.length).toBe(0);
    expect(data.total).toBe(1);
  });

  it('should return 404 when directory not found', async () => {
    // Create invalid directory structure - should return 404 not 500
    const invalidDir = join(tmpdir(), 'nonexistent-dir-' + Date.now());
    const appWithError = new Hono();
    appWithError.get(
      '/api/subagents/:agentId/transcript',
      getSubagentTranscript(invalidDir)
    );

    const res = await appWithError.request('/api/subagents/abc123/transcript');
    expect(res.status).toBe(404);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Subagent not found');
  });
});
