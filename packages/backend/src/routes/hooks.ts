import type { Context } from 'hono';
import type { HookEvent } from '@co11y/shared';

// In-memory event store for SSE broadcasts
class EventStore {
  private events: HookEvent[] = [];
  private maxEvents = 100; // Keep last 100 events

  addEvent(event: HookEvent): void {
    this.events.push(event);
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getEvents(): HookEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

// Singleton event store
const eventStore = new EventStore();

export function getEventStore(): EventStore {
  return eventStore;
}

// Validate hook event structure
function isValidHookEvent(payload: unknown): payload is HookEvent {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const event = payload as Record<string, unknown>;

  // Check required base fields
  if (
    typeof event.type !== 'string' ||
    typeof event.sessionId !== 'string' ||
    typeof event.timestamp !== 'string' ||
    typeof event.cwd !== 'string'
  ) {
    return false;
  }

  // Validate event type and type-specific fields
  switch (event.type) {
    case 'SessionStart':
      // Optional: slug, gitBranch
      return true;

    case 'SessionEnd':
      // Required: messageCount, duration
      return (
        typeof event.messageCount === 'number' &&
        typeof event.duration === 'number'
      );

    case 'PreToolUse':
      // Required: toolName, toolInput, messageUuid
      return (
        typeof event.toolName === 'string' &&
        typeof event.toolInput === 'object' &&
        event.toolInput !== null &&
        typeof event.messageUuid === 'string'
      );

    case 'PostToolUse':
      // Required: toolName, toolOutput, success, duration, messageUuid
      return (
        typeof event.toolName === 'string' &&
        event.toolOutput !== undefined &&
        typeof event.success === 'boolean' &&
        typeof event.duration === 'number' &&
        typeof event.messageUuid === 'string'
      );

    default:
      return false;
  }
}

// Callback for broadcasting events (set by events.ts)
let broadcastCallback: ((event: HookEvent) => void) | null = null;

export function setBroadcastCallback(callback: (event: HookEvent) => void): void {
  broadcastCallback = callback;
}

// Factory function for testability
export function getHookEventHandler() {
  return async (c: Context) => {
    try {
      // Parse request body
      let payload: unknown;
      try {
        payload = await c.req.json();
      } catch (error) {
        return c.json({ error: 'Invalid JSON payload' }, 400);
      }

      // Validate event structure
      if (!isValidHookEvent(payload)) {
        return c.json({ error: 'Invalid hook event structure' }, 400);
      }

      // Store event in memory for SSE broadcast
      eventStore.addEvent(payload);

      // Broadcast to connected SSE clients
      if (broadcastCallback) {
        broadcastCallback(payload);
      }

      // Return success
      return c.json({ success: true }, 200);
    } catch (error) {
      console.error('Error processing hook event:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}
