import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { getSessionDetail, getSessionTranscript } from './session-detail';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { SessionDetail, TranscriptResponse } from '@co11y/shared';

describe('session-detail routes', () => {
  let testDir: string;
  let app: Hono;

  beforeEach(() => {
    // Create unique test directory
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create a new Hono app for each test
    app = new Hono();
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session detail with transcript', async () => {
      // Setup test project
      const projectDir = join(testDir, '-Users-test-project');
      mkdirSync(projectDir, { recursive: true });

      const sessionId = 'a1b2c3d4-e5f6-4789-0abc-def123456789';
      const sessionFile = join(projectDir, `${sessionId}.jsonl`);

      const now = new Date();
      const transcript = [
        {
          type: 'user' as const,
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: '/Users/test',
          sessionId,
          version: '1.0',
          gitBranch: 'main',
          uuid: 'uuid1',
          timestamp: now.toISOString(),
          slug: 'test-project',
          message: {
            role: 'user' as const,
            content: 'Hello',
          },
        },
        {
          type: 'assistant' as const,
          parentUuid: 'uuid1',
          isSidechain: false,
          userType: 'human',
          cwd: '/Users/test',
          sessionId,
          version: '1.0',
          gitBranch: 'main',
          uuid: 'uuid2',
          timestamp: now.toISOString(),
          requestId: 'req1',
          message: {
            role: 'assistant' as const,
            content: [
              {
                type: 'text' as const,
                text: 'Hi there',
              },
            ],
            model: 'claude-sonnet-4',
          },
        },
      ];

      writeFileSync(
        sessionFile,
        transcript.map((r) => JSON.stringify(r)).join('\n')
      );

      // Register route
      app.get('/api/sessions/:id', getSessionDetail(testDir));

      // Make request
      const res = await app.request(`/api/sessions/${sessionId}`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as SessionDetail;
      expect(data.id).toBe(sessionId);
      expect(data.project).toBe('/Users/test/project');
      expect(data.messageCount).toBe(2);
      expect(data.toolCallCount).toBe(0);
      expect(data.subagentCount).toBe(0);
      expect(data.transcript).toHaveLength(2);
      expect(data.transcript[0]!.type).toBe('user');
      expect(data.transcript[1]!.type).toBe('assistant');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should return 404 for non-existent session', async () => {
      // Register route
      app.get('/api/sessions/:id', getSessionDetail(testDir));

      // Make request
      const res = await app.request(
        '/api/sessions/00000000-0000-0000-0000-000000000000'
      );
      expect(res.status).toBe(404);

      const data = await res.json() as { error: string };
      expect(data.error).toBe('Session not found');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should include subagent count in response', async () => {
      // Setup test project
      const projectDir = join(testDir, '-Users-test-project');
      mkdirSync(projectDir, { recursive: true });

      const sessionId = 'a1b2c3d4-e5f6-4789-0abc-def123456789';
      const sessionFile = join(projectDir, `${sessionId}.jsonl`);

      const now = new Date();
      const transcript = [
        {
          type: 'user' as const,
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: '/Users/test',
          sessionId,
          version: '1.0',
          gitBranch: 'main',
          uuid: 'uuid1',
          timestamp: now.toISOString(),
          message: {
            role: 'user' as const,
            content: 'Hello',
          },
        },
      ];

      writeFileSync(
        sessionFile,
        transcript.map((r) => JSON.stringify(r)).join('\n')
      );

      // Create subagent file
      const subagentFile = join(projectDir, 'agent-abc123.jsonl');
      const subagentTranscript = [
        {
          type: 'user' as const,
          parentUuid: null,
          isSidechain: true,
          userType: 'human',
          cwd: '/Users/test',
          sessionId,
          version: '1.0',
          gitBranch: 'main',
          uuid: 'sub-uuid1',
          timestamp: now.toISOString(),
          agentId: 'abc123',
          message: {
            role: 'user' as const,
            content: 'Subagent task',
          },
        },
      ];

      writeFileSync(
        subagentFile,
        subagentTranscript.map((r) => JSON.stringify(r)).join('\n')
      );

      // Register route
      app.get('/api/sessions/:id', getSessionDetail(testDir));

      // Make request
      const res = await app.request(`/api/sessions/${sessionId}`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as SessionDetail;
      expect(data.subagentCount).toBe(1);

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('GET /api/sessions/:id/transcript', () => {
    it('should return paginated transcript with default params', async () => {
      // Setup test project
      const projectDir = join(testDir, '-Users-test-project');
      mkdirSync(projectDir, { recursive: true });

      const sessionId = 'a1b2c3d4-e5f6-4789-0abc-def123456789';
      const sessionFile = join(projectDir, `${sessionId}.jsonl`);

      const now = new Date();
      const transcript = Array.from({ length: 100 }, (_, i) => ({
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test',
        sessionId,
        version: '1.0',
        gitBranch: 'main',
        uuid: `uuid${i}`,
        timestamp: now.toISOString(),
        message: {
          role: 'user' as const,
          content: `Message ${i}`,
        },
      }));

      writeFileSync(
        sessionFile,
        transcript.map((r) => JSON.stringify(r)).join('\n')
      );

      // Register route
      app.get('/api/sessions/:id/transcript', getSessionTranscript(testDir));

      // Make request (default limit=50, offset=0)
      const res = await app.request(`/api/sessions/${sessionId}/transcript`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as TranscriptResponse;
      expect(data.sessionId).toBe(sessionId);
      expect(data.total).toBe(100);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
      expect(data.transcript).toHaveLength(50);
      expect((data.transcript[0]! as any).uuid).toBe('uuid0');
      expect((data.transcript[49]! as any).uuid).toBe('uuid49');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should respect custom limit and offset params', async () => {
      // Setup test project
      const projectDir = join(testDir, '-Users-test-project');
      mkdirSync(projectDir, { recursive: true });

      const sessionId = 'a1b2c3d4-e5f6-4789-0abc-def123456789';
      const sessionFile = join(projectDir, `${sessionId}.jsonl`);

      const now = new Date();
      const transcript = Array.from({ length: 100 }, (_, i) => ({
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test',
        sessionId,
        version: '1.0',
        gitBranch: 'main',
        uuid: `uuid${i}`,
        timestamp: now.toISOString(),
        message: {
          role: 'user' as const,
          content: `Message ${i}`,
        },
      }));

      writeFileSync(
        sessionFile,
        transcript.map((r) => JSON.stringify(r)).join('\n')
      );

      // Register route
      app.get('/api/sessions/:id/transcript', getSessionTranscript(testDir));

      // Make request with custom params
      const res = await app.request(
        `/api/sessions/${sessionId}/transcript?limit=10&offset=20`
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as TranscriptResponse;
      expect(data.total).toBe(100);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
      expect(data.transcript).toHaveLength(10);
      expect((data.transcript[0]! as any).uuid).toBe('uuid20');
      expect((data.transcript[9]! as any).uuid).toBe('uuid29');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should handle offset beyond total length', async () => {
      // Setup test project
      const projectDir = join(testDir, '-Users-test-project');
      mkdirSync(projectDir, { recursive: true });

      const sessionId = 'a1b2c3d4-e5f6-4789-0abc-def123456789';
      const sessionFile = join(projectDir, `${sessionId}.jsonl`);

      const now = new Date();
      const transcript = Array.from({ length: 10 }, (_, i) => ({
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test',
        sessionId,
        version: '1.0',
        gitBranch: 'main',
        uuid: `uuid${i}`,
        timestamp: now.toISOString(),
        message: {
          role: 'user' as const,
          content: `Message ${i}`,
        },
      }));

      writeFileSync(
        sessionFile,
        transcript.map((r) => JSON.stringify(r)).join('\n')
      );

      // Register route
      app.get('/api/sessions/:id/transcript', getSessionTranscript(testDir));

      // Make request with offset beyond total
      const res = await app.request(
        `/api/sessions/${sessionId}/transcript?limit=50&offset=100`
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as TranscriptResponse;
      expect(data.total).toBe(10);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(100);
      expect(data.transcript).toHaveLength(0);

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should return 404 for non-existent session', async () => {
      // Register route
      app.get('/api/sessions/:id/transcript', getSessionTranscript(testDir));

      // Make request
      const res = await app.request(
        '/api/sessions/00000000-0000-0000-0000-000000000000/transcript'
      );
      expect(res.status).toBe(404);

      const data = await res.json() as { error: string };
      expect(data.error).toBe('Session not found');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should handle empty transcript', async () => {
      // Setup test project
      const projectDir = join(testDir, '-Users-test-project');
      mkdirSync(projectDir, { recursive: true });

      const sessionId = 'a1b2c3d4-e5f6-4789-0abc-def123456789';
      const sessionFile = join(projectDir, `${sessionId}.jsonl`);

      // Create empty file
      writeFileSync(sessionFile, '');

      // Register route
      app.get('/api/sessions/:id/transcript', getSessionTranscript(testDir));

      // Make request
      const res = await app.request(`/api/sessions/${sessionId}/transcript`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as TranscriptResponse;
      expect(data.total).toBe(0);
      expect(data.transcript).toHaveLength(0);

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });
  });
});
