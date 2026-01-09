import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { getSessions } from './routes/sessions';
import { getProject } from './routes/project';
import { getSessionDetail, getSessionTranscript } from './routes/session-detail';
import { getSubagents } from './routes/subagents';
import { getSubagentTranscript } from './routes/subagent-transcript';
import { getHookEventHandler } from './routes/hooks';
import { getHooksConfigHandler } from './routes/hooks-config';
import { getEventsHandler, setupEventBroadcasting } from './routes/events';
import { getStats } from './routes/stats';

const app = new Hono();

// CORS middleware for frontend (localhost:5173)
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

// Sessions endpoints
app.get('/api/sessions', getSessions());
app.get('/api/sessions/:id', getSessionDetail());
app.get('/api/sessions/:id/transcript', getSessionTranscript());
app.get('/api/sessions/:sessionId/subagents', getSubagents());

// Projects endpoints
app.get('/api/projects/:id', getProject());

// Subagent endpoints
app.get('/api/subagents/:agentId/transcript', getSubagentTranscript());

// Hooks endpoints
app.post('/api/hooks/event', getHookEventHandler());
app.get('/api/hooks/config', getHooksConfigHandler());

// Stats endpoint
app.get('/api/stats', getStats());

// SSE events endpoint
app.get('/api/events', getEventsHandler());

// Setup event broadcasting
setupEventBroadcasting();

const port = 3001;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
