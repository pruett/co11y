import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { getSubagents } from './subagents';
import type { SubagentsResponse, Subagent } from '@co11y/shared';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('GET /api/sessions/:sessionId/subagents', () => {
  let app: Hono;
  let testDir: string;
  let projectDir: string;

  beforeEach(() => {
    app = new Hono();
    testDir = join(tmpdir(), `co11y-subagents-test-${Date.now()}`);
    projectDir = join(testDir, '-Users-test-code');
    mkdirSync(projectDir, { recursive: true });
  });

  it('should return subagents for a session', async () => {
    // Create main session
    const sessionId = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    writeFileSync(
      sessionFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Hello' },
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        sessionId,
        uuid: 'uuid1',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    // Create subagent 1
    const subagent1File = join(projectDir, 'agent-abc123.jsonl');
    writeFileSync(
      subagent1File,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Task: Search for files' },
        timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        sessionId,
        uuid: 'uuid2',
        parentUuid: null,
        isSidechain: true,
        agentId: 'abc123',
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) +
        '\n' +
        JSON.stringify({
          type: 'assistant' as const,
          message: {
            role: 'assistant' as const,
            content: [
              { type: 'tool_use' as const, id: 't1', name: 'Grep', input: {} },
            ],
          },
          timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
          sessionId,
          uuid: 'uuid3',
          parentUuid: null,
          isSidechain: true,
          agentId: 'abc123',
          userType: 'human',
          cwd: '/Users/test/code',
          version: '1.0.0',
          gitBranch: 'main',
          requestId: 'req1',
        }) +
        '\n'
    );

    // Create subagent 2 (completed)
    const subagent2File = join(projectDir, 'agent-def456.jsonl');
    writeFileSync(
      subagent2File,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Task: Run tests' },
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        sessionId,
        uuid: 'uuid4',
        parentUuid: null,
        isSidechain: true,
        agentId: 'def456',
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) +
        '\n' +
        JSON.stringify({
          type: 'assistant' as const,
          message: {
            role: 'assistant' as const,
            content: [{ type: 'text' as const, text: 'Tests passed' }],
          },
          timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          sessionId,
          uuid: 'uuid5',
          parentUuid: null,
          isSidechain: true,
          agentId: 'def456',
          userType: 'human',
          cwd: '/Users/test/code',
          version: '1.0.0',
          gitBranch: 'main',
          requestId: 'req2',
        }) +
        '\n'
    );

    // Register route with test directory
    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(`/api/sessions/${sessionId}/subagents`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as SubagentsResponse;
    expect(data.sessionId).toBe(sessionId);
    expect(data.subagents).toHaveLength(2);

    // Check first subagent (active)
    const sub1 = data.subagents.find((s) => s.agentId === 'abc123');
    expect(sub1).toBeDefined();
    expect(sub1!.task).toBe('Search for files');
    expect(sub1!.status).toBe('running');
    expect(sub1!.messageCount).toBe(2);
    expect(sub1!.toolCallCount).toBe(1);
    expect(sub1!.currentTool).toBe('Grep');
    expect(sub1!.endTime).toBeUndefined();

    // Check second subagent (completed)
    const sub2 = data.subagents.find((s) => s.agentId === 'def456');
    expect(sub2).toBeDefined();
    expect(sub2!.task).toBe('Run tests');
    expect(sub2!.status).toBe('completed');
    expect(sub2!.messageCount).toBe(2);
    expect(sub2!.toolCallCount).toBe(0);
    expect(sub2!.endTime).toBeDefined();
    expect(sub2!.duration).toBeGreaterThan(0);
  });

  it('should return 404 if session not found', async () => {
    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(
      '/api/sessions/99999999-9999-9999-9999-999999999999/subagents'
    );
    expect(res.status).toBe(404);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Session not found');
  });

  it('should return empty array if session has no subagents', async () => {
    // Create main session with no subagents
    const sessionId = '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    writeFileSync(
      sessionFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Hello' },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid1',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(`/api/sessions/${sessionId}/subagents`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as SubagentsResponse;
    expect(data.sessionId).toBe(sessionId);
    expect(data.subagents).toHaveLength(0);
  });

  it('should extract task from first user message in subagent', async () => {
    const sessionId = '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    writeFileSync(
      sessionFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Hello' },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid1',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    // Subagent with complex task description
    const subagentFile = join(projectDir, 'agent-xyz789.jsonl');
    writeFileSync(
      subagentFile,
      JSON.stringify({
        type: 'user' as const,
        message: {
          role: 'user' as const,
          content: 'Task: Implement authentication with JWT tokens',
        },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid2',
        parentUuid: null,
        isSidechain: true,
        agentId: 'xyz789',
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(`/api/sessions/${sessionId}/subagents`);
    const data = (await res.json()) as SubagentsResponse;

    expect(data.subagents[0].task).toBe('Implement authentication with JWT tokens');
  });

  it('should handle subagent with error status', async () => {
    const sessionId = '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    writeFileSync(
      sessionFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Hello' },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid1',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    // Subagent with error (has tool_result with is_error)
    const subagentFile = join(projectDir, 'agent-err001.jsonl');
    writeFileSync(
      subagentFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Task: Failed task' },
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        sessionId,
        uuid: 'uuid2',
        parentUuid: null,
        isSidechain: true,
        agentId: 'err001',
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) +
        '\n' +
        JSON.stringify({
          type: 'assistant' as const,
          message: {
            role: 'assistant' as const,
            content: [
              { type: 'tool_use' as const, id: 't1', name: 'Bash', input: {} },
            ],
          },
          timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
          sessionId,
          uuid: 'uuid3',
          parentUuid: null,
          isSidechain: true,
          agentId: 'err001',
          userType: 'human',
          cwd: '/Users/test/code',
          version: '1.0.0',
          gitBranch: 'main',
          requestId: 'req1',
        }) +
        '\n' +
        JSON.stringify({
          type: 'user' as const,
          message: {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: 't1',
                content: 'Error: Command failed',
                is_error: true,
              },
            ],
          },
          timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          sessionId,
          uuid: 'uuid4',
          parentUuid: null,
          isSidechain: true,
          agentId: 'err001',
          userType: 'human',
          cwd: '/Users/test/code',
          version: '1.0.0',
          gitBranch: 'main',
        }) +
        '\n'
    );

    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(`/api/sessions/${sessionId}/subagents`);
    const data = (await res.json()) as SubagentsResponse;

    expect(data.subagents[0].status).toBe('error');
  });

  it('should return 404 when session directory does not exist', async () => {
    // Point to a directory that doesn't exist
    app.get('/api/sessions/:sessionId/subagents', getSubagents('/invalid/path'));

    const res = await app.request(
      '/api/sessions/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d/subagents'
    );
    expect(res.status).toBe(404);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Session not found');
  });

  it('should handle subagent with array content in first message', async () => {
    const sessionId = '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    writeFileSync(
      sessionFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Hello' },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid1',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    // Subagent with array content
    const subagentFile = join(projectDir, 'agent-arr123.jsonl');
    writeFileSync(
      subagentFile,
      JSON.stringify({
        type: 'user' as const,
        message: {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'Task: Complex task with array content' },
          ],
        },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid2',
        parentUuid: null,
        isSidechain: true,
        agentId: 'arr123',
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(`/api/sessions/${sessionId}/subagents`);
    const data = (await res.json()) as SubagentsResponse;

    expect(data.subagents[0].task).toBe('Complex task with array content');
  });

  it('should calculate duration for completed subagents', async () => {
    const sessionId = '6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    writeFileSync(
      sessionFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Hello' },
        timestamp: new Date().toISOString(),
        sessionId,
        uuid: 'uuid1',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) + '\n'
    );

    // Subagent with clear start and end times (older than 5 minutes)
    const startTime = new Date(Date.now() - 7 * 60 * 1000); // 7 minutes ago
    const endTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
    const subagentFile = join(projectDir, 'agent-dur123.jsonl');
    writeFileSync(
      subagentFile,
      JSON.stringify({
        type: 'user' as const,
        message: { role: 'user' as const, content: 'Task: Timed task' },
        timestamp: startTime.toISOString(),
        sessionId,
        uuid: 'uuid2',
        parentUuid: null,
        isSidechain: true,
        agentId: 'dur123',
        userType: 'human',
        cwd: '/Users/test/code',
        version: '1.0.0',
        gitBranch: 'main',
      }) +
        '\n' +
        JSON.stringify({
          type: 'assistant' as const,
          message: {
            role: 'assistant' as const,
            content: [{ type: 'text' as const, text: 'Done' }],
          },
          timestamp: endTime.toISOString(),
          sessionId,
          uuid: 'uuid3',
          parentUuid: null,
          isSidechain: true,
          agentId: 'dur123',
          userType: 'human',
          cwd: '/Users/test/code',
          version: '1.0.0',
          gitBranch: 'main',
          requestId: 'req1',
        }) +
        '\n'
    );

    app.get('/api/sessions/:sessionId/subagents', getSubagents(testDir));

    const res = await app.request(`/api/sessions/${sessionId}/subagents`);
    const data = (await res.json()) as SubagentsResponse;

    const subagent = data.subagents[0];
    expect(subagent.duration).toBe(60000); // 1 minute in milliseconds
    expect(subagent.startTime).toBe(startTime.toISOString());
    expect(subagent.endTime).toBe(endTime.toISOString());
  });
});
