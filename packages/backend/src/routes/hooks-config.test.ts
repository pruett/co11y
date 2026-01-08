import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { getHooksConfigHandler } from './hooks-config';

interface HookConfig {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookConfig[];
}

interface HooksConfiguration {
  hooks: {
    SessionStart: HookMatcher[];
    SessionEnd: HookMatcher[];
    PreToolUse: HookMatcher[];
    PostToolUse: HookMatcher[];
  };
}

describe('GET /api/hooks/config', () => {
  const app = new Hono();
  app.get('/api/hooks/config', getHooksConfigHandler());

  it('should return hooks configuration JSON', async () => {
    const res = await app.request('/api/hooks/config');
    expect(res.status).toBe(200);

    const data = (await res.json()) as HooksConfiguration;
    expect(data).toHaveProperty('hooks');
    expect(data.hooks).toHaveProperty('SessionStart');
    expect(data.hooks).toHaveProperty('SessionEnd');
    expect(data.hooks).toHaveProperty('PreToolUse');
    expect(data.hooks).toHaveProperty('PostToolUse');
  });

  it('should include correct webhook URL in configuration', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    // Check SessionStart hook
    const sessionStartHook = data.hooks.SessionStart[0].hooks[0];
    expect(sessionStartHook.command).toContain('http://localhost:3001/api/hooks/event');
  });

  it('should include all required fields for SessionStart event', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    const sessionStartHook = data.hooks.SessionStart[0].hooks[0];
    expect(sessionStartHook.type).toBe('command');
    expect(sessionStartHook.command).toContain('SessionStart');
    expect(sessionStartHook.command).toContain('sessionId');
    expect(sessionStartHook.command).toContain('timestamp');
    expect(sessionStartHook.command).toContain('cwd');
  });

  it('should include all required fields for SessionEnd event', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    const sessionEndHook = data.hooks.SessionEnd[0].hooks[0];
    expect(sessionEndHook.type).toBe('command');
    expect(sessionEndHook.command).toContain('SessionEnd');
    expect(sessionEndHook.command).toContain('messageCount');
    expect(sessionEndHook.command).toContain('duration');
  });

  it('should include all required fields for PreToolUse event', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    const preToolUseHook = data.hooks.PreToolUse[0].hooks[0];
    expect(preToolUseHook.type).toBe('command');
    expect(preToolUseHook.command).toContain('PreToolUse');
    expect(preToolUseHook.command).toContain('toolName');
    expect(preToolUseHook.command).toContain('toolInput');
    expect(preToolUseHook.command).toContain('messageUuid');
  });

  it('should include all required fields for PostToolUse event', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    const postToolUseHook = data.hooks.PostToolUse[0].hooks[0];
    expect(postToolUseHook.type).toBe('command');
    expect(postToolUseHook.command).toContain('PostToolUse');
    expect(postToolUseHook.command).toContain('toolOutput');
    expect(postToolUseHook.command).toContain('success');
    expect(postToolUseHook.command).toContain('duration');
  });

  it('should use curl to POST to webhook endpoint', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    const sessionStartHook = data.hooks.SessionStart[0].hooks[0];
    expect(sessionStartHook.command).toContain('curl');
    expect(sessionStartHook.command).toContain('-X POST');
    expect(sessionStartHook.command).toContain('-H "Content-Type: application/json"');
  });

  it('should use matcher ".*" to match all events', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    expect(data.hooks.SessionStart[0].matcher).toBe('.*');
    expect(data.hooks.SessionEnd[0].matcher).toBe('.*');
    expect(data.hooks.PreToolUse[0].matcher).toBe('.*');
    expect(data.hooks.PostToolUse[0].matcher).toBe('.*');
  });

  it('should accept custom webhook URL via query parameter', async () => {
    const res = await app.request('/api/hooks/config?url=http://custom:8080/api/hooks/event');
    const data = (await res.json()) as HooksConfiguration;

    const sessionStartHook = data.hooks.SessionStart[0].hooks[0];
    expect(sessionStartHook.command).toContain('http://custom:8080/api/hooks/event');
    expect(sessionStartHook.command).not.toContain('http://localhost:3001');
  });

  it('should return valid JSON structure', async () => {
    const res = await app.request('/api/hooks/config');
    const data = (await res.json()) as HooksConfiguration;

    // Verify it's valid JSON that can be stringified
    expect(() => JSON.stringify(data)).not.toThrow();

    // Verify structure matches Claude Code hooks format
    expect(data).toEqual({
      hooks: expect.objectContaining({
        SessionStart: expect.any(Array),
        SessionEnd: expect.any(Array),
        PreToolUse: expect.any(Array),
        PostToolUse: expect.any(Array),
      }),
    });
  });
});
