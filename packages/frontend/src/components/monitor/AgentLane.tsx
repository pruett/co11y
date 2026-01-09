import type { AgentLaneData } from '@/hooks/useMonitorData';
import type { ToolCall } from '@co11y/shared';
import { ToolExecutionBlock } from './ToolExecutionBlock';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface AgentLaneProps {
  agent: AgentLaneData;
  windowStart: number;
  windowEnd: number;
  pixelsPerSecond: number;
  onToolClick?: (tool: ToolCall) => void;
}

export function AgentLane({
  agent,
  windowStart,
  windowEnd,
  pixelsPerSecond,
  onToolClick,
}: AgentLaneProps) {
  const statusColors = {
    running: 'bg-blue-500 hover:bg-blue-600',
    completed: 'bg-green-500 hover:bg-green-600',
    error: 'bg-red-500 hover:bg-red-600',
  };

  const bgColor = statusColors[agent.status];
  const shouldPulse = agent.status === 'running';
  const isMainAgent = agent.agentId === 'main';

  return (
    <div className="flex items-center h-12 border-b border-border hover:bg-accent/50 transition-colors">
      {/* Fixed-width agent header */}
      <div className="w-48 flex-shrink-0 px-3 flex items-center gap-2 overflow-hidden">
        <Badge
          className={cn(
            bgColor,
            'text-white text-xs font-mono',
            shouldPulse && 'animate-pulse'
          )}
        >
          {isMainAgent ? 'main' : agent.agentId}
        </Badge>
        {agent.currentTool && (
          <span className="text-xs text-muted-foreground truncate">
            {agent.currentTool}
          </span>
        )}
      </div>

      {/* Scrollable timeline area */}
      <div className="flex-1 relative h-full overflow-hidden">
        {agent.toolCalls.map((tool) => (
          <ToolExecutionBlock
            key={tool.id}
            tool={tool}
            windowStart={windowStart}
            pixelsPerSecond={pixelsPerSecond}
            onClick={() => onToolClick?.(tool)}
          />
        ))}
      </div>
    </div>
  );
}
