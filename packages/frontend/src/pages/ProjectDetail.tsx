import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { formatDistanceToNow } from 'date-fns';
import { useProject } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data, isLoading, error } = useProject(id!);

  const project = data?.project;
  // Filter to show only active sessions
  const sessions = (project?.sessions || []).filter(session => session.status === 'active');

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

  // Reset selected index when sessions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [sessions.length]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !project) {
    toast.error('Failed to load project', {
      description: error?.message || 'Project not found',
    });
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500">
              {error?.message || 'Project not found'}
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        <p className="text-muted-foreground">{project.fullPath}</p>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                No active sessions for this project.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead className="text-right">Tool Calls</TableHead>
                    <TableHead className="text-right">Subagents</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session, index) => (
                    <TableRow
                      key={session.id}
                      data-state={index === selectedIndex ? 'selected' : undefined}
                      className={cn(
                        "cursor-pointer",
                        index === selectedIndex && "bg-muted"
                      )}
                      onClick={() => navigate(`/session/${session.id}`)}
                    >
                      <TableCell>
                        <Badge
                          variant={session.status === 'active' ? 'default' : 'secondary'}
                          className={cn(
                            session.status === 'active' &&
                              'bg-green-500 text-white animate-pulse'
                          )}
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">{session.messageCount}</TableCell>
                      <TableCell className="text-right">{session.toolCallCount}</TableCell>
                      <TableCell className="text-right">{session.subagentCount}</TableCell>
                      <TableCell>
                        {session.model ? (
                          <span className="font-mono text-xs">{session.model}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.gitBranch ? (
                          <span className="font-mono text-xs truncate max-w-[150px] block">
                            {session.gitBranch}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
