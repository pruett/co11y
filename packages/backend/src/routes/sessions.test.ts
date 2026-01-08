import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { TranscriptRecord, SessionsResponse } from '@co11y/shared';
import { Hono } from 'hono';
import { getSessions } from './sessions';

describe('Sessions API', () => {
  let testDir: string;
  let app: Hono;

  beforeEach(() => {
    // Create a unique test directory
    testDir = join(tmpdir(), `sessions-api-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create test Hono app
    app = new Hono();
    app.get('/api/sessions', getSessions(testDir));
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return empty sessions list when no projects exist', async () => {
    const res = await app.request('/api/sessions');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data).toEqual({
      sessions: [],
      total: 0,
      activeCount: 0,
    });
  });

  it('should return sessions from all projects', async () => {
    // Create test project directories
    const project1 = join(testDir, '-Users-test-project1');
    const project2 = join(testDir, '-Users-test-project2');
    mkdirSync(project1, { recursive: true });
    mkdirSync(project2, { recursive: true });

    // Create session files
    const session1Id = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
    const session2Id = '2d6cf3c6-8998-59d1-9f3b-1f66142a963c';

    const now = new Date().toISOString();
    const record1: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project1',
      sessionId: session1Id,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid1',
      timestamp: now,
      slug: 'project1',
      message: { role: 'user', content: 'Hello' },
    };

    const record2: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project2',
      sessionId: session2Id,
      version: '1.0',
      gitBranch: 'develop',
      uuid: 'uuid2',
      timestamp: now,
      slug: 'project2',
      message: { role: 'user', content: 'Hi' },
    };

    writeFileSync(join(project1, `${session1Id}.jsonl`), JSON.stringify(record1));
    writeFileSync(join(project2, `${session2Id}.jsonl`), JSON.stringify(record2));

    const res = await app.request('/api/sessions');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data.sessions).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.sessions[0].id).toBe(session1Id);
    expect(data.sessions[0].project).toBe('/Users/test/project1');
    expect(data.sessions[0].projectPath).toBe('/Users/test/project1');
    expect(data.sessions[1].id).toBe(session2Id);
    expect(data.sessions[1].project).toBe('/Users/test/project2');
  });

  it('should filter active sessions when ?active=true', async () => {
    const project = join(testDir, '-Users-test-project');
    mkdirSync(project, { recursive: true });

    const activeSessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
    const idleSessionId = '2d6cf3c6-8998-59d1-9f3b-1f66142a963c';

    // Active session (< 5 minutes ago)
    const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const activeRecord: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: activeSessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid1',
      timestamp: recentTime,
      message: { role: 'user', content: 'Hello' },
    };

    // Idle session (> 5 minutes ago)
    const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const idleRecord: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: idleSessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid2',
      timestamp: oldTime,
      message: { role: 'user', content: 'Hi' },
    };

    writeFileSync(join(project, `${activeSessionId}.jsonl`), JSON.stringify(activeRecord));
    writeFileSync(join(project, `${idleSessionId}.jsonl`), JSON.stringify(idleRecord));

    const res = await app.request('/api/sessions?active=true');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].id).toBe(activeSessionId);
    expect(data.sessions[0].status).toBe('active');
    expect(data.total).toBe(2);
    expect(data.activeCount).toBe(1);
  });

  it('should include subagent count in session data', async () => {
    const project = join(testDir, '-Users-test-project');
    mkdirSync(project, { recursive: true });

    const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
    const now = new Date().toISOString();

    // Create main session
    const sessionRecord: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid1',
      timestamp: now,
      message: { role: 'user', content: 'Hello' },
    };

    // Create subagent files
    const subagent1Record: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: true,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid2',
      timestamp: now,
      agentId: 'a0c831a',
      message: { role: 'user', content: 'Task 1' },
    };

    const subagent2Record: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: true,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid3',
      timestamp: now,
      agentId: 'b1d942b',
      message: { role: 'user', content: 'Task 2' },
    };

    writeFileSync(join(project, `${sessionId}.jsonl`), JSON.stringify(sessionRecord));
    writeFileSync(join(project, 'agent-a0c831a.jsonl'), JSON.stringify(subagent1Record));
    writeFileSync(join(project, 'agent-b1d942b.jsonl'), JSON.stringify(subagent2Record));

    const res = await app.request('/api/sessions');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].subagentCount).toBe(2);
  });

  it('should include message and tool call counts', async () => {
    const project = join(testDir, '-Users-test-project');
    mkdirSync(project, { recursive: true });

    const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
    const now = new Date().toISOString();

    const userRecord: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid1',
      timestamp: now,
      message: { role: 'user', content: 'Hello' },
    };

    const assistantRecord: TranscriptRecord = {
      type: 'assistant' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid2',
      timestamp: now,
      requestId: 'req1',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Response' },
          { type: 'tool_use', id: 'tool1', name: 'Read', input: {} },
        ],
      },
    };

    writeFileSync(
      join(project, `${sessionId}.jsonl`),
      JSON.stringify(userRecord) + '\n' + JSON.stringify(assistantRecord)
    );

    const res = await app.request('/api/sessions');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].messageCount).toBe(2);
    expect(data.sessions[0].toolCallCount).toBe(1);
  });

  it('should handle errors gracefully', async () => {
    // Use a non-existent directory
    const nonExistentDir = join(tmpdir(), 'non-existent-dir-sessions-test');
    const errorApp = new Hono();
    errorApp.get('/api/sessions', getSessions(nonExistentDir));

    const res = await errorApp.request('/api/sessions');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.activeCount).toBe(0);
  });

  it('should sort sessions by last activity (most recent first)', async () => {
    const project = join(testDir, '-Users-test-project');
    mkdirSync(project, { recursive: true });

    const session1Id = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
    const session2Id = '2d6cf3c6-8998-59d1-9f3b-1f66142a963c';

    const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const oldRecord: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: session1Id,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid1',
      timestamp: oldTime,
      message: { role: 'user', content: 'Hello' },
    };

    const recentRecord: TranscriptRecord = {
      type: 'user' as const,
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/Users/test/project',
      sessionId: session2Id,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'uuid2',
      timestamp: recentTime,
      message: { role: 'user', content: 'Hi' },
    };

    writeFileSync(join(project, `${session1Id}.jsonl`), JSON.stringify(oldRecord));
    writeFileSync(join(project, `${session2Id}.jsonl`), JSON.stringify(recentRecord));

    const res = await app.request('/api/sessions');
    const data = (await res.json()) as SessionsResponse;

    expect(res.status).toBe(200);
    expect(data.sessions).toHaveLength(2);
    // Most recent should be first
    expect(data.sessions[0].id).toBe(session2Id);
    expect(data.sessions[1].id).toBe(session1Id);
  });
});
