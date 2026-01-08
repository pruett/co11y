import type { Context } from 'hono';

interface HookConfig {
  type: 'command';
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

// Factory function for testability
export function getHooksConfigHandler() {
  return (c: Context) => {
    // Allow custom webhook URL via query parameter
    const webhookUrl = c.req.query('url') || 'http://localhost:3001/api/hooks/event';

    // Generate hooks configuration for Claude Code
    const config: HooksConfiguration = {
      hooks: {
        SessionStart: [
          {
            matcher: '.*',
            hooks: [
              {
                type: 'command',
                command: generateSessionStartCommand(webhookUrl),
              },
            ],
          },
        ],
        SessionEnd: [
          {
            matcher: '.*',
            hooks: [
              {
                type: 'command',
                command: generateSessionEndCommand(webhookUrl),
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: '.*',
            hooks: [
              {
                type: 'command',
                command: generatePreToolUseCommand(webhookUrl),
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: '.*',
            hooks: [
              {
                type: 'command',
                command: generatePostToolUseCommand(webhookUrl),
              },
            ],
          },
        ],
      },
    };

    return c.json(config);
  };
}

function generateSessionStartCommand(webhookUrl: string): string {
  // Read stdin JSON and extract session metadata
  return `cat | jq -c '{
  type: "SessionStart",
  sessionId: .session_id,
  timestamp: (now | todate),
  cwd: .cwd,
  slug: .slug,
  gitBranch: .git_branch
}' | curl -X POST -H "Content-Type: application/json" -d @- ${webhookUrl} -s -o /dev/null`;
}

function generateSessionEndCommand(webhookUrl: string): string {
  // Read stdin JSON and extract session end metadata
  return `cat | jq -c '{
  type: "SessionEnd",
  sessionId: .session_id,
  timestamp: (now | todate),
  cwd: .cwd,
  gitBranch: .git_branch,
  messageCount: .message_count,
  duration: .duration
}' | curl -X POST -H "Content-Type: application/json" -d @- ${webhookUrl} -s -o /dev/null`;
}

function generatePreToolUseCommand(webhookUrl: string): string {
  // Read stdin JSON and extract tool use metadata
  return `cat | jq -c '{
  type: "PreToolUse",
  sessionId: .session_id,
  timestamp: (now | todate),
  cwd: .cwd,
  gitBranch: .git_branch,
  toolName: .tool_name,
  toolInput: .tool_input,
  messageUuid: .message_uuid
}' | curl -X POST -H "Content-Type: application/json" -d @- ${webhookUrl} -s -o /dev/null`;
}

function generatePostToolUseCommand(webhookUrl: string): string {
  // Read stdin JSON and extract tool result metadata
  return `cat | jq -c '{
  type: "PostToolUse",
  sessionId: .session_id,
  timestamp: (now | todate),
  cwd: .cwd,
  gitBranch: .git_branch,
  toolName: .tool_name,
  toolOutput: .tool_output,
  success: .success,
  duration: .duration,
  messageUuid: .message_uuid
}' | curl -X POST -H "Content-Type: application/json" -d @- ${webhookUrl} -s -o /dev/null`;
}
