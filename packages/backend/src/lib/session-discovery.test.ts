import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { discoverSessions, discoverSubagents } from './session-discovery';
import type {
  UserTranscriptRecord,
  AssistantTranscriptRecord,
} from '@co11y/shared';

describe('session-discovery', () => {
  let testProjectDir: string;

  beforeEach(() => {
    // Create a unique test directory
    testProjectDir = join(tmpdir(), `test-project-${Date.now()}`);
    mkdirSync(testProjectDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testProjectDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('discoverSessions', () => {
    it('should discover main session files (UUID.jsonl)', () => {
      // Create test session files
      const session1Id = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const session2Id = 'a1234567-1234-1234-1234-123456789abc';

      const record1: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId: session1Id,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '123',
        timestamp: '2026-01-07T10:00:00Z',
        message: { role: 'user', content: 'Hello' },
      };

      const record2: AssistantTranscriptRecord = {
        type: 'assistant' as const,
        parentUuid: '123',
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId: session2Id,
        version: '1.0.0',
        gitBranch: 'feature',
        uuid: '456',
        timestamp: '2026-01-07T11:00:00Z',
        requestId: 'req-123',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi there' }],
        },
      };

      writeFileSync(
        join(testProjectDir, `${session1Id}.jsonl`),
        JSON.stringify(record1) + '\n'
      );
      writeFileSync(
        join(testProjectDir, `${session2Id}.jsonl`),
        JSON.stringify(record2) + '\n'
      );

      // Also create a non-session file to ensure it's ignored
      writeFileSync(join(testProjectDir, 'readme.txt'), 'not a session');

      const sessions = discoverSessions(testProjectDir);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe(session1Id);
      expect(sessions[0].filePath).toBe(join(testProjectDir, `${session1Id}.jsonl`));
      expect(sessions[1].id).toBe(session2Id);
    });

    it('should ignore subagent files (agent-*.jsonl)', () => {
      const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const agentId = 'a0c831a';

      const record: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '123',
        timestamp: '2026-01-07T10:00:00Z',
        message: { role: 'user', content: 'Hello' },
      };

      // Create main session
      writeFileSync(
        join(testProjectDir, `${sessionId}.jsonl`),
        JSON.stringify(record) + '\n'
      );

      // Create subagent file (should be ignored)
      writeFileSync(
        join(testProjectDir, `agent-${agentId}.jsonl`),
        JSON.stringify({ ...record, agentId, isSidechain: true }) + '\n'
      );

      const sessions = discoverSessions(testProjectDir);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(sessionId);
    });

    it('should return empty array for non-existent directory', () => {
      const sessions = discoverSessions('/non/existent/path');
      expect(sessions).toEqual([]);
    });

    it('should handle directory with no session files', () => {
      writeFileSync(join(testProjectDir, 'not-a-session.txt'), 'content');
      const sessions = discoverSessions(testProjectDir);
      expect(sessions).toEqual([]);
    });

    it('should sort sessions by ID', () => {
      const ids = [
        'ffffffff-1234-1234-1234-123456789abc',
        'aaaaaaaa-1234-1234-1234-123456789abc',
        'cccccccc-1234-1234-1234-123456789abc',
      ];

      for (const id of ids) {
        const record: UserTranscriptRecord = {
          type: 'user' as const,
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: '/Users/test/project',
          sessionId: id,
          version: '1.0.0',
          gitBranch: 'main',
          uuid: '123',
          timestamp: '2026-01-07T10:00:00Z',
          message: { role: 'user', content: 'Hello' },
        };

        writeFileSync(join(testProjectDir, `${id}.jsonl`), JSON.stringify(record) + '\n');
      }

      const sessions = discoverSessions(testProjectDir);

      expect(sessions).toHaveLength(3);
      expect(sessions[0].id).toBe(ids[1]); // aaaaaaaa
      expect(sessions[1].id).toBe(ids[2]); // cccccccc
      expect(sessions[2].id).toBe(ids[0]); // ffffffff
    });
  });

  describe('discoverSubagents', () => {
    it('should discover subagent files (agent-*.jsonl)', () => {
      const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const agentId1 = 'a0c831a';
      const agentId2 = 'b1d942b';

      const record1: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: true,
        agentId: agentId1,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '123',
        timestamp: '2026-01-07T10:00:00Z',
        message: { role: 'user', content: 'Task 1' },
      };

      const record2: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: true,
        agentId: agentId2,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '456',
        timestamp: '2026-01-07T11:00:00Z',
        message: { role: 'user', content: 'Task 2' },
      };

      writeFileSync(
        join(testProjectDir, `agent-${agentId1}.jsonl`),
        JSON.stringify(record1) + '\n'
      );
      writeFileSync(
        join(testProjectDir, `agent-${agentId2}.jsonl`),
        JSON.stringify(record2) + '\n'
      );

      const subagents = discoverSubagents(testProjectDir);

      expect(subagents).toHaveLength(2);
      expect(subagents[0].agentId).toBe(agentId1);
      expect(subagents[0].sessionId).toBe(sessionId);
      expect(subagents[1].agentId).toBe(agentId2);
    });

    it('should ignore main session files (UUID.jsonl)', () => {
      const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const agentId = 'a0c831a';

      const sessionRecord: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '123',
        timestamp: '2026-01-07T10:00:00Z',
        message: { role: 'user', content: 'Hello' },
      };

      const agentRecord: UserTranscriptRecord = {
        ...sessionRecord,
        agentId,
        isSidechain: true,
        message: { role: 'user', content: 'Agent task' },
      };

      // Create main session (should be ignored)
      writeFileSync(
        join(testProjectDir, `${sessionId}.jsonl`),
        JSON.stringify(sessionRecord) + '\n'
      );

      // Create subagent file
      writeFileSync(
        join(testProjectDir, `agent-${agentId}.jsonl`),
        JSON.stringify(agentRecord) + '\n'
      );

      const subagents = discoverSubagents(testProjectDir);

      expect(subagents).toHaveLength(1);
      expect(subagents[0].agentId).toBe(agentId);
    });

    it('should return empty array for non-existent directory', () => {
      const subagents = discoverSubagents('/non/existent/path');
      expect(subagents).toEqual([]);
    });

    it('should handle directory with no subagent files', () => {
      const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const record: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '123',
        timestamp: '2026-01-07T10:00:00Z',
        message: { role: 'user', content: 'Hello' },
      };

      writeFileSync(
        join(testProjectDir, `${sessionId}.jsonl`),
        JSON.stringify(record) + '\n'
      );

      const subagents = discoverSubagents(testProjectDir);
      expect(subagents).toEqual([]);
    });

    it('should extract sessionId from first record', () => {
      const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const agentId = 'a0c831a';

      const record1: UserTranscriptRecord = {
        type: 'user' as const,
        parentUuid: null,
        isSidechain: true,
        agentId,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '123',
        timestamp: '2026-01-07T10:00:00Z',
        message: { role: 'user', content: 'Task' },
      };

      const record2: AssistantTranscriptRecord = {
        type: 'assistant' as const,
        parentUuid: '123',
        isSidechain: true,
        agentId,
        userType: 'human',
        cwd: '/Users/test/project',
        sessionId,
        version: '1.0.0',
        gitBranch: 'main',
        uuid: '456',
        timestamp: '2026-01-07T10:01:00Z',
        requestId: 'req-123',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
        },
      };

      writeFileSync(
        join(testProjectDir, `agent-${agentId}.jsonl`),
        JSON.stringify(record1) + '\n' + JSON.stringify(record2) + '\n'
      );

      const subagents = discoverSubagents(testProjectDir);

      expect(subagents).toHaveLength(1);
      expect(subagents[0].sessionId).toBe(sessionId);
    });

    it('should sort subagents by agentId', () => {
      const sessionId = '1c5be2b5-7887-48c0-8f2a-0e55031f852b';
      const agentIds = ['z9z9z9z', 'a1a1a1a', 'm5m5m5m'];

      for (const agentId of agentIds) {
        const record: UserTranscriptRecord = {
          type: 'user' as const,
          parentUuid: null,
          isSidechain: true,
          agentId,
          userType: 'human',
          cwd: '/Users/test/project',
          sessionId,
          version: '1.0.0',
          gitBranch: 'main',
          uuid: '123',
          timestamp: '2026-01-07T10:00:00Z',
          message: { role: 'user', content: 'Task' },
        };

        writeFileSync(
          join(testProjectDir, `agent-${agentId}.jsonl`),
          JSON.stringify(record) + '\n'
        );
      }

      const subagents = discoverSubagents(testProjectDir);

      expect(subagents).toHaveLength(3);
      expect(subagents[0].agentId).toBe(agentIds[1]); // a1a1a1a
      expect(subagents[1].agentId).toBe(agentIds[2]); // m5m5m5m
      expect(subagents[2].agentId).toBe(agentIds[0]); // z9z9z9z
    });

    it('should handle malformed JSONL files gracefully', () => {
      const agentId = 'a0c831a';

      writeFileSync(
        join(testProjectDir, `agent-${agentId}.jsonl`),
        'invalid json\n{"type": "user"}\n'
      );

      const subagents = discoverSubagents(testProjectDir);

      // Should still return the subagent even if parsing fails
      // (parseJsonlFile handles malformed lines)
      expect(subagents).toHaveLength(1);
      expect(subagents[0].agentId).toBe(agentId);
    });
  });
});
