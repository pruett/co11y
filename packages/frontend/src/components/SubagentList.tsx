import { useState } from 'react';
import type { Subagent } from '@co11y/shared';
import { SubagentBadge } from './SubagentBadge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSubagentTranscript } from '../hooks/useApi';
import { TranscriptViewer } from './TranscriptViewer';

interface SubagentListProps {
  subagents: Subagent[];
}

interface SubagentItemProps {
  subagent: Subagent;
  isNested?: boolean;
}

function SubagentItem({ subagent, isNested = false }: SubagentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: transcriptData, isLoading: transcriptLoading } = useSubagentTranscript(
    isExpanded ? subagent.agentId : '',
    1000, // Load up to 1000 records when expanded
    0
  );

  return (
    <div className={`border rounded-lg ${isNested ? 'ml-6 mt-2' : ''}`}>
      <div
        className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <SubagentBadge subagent={subagent} />
            {subagent.status === 'running' && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
          </div>
          {subagent.duration && (
            <span className="text-xs text-muted-foreground">
              Duration: {Math.round(subagent.duration / 1000)}s
            </span>
          )}
        </div>

        {subagent.task && (
          <p className="text-sm text-muted-foreground mt-2 ml-6">{subagent.task}</p>
        )}

        <div className="grid grid-cols-2 gap-2 mt-3 text-xs ml-6">
          <div>
            <span className="text-muted-foreground">Messages:</span>{' '}
            <span className="font-medium">{subagent.messageCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tools:</span>{' '}
            <span className="font-medium">{subagent.toolCallCount}</span>
          </div>
        </div>

        {subagent.startTime && (
          <p className="text-xs text-muted-foreground mt-2 ml-6">
            Started: {formatDistanceToNow(new Date(subagent.startTime), { addSuffix: true })}
          </p>
        )}
      </div>

      {isExpanded && (
        <div className="border-t p-4 bg-muted/20">
          {transcriptLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading transcript...</span>
            </div>
          ) : transcriptData && transcriptData.transcript.length > 0 ? (
            <div className="max-h-[600px] overflow-y-auto">
              <TranscriptViewer transcript={transcriptData.transcript} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transcript data available
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SubagentList({ subagents }: SubagentListProps) {
  if (subagents.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No subagents found for this session.
      </p>
    );
  }

  // Organize subagents into tree structure based on parentAgentId
  const rootSubagents = subagents.filter((s) => !s.parentAgentId);
  const childMap = new Map<string, Subagent[]>();

  // Build child map
  subagents.forEach((subagent) => {
    if (subagent.parentAgentId) {
      const children = childMap.get(subagent.parentAgentId) || [];
      children.push(subagent);
      childMap.set(subagent.parentAgentId, children);
    }
  });

  const renderSubagent = (subagent: Subagent, level = 0): React.ReactNode[] => {
    const children = childMap.get(subagent.agentId) || [];
    return [
      <SubagentItem key={subagent.agentId} subagent={subagent} isNested={level > 0} />,
      ...children.flatMap((child) => renderSubagent(child, level + 1)),
    ];
  };

  return (
    <div className="space-y-3">
      {rootSubagents.flatMap((subagent) => renderSubagent(subagent))}
    </div>
  );
}
