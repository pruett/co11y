// Claude Code Transcript Types

// Message content types
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | unknown;
  is_error?: boolean;
}

export type MessageContent = TextContent | ToolUseContent | ToolResultContent;

// Message types
export interface UserMessage {
  role: 'user';
  content: string | MessageContent[];
}

export interface AssistantMessage {
  role: 'assistant';
  content: MessageContent[];
  model?: string;
  id?: string;
  type?: 'message';
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: {
    input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation?: {
      ephemeral_5m_input_tokens?: number;
      ephemeral_1h_input_tokens?: number;
    };
    output_tokens?: number;
    service_tier?: string;
  };
}

export type Message = UserMessage | AssistantMessage;

// Transcript record types
export interface BaseTranscriptRecord {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  uuid: string;
  timestamp: string;
  slug?: string;
  agentId?: string;
}

export interface UserTranscriptRecord extends BaseTranscriptRecord {
  type: 'user';
  message: UserMessage;
  toolUseResult?: unknown;
  sourceToolAssistantUUID?: string;
}

export interface AssistantTranscriptRecord extends BaseTranscriptRecord {
  type: 'assistant';
  message: AssistantMessage;
  requestId: string;
}

export interface QueueOperationRecord {
  type: 'queue-operation';
  operation: 'enqueue' | 'dequeue';
  timestamp: string;
  sessionId: string;
  content?: string;
}

export type TranscriptRecord =
  | UserTranscriptRecord
  | AssistantTranscriptRecord
  | QueueOperationRecord;

// Session metadata types
export interface Session {
  id: string;
  project: string;
  projectPath: string;
  status: 'active' | 'idle';
  lastActivity: string;
  messageCount: number;
  toolCallCount: number;
  subagentCount: number;
  model?: string;
  cwd?: string;
  gitBranch?: string;
  slug?: string;
  createdAt?: string;
}

export interface SessionDetail extends Session {
  transcript: TranscriptRecord[];
}

// Subagent types
export interface Subagent {
  agentId: string;
  sessionId: string;
  task: string;
  status: 'running' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
  duration?: number;
  messageCount: number;
  toolCallCount: number;
  currentTool?: string;
  parentAgentId?: string;
}

// Tool call types
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string | unknown;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  duration?: number;
  error?: string;
}

// Hook event types
export interface BaseHookEvent {
  sessionId: string;
  timestamp: string;
  cwd: string;
  gitBranch?: string;
}

export interface SessionStartEvent extends BaseHookEvent {
  type: 'SessionStart';
  slug?: string;
}

export interface SessionEndEvent extends BaseHookEvent {
  type: 'SessionEnd';
  messageCount: number;
  duration: number;
}

export interface PreToolUseEvent extends BaseHookEvent {
  type: 'PreToolUse';
  toolName: string;
  toolInput: Record<string, unknown>;
  messageUuid: string;
}

export interface PostToolUseEvent extends BaseHookEvent {
  type: 'PostToolUse';
  toolName: string;
  toolOutput: unknown;
  success: boolean;
  duration: number;
  messageUuid: string;
}

export type HookEvent =
  | SessionStartEvent
  | SessionEndEvent
  | PreToolUseEvent
  | PostToolUseEvent;

// API response types
export interface SessionsResponse {
  sessions: Session[];
  total: number;
  activeCount: number;
}

export interface TranscriptResponse {
  sessionId: string;
  transcript: TranscriptRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubagentsResponse {
  sessionId: string;
  subagents: Subagent[];
}

export interface HealthResponse {
  status: 'ok';
}

// SSE event types
export interface SSEHookEvent {
  type: 'hook';
  data: HookEvent;
}

export interface SSESessionsEvent {
  type: 'sessions';
  data: Session[];
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  timestamp: string;
}

export type SSEEvent = SSEHookEvent | SSESessionsEvent | SSEHeartbeatEvent;

// Stats types
export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
}

export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

export interface Stats {
  totalSessions: number;
  totalMessages: number;
  messagesToday: number;
  sessionsToday: number;
  toolCallsToday: number;
  totalTokens: number;
  modelUsage: Record<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  firstSessionDate: string;
  longestSession: LongestSession;
}

export interface StatsResponse {
  stats: Stats;
}
