import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { getEventStore } from './hooks';
import { getEventsHandler, broadcastEvent, setupEventBroadcasting, stopFileWatcher } from './events';
import type { HookEvent } from '@co11y/shared';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('SSE Events Endpoint', () => {
  let app: Hono;
  let testDir: string;

  beforeEach(() => {
    // Create fresh app for each test
    app = new Hono();

    // Create test directory with mock data
    testDir = join(tmpdir(), `co11y-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const projectDir = join(testDir, '-test-project');
    mkdirSync(projectDir, { recursive: true });

    // Create a valid session file
    const sessionId = 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);
    const record = {
      type: 'user',
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/test',
      sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'msg-1',
      timestamp: new Date().toISOString(),
      message: { role: 'user', content: 'test' },
    };
    writeFileSync(sessionFile, JSON.stringify(record));

    app.get('/api/events', getEventsHandler(testDir));

    // Clear event store
    getEventStore().clear();
  });

  afterEach(() => {
    // Stop file watcher
    stopFileWatcher();

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it('should establish SSE connection with correct headers', async () => {
    const req = new Request('http://localhost/api/events');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    expect(res.headers.get('Connection')).toBe('keep-alive');
  });

  it('should send existing events from event store on connect', async () => {
    const hookEvent: HookEvent = {
      type: 'SessionStart',
      sessionId: 'test-session-123',
      timestamp: new Date().toISOString(),
      cwd: '/test/path',
      slug: 'test-project',
    };

    // Add event to store before connecting
    getEventStore().addEvent(hookEvent);

    const req = new Request('http://localhost/api/events');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();

    // The event should be sent to the client
    // (We can't easily test the actual stream content in unit tests,
    // but we verify the connection is established)
  });

  it('should handle multiple hook event types in store', async () => {
    const sessionStart: HookEvent = {
      type: 'SessionStart',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/test',
    };

    const preToolUse: HookEvent = {
      type: 'PreToolUse',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/test',
      toolName: 'Read',
      toolInput: { file_path: 'test.ts' },
      messageUuid: 'msg-123',
    };

    const postToolUse: HookEvent = {
      type: 'PostToolUse',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/test',
      toolName: 'Read',
      toolOutput: 'file contents',
      success: true,
      duration: 100,
      messageUuid: 'msg-123',
    };

    getEventStore().addEvent(sessionStart);
    getEventStore().addEvent(preToolUse);
    getEventStore().addEvent(postToolUse);

    const req = new Request('http://localhost/api/events');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(getEventStore().getEvents()).toHaveLength(3);
  });

  it('should accept connections with test directory', async () => {
    const req = new Request('http://localhost/api/events');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('should handle session end events', async () => {
    const sessionEnd: HookEvent = {
      type: 'SessionEnd',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/test',
      messageCount: 10,
      duration: 5000,
    };

    getEventStore().addEvent(sessionEnd);

    const req = new Request('http://localhost/api/events');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(getEventStore().getEvents()).toHaveLength(1);
    expect(getEventStore().getEvents()[0].type).toBe('SessionEnd');
  });

  it('should store events in order', async () => {
    const events: HookEvent[] = [
      {
        type: 'SessionStart',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        cwd: '/test',
      },
      {
        type: 'PreToolUse',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        cwd: '/test',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        messageUuid: 'msg-1',
      },
      {
        type: 'PostToolUse',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        cwd: '/test',
        toolName: 'Bash',
        toolOutput: 'file1.txt\nfile2.txt',
        success: true,
        duration: 50,
        messageUuid: 'msg-1',
      },
    ];

    for (const event of events) {
      getEventStore().addEvent(event);
    }

    const storedEvents = getEventStore().getEvents();
    expect(storedEvents).toHaveLength(3);
    expect(storedEvents[0].type).toBe('SessionStart');
    expect(storedEvents[1].type).toBe('PreToolUse');
    expect(storedEvents[2].type).toBe('PostToolUse');
  });

  it('should clear event store', async () => {
    getEventStore().addEvent({
      type: 'SessionStart',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/test',
    });

    expect(getEventStore().getEvents()).toHaveLength(1);

    getEventStore().clear();

    expect(getEventStore().getEvents()).toHaveLength(0);
  });

  it('should setup file watcher when broadcasting is enabled', async () => {
    setupEventBroadcasting(testDir);

    // Wait a bit for watcher to initialize
    await new Promise((resolve) => setTimeout(resolve, 200));

    // File watcher should be running (we verify by stopping it without errors)
    stopFileWatcher();
  });

  it('should broadcast session updates when files change', async () => {
    setupEventBroadcasting(testDir);

    // Wait for watcher to initialize
    await new Promise((resolve) => setTimeout(resolve, 200));

    const projectDir = join(testDir, '-test-project');
    const sessionId = 'bbbbbbbb-2222-3333-4444-cccccccccccc';
    const sessionFile = join(projectDir, `${sessionId}.jsonl`);

    // Create a new session file
    const record = {
      type: 'user',
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      cwd: '/test',
      sessionId,
      version: '1.0',
      gitBranch: 'main',
      uuid: 'msg-1',
      timestamp: new Date().toISOString(),
      message: { role: 'user', content: 'new session' },
    };
    writeFileSync(sessionFile, JSON.stringify(record));

    // Wait for debounce and processing
    await new Promise((resolve) => setTimeout(resolve, 700));

    // File watcher should have triggered (no way to easily assert the broadcast in tests)
    // But we can verify no errors occurred
    stopFileWatcher();
  });
});
