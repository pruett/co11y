import { useState, useEffect, lazy, Suspense } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useProjects, useSessionDetail } from '@/hooks/useApi';
import { useEventSource } from '@/hooks/useEventSource';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const HooksSetupWizard = lazy(() =>
  import('@/components/HooksSetupWizard').then(module => ({ default: module.HooksSetupWizard }))
);

const TranscriptViewer = lazy(() =>
  import('@/components/TranscriptViewer').then(module => ({ default: module.TranscriptViewer }))
);

/**
 * Component that fetches and displays session transcript when expanded
 */
function ExpandedSessionContent({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading, error } = useSessionDetail(sessionId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Failed to load transcript: {error.message}
      </div>
    );
  }

  if (!session || !session.transcript || session.transcript.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No transcript available for this session.
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto">
      <Suspense fallback={
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      }>
        <TranscriptViewer transcript={session.transcript} />
      </Suspense>
    </div>
  );
}

export default function Dashboard() {
  const [showWizard, setShowWizard] = useState(false);
  const [hasReceivedHookEvent, setHasReceivedHookEvent] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const { data, isLoading, error } = useProjects(false);

  // Connect to SSE for real-time updates
  const { lastEvent } = useEventSource();

  // Flatten all sessions from all projects, filter to show only active sessions, and sort by lastActivity descending
  const sessions = (data?.projects || [])
    .flatMap(project => project.sessions)
    .filter(session => session.status === 'active')
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  // Track if we've received any hook events
  useEffect(() => {
    if (lastEvent?.type === 'hook') {
      setHasReceivedHookEvent(true);
      // Store in localStorage so we don't show wizard again
      localStorage.setItem('co11y:hasReceivedHookEvent', 'true');
    }
  }, [lastEvent]);

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('co11y:hasReceivedHookEvent');
    if (stored === 'true') {
      setHasReceivedHookEvent(true);
    } else {
      // Show wizard after a short delay if no hook events received
      const timer = setTimeout(() => {
        if (!hasReceivedHookEvent) {
          setShowWizard(true);
        }
      }, 3000); // Wait 3 seconds before showing wizard

      return () => clearTimeout(timer);
    }
  }, [hasReceivedHookEvent]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor Claude Code sessions in real-time
          </p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    toast.error('Failed to load sessions', {
      description: error.message,
    });
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500">Error loading sessions: {error.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor Claude Code sessions in real-time
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWizard(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Setup Hooks
        </Button>
      </div>

      {/* Sessions Cards */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No active sessions. Start a Claude Code session to see it appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            return (
              <Card key={session.id}>
                <CardHeader
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{session.project}</CardTitle>
                        <Badge className={cn(
                          "bg-green-500 text-white",
                          session.status === 'active' && "animate-pulse"
                        )}>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span>
                          Last activity: {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                        </span>
                        <span>{session.messageCount} messages</span>
                        <span>{session.toolCallCount} tool calls</span>
                        {session.model && <span className="font-mono">{session.model}</span>}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-6">
                    <ExpandedSessionContent sessionId={session.id} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Hooks Setup Wizard */}
      <Suspense fallback={null}>
        <HooksSetupWizard open={showWizard} onOpenChange={setShowWizard} />
      </Suspense>
    </div>
  );
}
