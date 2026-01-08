import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/hooks/useApi';
import { formatDistanceToNow } from 'date-fns';

export function StatsOverview() {
  const { data, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null; // Fail silently to not distract from main dashboard
  }

  const stats = data.stats;

  // Format total tokens with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Calculate days since first session
  const daysSinceFirstSession =
    stats.firstSessionDate && stats.firstSessionDate !== ''
      ? formatDistanceToNow(new Date(stats.firstSessionDate), { addSuffix: false })
      : 'N/A';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(stats.totalSessions)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Since {daysSinceFirstSession}
              </p>
            </CardContent>
          </Card>

          {/* Messages Today */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(stats.messagesToday)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.sessionsToday} sessions, {stats.toolCallsToday} tools
              </p>
            </CardContent>
          </Card>

          {/* Total Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(stats.totalMessages)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          {/* Tokens Used */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(stats.totalTokens)}</div>
              <p className="text-xs text-muted-foreground mt-1">All models combined</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Model Usage Breakdown */}
      {Object.keys(stats.modelUsage).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Model Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.modelUsage).map(([modelId, usage]) => {
              const modelName = modelId
                .replace('claude-', '')
                .replace(/-\d+$/, '')
                .split('-')
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join(' ');

              const totalTokens =
                usage.inputTokens +
                usage.outputTokens +
                usage.cacheReadInputTokens +
                usage.cacheCreationInputTokens;

              return (
                <Card key={modelId} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{modelName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatNumber(totalTokens)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Input:</span>
                        <span>{formatNumber(usage.inputTokens)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Output:</span>
                        <span>{formatNumber(usage.outputTokens)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Read:</span>
                        <span>{formatNumber(usage.cacheReadInputTokens)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
