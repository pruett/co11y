import { formatDistanceToNow } from 'date-fns';
import type { TranscriptRecord, ToolUseContent, ToolResultContent } from '@co11y/shared';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ProcessedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string | unknown;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  isError?: boolean;
}

interface ToolCallTimelineProps {
  transcript: TranscriptRecord[];
}

// Tool type color mapping
const getToolColor = (toolName: string): string => {
  const toolColors: Record<string, string> = {
    Read: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Write: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Edit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Bash: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    Glob: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    Grep: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    Task: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    WebFetch: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    WebSearch: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  };

  return toolColors[toolName] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

// Process transcript to extract tool calls with their results
const processTranscript = (transcript: TranscriptRecord[]): ProcessedToolCall[] => {
  const toolCalls: ProcessedToolCall[] = [];
  const toolResultsMap = new Map<string, ToolResultContent>();

  // First pass: collect all tool results
  transcript.forEach((record) => {
    if (record.type === 'user' && record.message.content) {
      const content = Array.isArray(record.message.content)
        ? record.message.content
        : [{ type: 'text' as const, text: record.message.content }];

      content.forEach((item) => {
        if (item.type === 'tool_result') {
          toolResultsMap.set(item.tool_use_id, item);
        }
      });
    }
  });

  // Second pass: extract tool calls and match with results
  transcript.forEach((record) => {
    if (record.type === 'assistant') {
      record.message.content.forEach((item) => {
        if (item.type === 'tool_use') {
          const toolUse = item as ToolUseContent;
          const result = toolResultsMap.get(toolUse.id);

          toolCalls.push({
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
            output: result?.content,
            status: result ? (result.is_error ? 'error' : 'success') : 'pending',
            timestamp: record.timestamp,
            isError: result?.is_error,
          });
        }
      });
    }
  });

  return toolCalls;
};

// Format input/output for display
const formatValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
};

interface ToolCallItemProps {
  toolCall: ProcessedToolCall;
}

const ToolCallItem = ({ toolCall }: ToolCallItemProps) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    switch (toolCall.status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600" data-status="success">
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" data-status="error">
            Error
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="animate-pulse" data-status="pending">
            Running
          </Badge>
        );
    }
  };

  return (
    <Card className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-border">
      <div className="absolute left-1.5 top-6 w-3 h-3 rounded-full bg-primary border-2 border-background" />
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge className={getToolColor(toolCall.name)}>{toolCall.name}</Badge>
              {getStatusBadge()}
              <span className="text-sm text-muted-foreground truncate">
                {formatDistanceToNow(new Date(toolCall.timestamp), { addSuffix: true })}
              </span>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-accent rounded-sm transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          {/* Expandable content */}
          {expanded && (
            <div className="space-y-3">
              <Separator />

              {/* Input */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Input</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {formatValue(toolCall.input)}
                </pre>
              </div>

              {/* Output */}
              {toolCall.output !== undefined && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    {toolCall.isError ? 'Error' : 'Output'}
                  </h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                    {formatValue(toolCall.output)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ToolCallTimeline = ({ transcript }: ToolCallTimelineProps) => {
  const toolCalls = processTranscript(transcript);

  if (toolCalls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No tool calls in this session yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tool Executions</h3>
        <Badge variant="secondary">{toolCalls.length} calls</Badge>
      </div>
      <div className="space-y-2">
        {toolCalls.map((toolCall) => (
          <ToolCallItem key={toolCall.id} toolCall={toolCall} />
        ))}
      </div>
    </div>
  );
};
