import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import SessionDetail from './SessionDetail'
import type { SessionDetail as SessionDetailType, SubagentsResponse } from '@co11y/shared'

// Mock the hooks
const mockUseParams = mock(() => ({ id: 'test-session-id' }))
const mockUseSessionDetail = mock(() => ({
  data: null,
  isLoading: true,
  error: null,
}))
const mockUseSubagents = mock(() => ({
  data: null,
  isLoading: false,
  error: null,
}))
const mockUseEventSource = mock(() => ({
  status: 'connected',
  lastEvent: null,
}))

// Mock react-router-dom
mock.module('react-router-dom', () => ({
  useParams: mockUseParams,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the API hooks
mock.module('@/hooks/useApi', () => ({
  useSessionDetail: mockUseSessionDetail,
  useSubagents: mockUseSubagents,
}))

// Mock the SSE hook
mock.module('@/hooks/useEventSource', () => ({
  useEventSource: mockUseEventSource,
}))

// Helper to wrap component with router
function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('SessionDetail', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseParams.mockReturnValue({ id: 'test-session-id' })
    mockUseSessionDetail.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })
    mockUseSubagents.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })
    mockUseEventSource.mockReturnValue({
      status: 'connected',
      lastEvent: null,
    })
  })

  it('should render loading state', () => {
    mockUseSessionDetail.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)
    expect(container.textContent).toContain('Loading session details')
  })

  it('should render error state when session fetch fails', () => {
    mockUseSessionDetail.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    })

    const { container } = renderWithRouter(<SessionDetail />)
    expect(container.textContent).toContain('Error loading session details')
  })

  it('should render error state when session is null', () => {
    mockUseSessionDetail.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)
    expect(container.textContent).toContain('Error loading session details')
  })

  it('should render session details with all tabs', () => {
    const mockSession: SessionDetailType = {
      id: 'test-session-id',
      project: 'Test Project',
      projectPath: '/Users/test/project',
      status: 'active',
      lastActivity: new Date().toISOString(),
      messageCount: 10,
      toolCallCount: 5,
      subagentCount: 2,
      transcript: [],
      model: 'claude-3-opus',
      cwd: '/Users/test/project',
      gitBranch: 'main',
      slug: 'test-slug',
    }

    mockUseSessionDetail.mockReturnValue({
      data: mockSession,
      isLoading: false,
      error: null,
    })

    mockUseSubagents.mockReturnValue({
      data: { subagents: [] } as SubagentsResponse,
      isLoading: false,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)

    // Check that key content is rendered
    expect(container.textContent).toContain('Test Project')
    expect(container.textContent).toContain('/Users/test/project')
    expect(container.textContent).toContain('Overview')
    expect(container.textContent).toContain('Tools')
    expect(container.textContent).toContain('Subagents')
    expect(container.textContent).toContain('Messages')
    expect(container.textContent).toContain('Tool Calls')
    expect(container.textContent).toContain('Session ID:')
    expect(container.textContent).toContain('Model:')
    expect(container.textContent).toContain('claude-3-opus')
    expect(container.textContent).toContain('Git Branch:')
    expect(container.textContent).toContain('main')
  })

  it('should render subagents data when available', () => {
    const mockSession: SessionDetailType = {
      id: 'test-session-id',
      project: 'Test Project',
      projectPath: '/Users/test/project',
      status: 'active',
      lastActivity: new Date().toISOString(),
      messageCount: 10,
      toolCallCount: 5,
      subagentCount: 2,
      transcript: [],
    }

    const mockSubagentsData: SubagentsResponse = {
      subagents: [
        {
          agentId: 'agent-123',
          sessionId: 'test-session-id',
          status: 'running',
          startTime: new Date().toISOString(),
          messageCount: 3,
          toolCallCount: 2,
          task: 'Test subagent task',
          currentTool: 'Read',
        },
        {
          agentId: 'agent-456',
          sessionId: 'test-session-id',
          status: 'completed',
          startTime: new Date(Date.now() - 60000).toISOString(),
          endTime: new Date().toISOString(),
          messageCount: 5,
          toolCallCount: 3,
          task: 'Another task',
          duration: 60000,
        },
      ],
    }

    mockUseSessionDetail.mockReturnValue({
      data: mockSession,
      isLoading: false,
      error: null,
    })

    mockUseSubagents.mockReturnValue({
      data: mockSubagentsData,
      isLoading: false,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)

    // Check subagent tasks are rendered
    expect(container.textContent).toContain('Test subagent task')
    expect(container.textContent).toContain('Another task')
    expect(container.textContent).toContain('Duration: 60s')
  })

  it('should show empty state when no subagents exist', () => {
    const mockSession: SessionDetailType = {
      id: 'test-session-id',
      project: 'Test Project',
      projectPath: '/Users/test/project',
      status: 'active',
      lastActivity: new Date().toISOString(),
      messageCount: 10,
      toolCallCount: 5,
      subagentCount: 0,
      transcript: [],
    }

    mockUseSessionDetail.mockReturnValue({
      data: mockSession,
      isLoading: false,
      error: null,
    })

    mockUseSubagents.mockReturnValue({
      data: { subagents: [] } as SubagentsResponse,
      isLoading: false,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)
    expect(container.textContent).toContain('No subagents found for this session')
  })

  it('should render session without optional fields', () => {
    const mockSession: SessionDetailType = {
      id: 'test-session-id',
      project: 'Test Project',
      projectPath: '/Users/test/project',
      status: 'idle',
      messageCount: 0,
      toolCallCount: 0,
      subagentCount: 0,
      transcript: [],
      // No model, cwd, gitBranch, slug, or lastActivity
    }

    mockUseSessionDetail.mockReturnValue({
      data: mockSession,
      isLoading: false,
      error: null,
    })

    mockUseSubagents.mockReturnValue({
      data: { subagents: [] } as SubagentsResponse,
      isLoading: false,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)

    // Should render basic info
    expect(container.textContent).toContain('Test Project')
    expect(container.textContent).toContain('Session ID:')
    expect(container.textContent).toContain('test-session-id')

    // Should not show optional fields
    expect(container.textContent).not.toContain('Model:')
    expect(container.textContent).not.toContain('Slug:')
  })

  it('should connect to SSE for real-time updates', () => {
    const mockSession: SessionDetailType = {
      id: 'test-session-id',
      project: 'Test Project',
      projectPath: '/Users/test/project',
      status: 'active',
      messageCount: 10,
      toolCallCount: 5,
      subagentCount: 0,
      transcript: [],
    }

    mockUseSessionDetail.mockReturnValue({
      data: mockSession,
      isLoading: false,
      error: null,
    })

    renderWithRouter(<SessionDetail />)

    // Verify useEventSource was called
    expect(mockUseEventSource).toHaveBeenCalled()
  })

  it('should handle missing session ID param', () => {
    mockUseParams.mockReturnValue({ id: undefined })

    mockUseSessionDetail.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    const { container } = renderWithRouter(<SessionDetail />)

    // Should show error state
    expect(container.textContent).toContain('Error loading session details')
  })
})
