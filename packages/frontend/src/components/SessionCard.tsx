import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@co11y/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: Session;
  isSelected?: boolean;
}

export function SessionCard({ session, isSelected = false }: SessionCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/session/${session.id}`);
  };

  const formatRelativeTime = (timestamp: string): string => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:bg-accent/50",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{session.project}</CardTitle>
            <CardDescription className="truncate text-xs mt-1">
              {session.projectPath}
            </CardDescription>
          </div>
          <Badge
            variant={session.status === 'active' ? 'default' : 'secondary'}
            className={cn(
              'shrink-0',
              session.status === 'active' &&
                'bg-green-500 text-white animate-pulse'
            )}
          >
            {session.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Last activity</span>
            <span className="font-medium">
              {formatRelativeTime(session.lastActivity)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Messages</span>
            <span className="font-medium">{session.messageCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tool calls</span>
            <span className="font-medium">{session.toolCallCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subagents</span>
            <span className="font-medium">{session.subagentCount}</span>
          </div>
          {session.model && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Model</span>
              <span className="font-mono text-xs font-medium">
                {session.model}
              </span>
            </div>
          )}
          {session.gitBranch && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Branch</span>
              <span className="font-mono text-xs font-medium truncate max-w-[200px]">
                {session.gitBranch}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
