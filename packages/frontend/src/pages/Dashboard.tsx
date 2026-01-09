import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { formatDistanceToNow } from 'date-fns';
import { useProjects } from '@/hooks/useApi';
import { useEventSource } from '@/hooks/useEventSource';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const HooksSetupWizard = lazy(() =>
  import('@/components/HooksSetupWizard').then(module => ({ default: module.HooksSetupWizard }))
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [hasReceivedHookEvent, setHasReceivedHookEvent] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data, isLoading, error } = useProjects(false);

  // Connect to SSE for real-time updates
  const { lastEvent } = useEventSource();

  const projects = data?.projects || [];

  // Keyboard shortcuts: j/k for navigation, Enter to open
  useHotkeys('j', () => {
    if (projects.length > 0) {
      setSelectedIndex((prev) => Math.min(prev + 1, projects.length - 1));
    }
  }, [projects.length]);

  useHotkeys('k', () => {
    if (projects.length > 0) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
  }, [projects.length]);

  useHotkeys('enter', () => {
    if (projects.length > 0 && projects[selectedIndex]) {
      navigate(`/project/${projects[selectedIndex].id}`);
    }
  }, [projects, selectedIndex, navigate]);

  // Reset selected index when projects change
  useEffect(() => {
    setSelectedIndex(0);
  }, [projects.length]);

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

      {/* Projects Table */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No projects found. Start using Claude Code to see projects appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Tool Calls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project, index) => (
                <TableRow
                  key={project.id}
                  data-state={index === selectedIndex ? 'selected' : undefined}
                  className={cn(
                    "cursor-pointer",
                    index === selectedIndex && "bg-muted"
                  )}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{project.name}</div>
                  </TableCell>
                  <TableCell className="text-right">{project.sessionCount}</TableCell>
                  <TableCell className="text-right">
                    {project.activeSessionCount > 0 ? (
                      <Badge className="bg-green-500 text-white">
                        {project.activeSessionCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">{project.totalMessages}</TableCell>
                  <TableCell className="text-right">{project.totalToolCalls}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Hooks Setup Wizard */}
      <Suspense fallback={null}>
        <HooksSetupWizard open={showWizard} onOpenChange={setShowWizard} />
      </Suspense>
    </div>
  );
}
