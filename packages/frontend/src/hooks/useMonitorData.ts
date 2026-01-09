import { useMemo } from 'react';
import type { SessionDetail, Subagent, ToolCall, HookEvent } from '@co11y/shared';
import { useSessionDetail, useSubagents } from './useApi';
import { useEventSource } from './useEventSource';

export interface AgentLaneData {
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
  toolCalls: ToolCall[];
}

export interface MonitorData {
  session: SessionDetail;
  mainAgent: AgentLaneData;
  subagents: AgentLaneData[];
  allAgents: AgentLaneData[]; // Hierarchical order: main + subagents
  totalTokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  };
  runningCount: number;
  completedCount: number;
  errorCount: number;
  lastUpdate: string | null;
}

/**
 * Extract tool calls from session transcript
 */
function extractToolCalls(session: SessionDetail): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  for (const record of session.transcript || []) {
    if (record.type === 'assistant' && record.message?.content) {
      const contents = Array.isArray(record.message.content)
        ? record.message.content
        : [record.message.content];

      for (const content of contents) {
        if (content.type === 'tool_use') {
          toolCalls.push({
            id: content.id,
            name: content.name,
            input: content.input || {},
            timestamp: record.timestamp,
            status: 'pending', // Will be updated when we find the result
          });
        }
      }
    }

    // Look for tool results to update status and duration
    if (record.type === 'user' && record.message?.content) {
      const contents = Array.isArray(record.message.content)
        ? record.message.content
        : [record.message.content];

      for (const content of contents) {
        if (typeof content === 'object' && content.type === 'tool_result') {
          const toolCall = toolCalls.find(tc => tc.id === content.tool_use_id);
          if (toolCall) {
            toolCall.status = content.is_error ? 'error' : 'success';
            toolCall.output = content.content;
            if (content.is_error) {
              toolCall.error = typeof content.content === 'string'
                ? content.content
                : JSON.stringify(content.content);
            }
            // Calculate duration from timestamps
            const startTime = new Date(toolCall.timestamp).getTime();
            const endTime = new Date(record.timestamp).getTime();
            toolCall.duration = endTime - startTime;
          }
        }
      }
    }
  }

  return toolCalls;
}

/**
 * Calculate total token usage from transcript
 */
function calculateTokenUsage(session: SessionDetail) {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheCreation = 0;

  for (const record of session.transcript || []) {
    if (record.type === 'assistant' && record.message?.usage) {
      const usage = record.message.usage;
      input += usage.input_tokens || 0;
      output += usage.output_tokens || 0;
      cacheRead += usage.cache_read_input_tokens || 0;
      cacheCreation += usage.cache_creation_input_tokens || 0;
    }
  }

  return { input, output, cacheRead, cacheCreation };
}

/**
 * Hook for transforming session data into monitor timeline data
 */
export function useMonitorData(sessionId: string): {
  data: MonitorData | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: session, isLoading: sessionLoading, error: sessionError } = useSessionDetail(sessionId);
  const { data: subagentsResponse, isLoading: subagentsLoading } = useSubagents(sessionId);
  const { lastEvent } = useEventSource();

  const data = useMemo(() => {
    if (!session) return undefined;

    const subagents = subagentsResponse?.subagents || [];
    const toolCalls = extractToolCalls(session);
    const totalTokens = calculateTokenUsage(session);

    // Create main agent lane
    const mainAgent: AgentLaneData = {
      agentId: 'main',
      sessionId: session.id,
      task: session.slug || 'Main Session',
      status: session.status === 'active' ? 'running' : 'completed',
      startTime: session.createdAt || session.lastActivity,
      messageCount: session.messageCount,
      toolCallCount: session.toolCallCount,
      toolCalls,
    };

    // Transform subagents into lane data
    const subagentLanes: AgentLaneData[] = subagents.map(subagent => ({
      ...subagent,
      toolCalls: [], // TODO: Load subagent tool calls if needed
    }));

    // Count statuses
    const runningCount = [mainAgent, ...subagentLanes].filter(a => a.status === 'running').length;
    const completedCount = [mainAgent, ...subagentLanes].filter(a => a.status === 'completed').length;
    const errorCount = [mainAgent, ...subagentLanes].filter(a => a.status === 'error').length;

    // Get last update time from lastEvent or session lastActivity
    let lastUpdate: string | null = session.lastActivity;
    if (lastEvent?.type === 'hook' && lastEvent.data.sessionId === sessionId) {
      lastUpdate = lastEvent.data.timestamp;
    }

    return {
      session,
      mainAgent,
      subagents: subagentLanes,
      allAgents: [mainAgent, ...subagentLanes],
      totalTokens,
      runningCount,
      completedCount,
      errorCount,
      lastUpdate,
    };
  }, [session, subagentsResponse, lastEvent, sessionId]);

  return {
    data,
    isLoading: sessionLoading || subagentsLoading,
    error: sessionError as Error | null,
  };
}
