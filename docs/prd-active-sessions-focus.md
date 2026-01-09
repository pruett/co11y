# PRD: Active Sessions Focus UI

## Overview
Refocus the Co11y UI to display only active sessions and projects, with an expandable card experience on the project detail page that shows session transcripts inline.

---

## Requirements

### 1. Dashboard (Root Route `/`)

**Current State:**
- Shows all projects in a table with metadata
- Displays StatsOverview component (token usage, model breakdown, daily activity)
- Shows 4 summary stat cards (Projects, Total Sessions, Active Sessions, Active Subagents)
- Has "All Projects" / "Active Only" filter toggle

**New Behavior:**
- **Only show projects that have at least 1 active session** (filter where `activeSessionCount > 0`)
- **Remove the StatsOverview component** (token usage, model breakdown)
- **Remove the 4 summary stat cards** (Projects, Total Sessions, etc.)
- **Remove the filter toggle** (no longer needed - always showing active only)
- Keep the projects table with existing columns

**File to modify:**
- `packages/frontend/src/pages/Dashboard.tsx`

---

### 2. Project Detail Page (`/project/:projectId`) - Active Sessions Only

**Current State:**
- Shows all sessions (active and idle) in a table
- Clicking a session row navigates to `/session/:id`
- Shows 4 project summary stat cards

**New Behavior:**
- **Only show sessions where `status === 'active'`**
- **Remove the 4 project summary stat cards**
- **Remove the ability to view idle sessions entirely** (no toggle)

**File to modify:**
- `packages/frontend/src/pages/ProjectDetail.tsx`

---

### 3. Project Detail Page - Expandable Session Cards with Transcript

**Current State:**
- Sessions displayed in a basic table
- Click navigates to session detail page

**New Behavior:**
- Replace table with **expandable card/accordion pattern**
- Clicking a session row **expands inline** to reveal the session transcript (no navigation)
- Only one session expanded at a time (accordion behavior)
- The expanded content reuses the existing `TranscriptViewer` component

**UI Pattern:**
```
┌─────────────────────────────────────────────────────┐
│ [●] Session - Last Activity: 2 mins ago             │  <- Click to expand/collapse
│ Messages: 45 | Tool Calls: 12 | Model: claude-sonnet│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐  <- Expanded session
│ [▼] Session - Last Activity: 30 secs ago            │
│ Messages: 23 | Tool Calls: 8 | Model: claude-sonnet │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ [User Icon] User           2 mins ago           │ │
│ │ Help me implement the login feature...          │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Bot Icon] Assistant       1 min ago    sonnet  │ │
│ │ I'll help you implement login. Let me...        │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ [>] Read  [Tool Call]                       │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────┘ │
│ ... (scrollable)                                    │
└─────────────────────────────────────────────────────┘
```

**Data Fetching:**
- When a session is expanded, fetch full session detail including transcript via `useSessionDetail(sessionId)`
- Reuse existing `TranscriptViewer` component to render the transcript

**File to modify:**
- `packages/frontend/src/pages/ProjectDetail.tsx`

**Components to reuse:**
- `packages/frontend/src/components/TranscriptViewer.tsx` (existing)

---

### 4. Session Sorting & Auto-Expand

**Behavior:**
- Sessions sorted by `lastActivity` **descending** (most recent first)
- The **first/most recent session is automatically expanded** on page load

**Implementation:**
```typescript
// Sort sessions by most recent first
const sortedSessions = activeSessions.sort(
  (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
)

// Auto-expand first session
const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

useEffect(() => {
  if (sortedSessions.length > 0 && expandedSessionId === null) {
    setExpandedSessionId(sortedSessions[0].id)
  }
}, [sortedSessions])
```

---

## Technical Implementation

### Component Structure

```tsx
// ProjectDetail.tsx
function ProjectDetail() {
  const { id } = useParams()
  const { data } = useProject(id!)

  // Filter and sort active sessions
  const activeSessions = useMemo(() => {
    const sessions = data?.project?.sessions || []
    return sessions
      .filter(s => s.status === 'active')
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }, [data])

  // Track expanded session (auto-expand first)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (activeSessions.length > 0 && expandedId === null) {
      setExpandedId(activeSessions[0].id)
    }
  }, [activeSessions, expandedId])

  return (
    <div>
      {activeSessions.map(session => (
        <ExpandableSessionCard
          key={session.id}
          session={session}
          isExpanded={expandedId === session.id}
          onToggle={() => setExpandedId(
            expandedId === session.id ? null : session.id
          )}
        />
      ))}
    </div>
  )
}
```

```tsx
// ExpandableSessionCard (inline or new component)
function ExpandableSessionCard({ session, isExpanded, onToggle }) {
  // Only fetch detail when expanded
  const { data: sessionDetail } = useSessionDetail(
    isExpanded ? session.id : ''
  )

  return (
    <Card>
      <CardHeader onClick={onToggle} className="cursor-pointer">
        {/* Session summary row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
            <Badge className="bg-green-500">active</Badge>
            <span>Last activity: {formatDistanceToNow(...)}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Messages: {session.messageCount}</span>
            <span>Tool Calls: {session.toolCallCount}</span>
            <span className="font-mono">{session.model}</span>
          </div>
        </div>
      </CardHeader>

      {isExpanded && sessionDetail && (
        <CardContent className="max-h-[500px] overflow-auto">
          <TranscriptViewer transcript={sessionDetail.transcript} />
        </CardContent>
      )}
    </Card>
  )
}
```

### Existing APIs Used

| API | Purpose |
|-----|---------|
| `GET /api/projects/:id` | Get project with sessions list |
| `GET /api/sessions/:id` | Get session detail with transcript (when expanded) |

### Existing Components Reused

| Component | Location | Purpose |
|-----------|----------|---------|
| `TranscriptViewer` | `packages/frontend/src/components/TranscriptViewer.tsx` | Renders conversation with messages, tool calls, syntax highlighting |

---

## Files Summary

**Modified:**
- `packages/frontend/src/pages/Dashboard.tsx` - Remove metadata, filter active-only projects
- `packages/frontend/src/pages/ProjectDetail.tsx` - Expandable cards, active-only filter, transcript display

**No new files required** - reuse existing `TranscriptViewer` component

---

## Verification Plan

1. **Dashboard filtering**: Navigate to `/`, verify only projects with active sessions appear
2. **Removed Dashboard metadata**: Confirm StatsOverview and 4 stat cards are removed
3. **Project detail filtering**: Navigate to `/project/:id`, verify only active sessions shown
4. **Removed Project stat cards**: Confirm 4 summary cards are removed from project detail
5. **Expandable behavior**: Click a session row, verify it expands inline (no navigation)
6. **Accordion behavior**: Expand second session, verify first collapses
7. **Auto-expand**: Refresh project page, verify most recent active session is expanded by default
8. **Sorting**: Verify sessions are ordered by most recent activity first
9. **Transcript display**: Verify expanded session shows full transcript with:
   - User/Assistant message cards
   - Tool call sections (expandable)
   - Tool results
   - Syntax-highlighted code blocks
10. **Scrolling**: Verify transcript area is scrollable when content exceeds max height
11. **Data loading**: Verify transcript only loads when session is expanded (check network tab)
