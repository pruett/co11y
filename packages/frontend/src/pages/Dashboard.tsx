import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { SessionCard } from '@/components/SessionCard';
import { useSessions } from '@/hooks/useApi';
import { useEventSource } from '@/hooks/useEventSource';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

const StatsOverview = lazy(() =>
  import('@/components/StatsOverview').then(module => ({ default: module.StatsOverview }))
);
const HooksSetupWizard = lazy(() =>
  import('@/components/HooksSetupWizard').then(module => ({ default: module.HooksSetupWizard }))
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [hasReceivedHookEvent, setHasReceivedHookEvent] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data, isLoading, error } = useSessions(showActiveOnly);

  // Connect to SSE for real-time updates
  const { lastEvent } = useEventSource();

  const sessions = data?.sessions || [];

  // Keyboard shortcuts: j/k for navigation, Enter to open
  useHotkeys('j', () => {
    if (sessions.length > 0) {
      setSelectedIndex((prev) => Math.min(prev + 1, sessions.length - 1));
    }
  }, [sessions.length]);

  useHotkeys('k', () => {
    if (sessions.length > 0) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
  }, [sessions.length]);

  useHotkeys('enter', () => {
    if (sessions.length > 0 && sessions[selectedIndex]) {
      navigate(`/session/${sessions[selectedIndex].id}`);
    }
  }, [sessions, selectedIndex, navigate]);

  // Reset selected index when sessions change or filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [sessions.length, showActiveOnly]);

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

  const total = data?.total || 0;
  const activeCount = data?.activeCount || 0;
  const totalSubagents = useMemo(
    () => sessions.reduce((sum, session) => sum + session.subagentCount, 0),
    [sessions]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor Claude Code sessions in real-time
        </p>
      </div>

      {/* Stats Overview */}
      <div className="mb-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          }
        >
          <StatsOverview />
        </Suspense>
      </div>

      {/* Session Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subagents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubagents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button
            variant={!showActiveOnly ? 'default' : 'outline'}
            onClick={() => setShowActiveOnly(false)}
          >
            All Sessions
          </Button>
          <Button
            variant={showActiveOnly ? 'default' : 'outline'}
            onClick={() => setShowActiveOnly(true)}
          >
            Active Only
          </Button>
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

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {showActiveOnly
                ? 'No active sessions found.'
                : 'No sessions found. Start using Claude Code to see sessions appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session, index) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={index === selectedIndex}
            />
          ))}
        </div>
      )}

      {/* Hooks Setup Wizard */}
      <Suspense fallback={null}>
        <HooksSetupWizard open={showWizard} onOpenChange={setShowWizard} />
      </Suspense>
    </div>
  );
}
