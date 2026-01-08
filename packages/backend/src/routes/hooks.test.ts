import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import type { HookEvent } from '@co11y/shared';
import { getHookEventHandler, getEventStore } from './hooks';

describe('POST /api/hooks/event', () => {
  it('should accept valid SessionStart event', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const event: HookEvent = {
      type: 'SessionStart',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
      gitBranch: 'main',
      slug: 'test-project',
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
  });

  it('should accept valid SessionEnd event', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const event: HookEvent = {
      type: 'SessionEnd',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
      messageCount: 42,
      duration: 3600000,
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
  });

  it('should accept valid PreToolUse event', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const event: HookEvent = {
      type: 'PreToolUse',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
      toolName: 'Read',
      toolInput: { file_path: '/path/to/file.ts' },
      messageUuid: 'msg-123',
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
  });

  it('should accept valid PostToolUse event', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const event: HookEvent = {
      type: 'PostToolUse',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
      toolName: 'Read',
      toolOutput: 'file contents...',
      success: true,
      duration: 150,
      messageUuid: 'msg-123',
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
  });

  it('should reject event missing required type field', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const invalidEvent = {
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Invalid hook event');
  });

  it('should reject event missing required sessionId field', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const invalidEvent = {
      type: 'SessionStart',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Invalid hook event');
  });

  it('should reject event missing required timestamp field', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const invalidEvent = {
      type: 'SessionStart',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      cwd: '/Users/test/project',
    };

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Invalid hook event');
  });

  it('should reject event with invalid JSON', async () => {
    const app = new Hono();
    app.post('/api/hooks/event', getHookEventHandler());

    const res = await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Invalid JSON');
  });

  it('should store events in memory for SSE broadcast', async () => {
    const app = new Hono();
    const eventStore = getEventStore();
    eventStore.clear(); // Clear before test

    app.post('/api/hooks/event', getHookEventHandler());

    const event: HookEvent = {
      type: 'SessionStart',
      sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
    };

    await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    const storedEvents = eventStore.getEvents();
    expect(storedEvents.length).toBe(1);
    expect(storedEvents[0]).toEqual(event);
  });

  it('should handle multiple events and maintain order', async () => {
    const app = new Hono();
    const eventStore = getEventStore();
    eventStore.clear(); // Clear before test

    app.post('/api/hooks/event', getHookEventHandler());

    const event1: HookEvent = {
      type: 'SessionStart',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
    };

    const event2: HookEvent = {
      type: 'PreToolUse',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      cwd: '/Users/test/project',
      toolName: 'Read',
      toolInput: { file_path: 'test.ts' },
      messageUuid: 'msg-1',
    };

    await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event1),
    });

    await app.request('/api/hooks/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event2),
    });

    const storedEvents = eventStore.getEvents();
    expect(storedEvents.length).toBe(2);
    expect(storedEvents[0]).toEqual(event1);
    expect(storedEvents[1]).toEqual(event2);
  });
});
