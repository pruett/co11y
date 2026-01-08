# Co11y - Claude Code Activity Dashboard

Real-time monitoring dashboard for [Claude Code](https://www.anthropic.com/claude-code) activity. Track sessions, subagents, tool calls, and usage statistics in a beautiful web interface.

## Features

- **Real-time Session Monitoring** - Watch Claude Code sessions as they happen
- **Subagent Tracking** - Monitor all subagents with task descriptions and status
- **Tool Call Timeline** - Visualize tool executions with expandable input/output
- **Usage Statistics** - Track token usage, message counts, and model breakdown
- **Server-Sent Events** - Live updates via WebSocket-like SSE connection
- **Dark Mode** - Beautiful dark theme UI using shadcn/ui components
- **Responsive Design** - Works on desktop, tablet, and mobile

## Architecture

Co11y is a monorepo with three packages:

- **packages/frontend** - React 19 + Vite + TailwindCSS v4
- **packages/backend** - Hono.js server with SSE support
- **packages/shared** - Shared TypeScript types

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Claude Code](https://www.anthropic.com/claude-code) installed
- Node.js 18+ (for running the backend)

## Quick Start

1. **Clone and Install**

```bash
git clone https://github.com/yourusername/co11y.git
cd co11y
bun install
```

2. **Configure Environment Variables** (optional)

```bash
cp .env.example .env
# Edit .env if you need custom configuration
```

Default configuration:
- Backend server: `http://localhost:3001`
- Frontend dev server: `http://localhost:5173`
- Claude data directory: `~/.claude`

3. **Start Development Servers**

```bash
bun dev
```

This starts both frontend and backend concurrently.

4. **Open Dashboard**

Navigate to [http://localhost:5173](http://localhost:5173)

## Configuration

### Backend (.env)

```bash
PORT=3001                              # Backend server port
CLAUDE_DIR=~/.claude                   # Claude data directory
CORS_ORIGIN=http://localhost:5173      # Frontend origin
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001    # Backend API URL
```

## Claude Code Hooks Setup

To receive real-time events from Claude Code, configure webhooks in `~/.claude/settings.json`:

1. Get the hook configuration:

```bash
curl http://localhost:3001/api/hooks/config
```

2. Copy the JSON output into your `~/.claude/settings.json` file

3. Restart Claude Code

Now Co11y will receive live events when:
- Sessions start/end
- Tools are executed
- Messages are sent

## Available Scripts

### Root Commands

```bash
bun dev          # Start both frontend and backend in development mode
bun build        # Build all packages for production
bun typecheck    # Type-check all packages
bun test         # Run tests in all packages
```

### Frontend Commands

```bash
cd packages/frontend
bun dev          # Start Vite dev server (port 5173)
bun build        # Build for production
bun preview      # Preview production build
bun typecheck    # Type-check without emitting
bun test         # Run frontend tests
```

### Backend Commands

```bash
cd packages/backend
bun dev          # Start backend with hot reload (port 3001)
bun build        # Compile TypeScript
bun typecheck    # Type-check without emitting
bun test         # Run backend tests
```

## API Endpoints

### Sessions

- `GET /api/sessions` - List all sessions
- `GET /api/sessions?active=true` - List active sessions only
- `GET /api/sessions/:id` - Get session details with transcript
- `GET /api/sessions/:id/transcript?limit=50&offset=0` - Get paginated transcript

### Subagents

- `GET /api/sessions/:sessionId/subagents` - List subagents for a session
- `GET /api/subagents/:agentId/transcript` - Get subagent transcript

### Statistics

- `GET /api/stats` - Get usage statistics from stats-cache.json

### Webhooks

- `POST /api/hooks/event` - Receive webhook events from Claude Code
- `GET /api/hooks/config` - Get webhook configuration JSON

### Real-time

- `GET /api/events` - Server-Sent Events endpoint for live updates

### Health

- `GET /api/health` - Health check endpoint

## Development

### Project Structure

```
co11y/
├── packages/
│   ├── frontend/          # React application
│   │   ├── src/
│   │   │   ├── components/    # Reusable React components
│   │   │   ├── pages/         # Page components (Dashboard, SessionDetail)
│   │   │   ├── hooks/         # Custom React hooks (useApi, useEventSource)
│   │   │   └── lib/           # Utilities (api-client, query-client)
│   │   └── package.json
│   ├── backend/           # Hono.js server
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   └── lib/           # Utilities (parsers, scanners, analyzers)
│   │   └── package.json
│   └── shared/            # Shared TypeScript types
│       ├── src/
│       │   └── index.ts       # Exported types
│       └── package.json
├── .env.example           # Example environment variables
└── package.json           # Root workspace configuration
```

### Adding New Components

1. Frontend components go in `packages/frontend/src/components/`
2. Use shadcn/ui components: `npx shadcn add [component-name] --cwd packages/frontend`
3. Follow existing patterns for styling and structure

### Adding New API Endpoints

1. Create route handler in `packages/backend/src/routes/`
2. Use factory pattern for testability: `export const getHandler = (deps?) => (c) => { ... }`
3. Register route in `packages/backend/src/index.ts`
4. Add types to `packages/shared/src/index.ts`
5. Add API client function to `packages/frontend/src/lib/api-client.ts`
6. Add React Query hook to `packages/frontend/src/hooks/useApi.ts`

### Running Tests

```bash
# All tests
bun test

# Backend tests only
cd packages/backend && bun test

# Frontend tests only
cd packages/frontend && bun test

# Watch mode
bun test --watch
```

### Type Checking

```bash
# Check all packages
bun typecheck

# Auto-fix many issues
bun typecheck --fix
```

## Technologies

### Frontend
- **React 19** - Latest React with concurrent features
- **Vite 6** - Lightning-fast build tool
- **TailwindCSS v4** - Utility-first CSS with new engine
- **shadcn/ui** - Beautiful component library
- **TanStack Query** - Server state management
- **React Router v7** - Client-side routing
- **date-fns** - Date formatting utilities

### Backend
- **Hono.js** - Lightweight web framework
- **Bun** - Fast JavaScript runtime
- **Server-Sent Events** - Real-time updates
- **TypeScript** - Type safety

### Development
- **Bun Workspaces** - Monorepo management
- **Bun Test** - Built-in test runner
- **TypeScript** - Type checking
- **Concurrently** - Run multiple dev servers

## Troubleshooting

### Port Already in Use

If port 3001 or 5173 is already in use:

```bash
# Find process using port
lsof -ti:3001
# Kill process
kill -9 $(lsof -ti:3001)
```

Or change ports in `.env` files.

### No Sessions Showing

1. Verify Claude Code is installed and has created sessions
2. Check `~/.claude/projects/` directory exists
3. Ensure backend can read the directory (permissions)

### Hooks Not Working

1. Verify `~/.claude/settings.json` has webhook configuration
2. Check backend is running on correct port
3. Restart Claude Code after adding hooks
4. Check backend logs for incoming webhook requests

### Build Errors

```bash
# Clean and reinstall
rm -rf node_modules packages/*/node_modules
bun install

# Clear TypeScript build cache
rm -rf packages/*/dist tsconfig.tsbuildinfo packages/*/tsconfig.tsbuildinfo
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `bun test`
5. Run type check: `bun typecheck`
6. Commit: `git commit -m "feat: add my feature"`
7. Push: `git push origin feature/my-feature`
8. Open a Pull Request

## License

MIT

## Acknowledgments

- Built for [Claude Code](https://www.anthropic.com/claude-code)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Inspired by developer tools and monitoring dashboards

---

**Note**: This project is not officially affiliated with Anthropic or Claude. It's a community tool for monitoring Claude Code activity.
