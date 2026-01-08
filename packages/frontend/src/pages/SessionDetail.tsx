import { useParams, Link, useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useSessionDetail, useSubagents } from '@/hooks/useApi'
import { useEventSource } from '@/hooks/useEventSource'
import { formatDistanceToNow } from 'date-fns'
import { ToolCallTimeline } from '@/components/ToolCallTimeline'
import { SubagentBadge } from '@/components/SubagentBadge'
import { SubagentList } from '@/components/SubagentList'
import { TranscriptViewer } from '@/components/TranscriptViewer'
import { SessionDetailSkeleton } from '@/components/skeletons/SessionDetailSkeleton'
import { toast } from 'sonner'

export default function SessionDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSessionDetail(id || '')
  const { data: subagentsData } = useSubagents(id || '')

  // Connect to SSE for real-time updates
  useEventSource()

  // Keyboard shortcut: Escape to return to dashboard
  useHotkeys('escape', () => {
    navigate('/')
  }, [navigate])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
        <SessionDetailSkeleton />
      </div>
    )
  }

  if (error || !session) {
    toast.error('Failed to load session details', {
      description: error?.message || 'Session not found',
    });
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Error loading session details</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const subagents = subagentsData?.subagents || []

  return (
    <div className="p-6">
      {/* Header with back navigation */}
      <div className="mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Session Info Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{session.project}</h1>
          <Badge
            variant={session.status === 'active' ? 'default' : 'secondary'}
            className={session.status === 'active' ? 'bg-green-500 animate-pulse' : ''}
          >
            {session.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground font-mono">{session.projectPath}</p>
        {session.lastActivity && (
          <p className="text-sm text-muted-foreground">
            Last activity: {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transcript">
            Transcript
            <Badge variant="secondary" className="ml-2">
              {session.messageCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="subagents">
            Subagents
            {subagents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {subagents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.messageCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tool Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.toolCallCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Subagents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.subagentCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={session.status === 'active' ? 'default' : 'secondary'}
                  className={session.status === 'active' ? 'bg-green-500' : ''}
                >
                  {session.status}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Session Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Session ID:</div>
                <div className="font-mono">{session.id}</div>

                {session.model && (
                  <>
                    <div className="text-muted-foreground">Model:</div>
                    <div className="font-mono">{session.model}</div>
                  </>
                )}

                {session.cwd && (
                  <>
                    <div className="text-muted-foreground">Working Directory:</div>
                    <div className="font-mono text-xs">{session.cwd}</div>
                  </>
                )}

                {session.gitBranch && (
                  <>
                    <div className="text-muted-foreground">Git Branch:</div>
                    <div className="font-mono">{session.gitBranch}</div>
                  </>
                )}

                {session.slug && (
                  <>
                    <div className="text-muted-foreground">Slug:</div>
                    <div className="font-mono">{session.slug}</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptViewer transcript={session.transcript} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>Tool Call Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ToolCallTimeline transcript={session.transcript} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subagents Tab */}
        <TabsContent value="subagents">
          <Card>
            <CardHeader>
              <CardTitle>Subagents</CardTitle>
            </CardHeader>
            <CardContent>
              <SubagentList subagents={subagents} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
