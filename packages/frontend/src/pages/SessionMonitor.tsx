import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ToolCall } from '@co11y/shared';
import type { AgentLaneData } from '@/hooks/useMonitorData';
import { useMonitorData } from '@/hooks/useMonitorData';
import { SwimlaneTimeline } from '@/components/monitor/SwimlaneTimeline';
import { MetricsBar } from '@/components/monitor/MetricsBar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatElapsedTime } from '@/lib/timeline-utils';
import { ArrowLeft, Activity } from 'lucide-react';

export default function SessionMonitor() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useMonitorData(id || '');
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentLaneData | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!data?.session.createdAt) return;

    const updateElapsed = () => {
      const start = new Date(data.session.createdAt!).getTime();
      const now = Date.now();
      setElapsedTime(now - start);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [data?.session.createdAt]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session monitor...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500">Failed to load session data</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const { session } = data;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/session/${id}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Activity className="h-6 w-6" />
                Live Monitor
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {session.slug || session.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status badge */}
            <Badge
              className={
                session.status === 'active'
                  ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }
            >
              {session.status}
            </Badge>

            {/* Elapsed time */}
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Elapsed Time</span>
              <span className="text-lg font-mono font-bold">
                {formatElapsedTime(elapsedTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <MetricsBar data={data} />

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <SwimlaneTimeline
          agents={data.allAgents}
          onToolClick={setSelectedTool}
          onAgentClick={setSelectedAgent}
        />
      </div>

      {/* Detail panel (slide-out) */}
      {(selectedTool || selectedAgent) && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-background border-l border-border shadow-xl z-20 overflow-y-auto">
          <div className="p-6">
            <button
              onClick={() => {
                setSelectedTool(null);
                setSelectedAgent(null);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>

            {selectedTool && (
              <Card>
                <CardHeader>
                  <CardTitle>Tool: {selectedTool.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Status</h4>
                    <Badge
                      className={
                        selectedTool.status === 'success'
                          ? 'bg-green-500'
                          : selectedTool.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }
                    >
                      {selectedTool.status}
                    </Badge>
                  </div>

                  {selectedTool.duration && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Duration</h4>
                      <p className="text-sm">{formatElapsedTime(selectedTool.duration)}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Input</h4>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedTool.input, null, 2)}
                    </pre>
                  </div>

                  {selectedTool.output !== undefined && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        {selectedTool.status === 'error' ? 'Error' : 'Output'}
                      </h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-64">
                        {typeof selectedTool.output === 'string'
                          ? selectedTool.output
                          : JSON.stringify(selectedTool.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedAgent && !selectedTool && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent: {selectedAgent.agentId}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Status</h4>
                    <Badge
                      className={
                        selectedAgent.status === 'running'
                          ? 'bg-blue-500 animate-pulse'
                          : selectedAgent.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }
                    >
                      {selectedAgent.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Task</h4>
                    <p className="text-sm">{selectedAgent.task}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Stats</h4>
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Messages:</dt>
                        <dd className="font-medium">{selectedAgent.messageCount}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tool Calls:</dt>
                        <dd className="font-medium">{selectedAgent.toolCallCount}</dd>
                      </div>
                    </dl>
                  </div>

                  {selectedAgent.currentTool && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Current Tool</h4>
                      <Badge>{selectedAgent.currentTool}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
