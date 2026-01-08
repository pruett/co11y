import type { Subagent } from '@co11y/shared';
import { Badge } from './ui/badge';

interface SubagentBadgeProps {
  subagent: Subagent;
  compact?: boolean;
}

export function SubagentBadge({ subagent, compact = false }: SubagentBadgeProps) {
  const statusColors = {
    running: 'bg-blue-500 hover:bg-blue-600',
    completed: 'bg-green-500 hover:bg-green-600',
    error: 'bg-red-500 hover:bg-red-600',
  };

  const bgColor = statusColors[subagent.status];
  const shouldPulse = subagent.status === 'running';

  return (
    <Badge
      className={`${bgColor} text-white ${shouldPulse ? 'animate-pulse' : ''}`}
    >
      <span className="font-mono text-xs">
        {subagent.agentId}
      </span>
      {!compact && subagent.currentTool && (
        <>
          <span className="mx-1">•</span>
          <span className="text-xs">{subagent.currentTool}</span>
        </>
      )}
    </Badge>
  );
}
