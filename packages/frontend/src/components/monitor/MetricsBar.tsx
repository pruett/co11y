import type { MonitorData } from '@/hooks/useMonitorData';
import { TokenUsageGauge } from './TokenUsageGauge';
import { Badge } from '../ui/badge';
import { Activity, Zap, AlertTriangle } from 'lucide-react';

interface MetricsBarProps {
  data: MonitorData;
}

export function MetricsBar({ data }: MetricsBarProps) {
  const totalAgents = data.allAgents.length;
  const { runningCount, completedCount, errorCount, totalTokens } = data;

  return (
    <div className="bg-background border-b border-border py-4 px-6">
      <div className="flex items-center justify-between gap-8">
        {/* Left: Token usage gauges */}
        <div className="flex items-center gap-6">
          <TokenUsageGauge
            used={totalTokens.input}
            label="Input"
            color="hsl(var(--primary))"
          />
          <TokenUsageGauge
            used={totalTokens.output}
            label="Output"
            color="hsl(var(--chart-2))"
          />
          <TokenUsageGauge
            used={totalTokens.cacheRead}
            label="Cache"
            color="hsl(var(--chart-3))"
          />
        </div>

        {/* Right: Agent status and counters */}
        <div className="flex items-center gap-6">
          {/* Agent count */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalAgents}</span>
            </div>
            <span className="text-xs text-muted-foreground">Agents</span>
          </div>

          {/* Status breakdown */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                {runningCount} Running
              </Badge>
              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                {completedCount} Completed
              </Badge>
              {errorCount > 0 && (
                <Badge className="bg-red-500 hover:bg-red-600 text-white">
                  {errorCount} Error
                </Badge>
              )}
            </div>
          </div>

          {/* Tool calls */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{data.session.toolCallCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Tool Calls</span>
          </div>

          {/* Error indicator */}
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">Errors Detected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
