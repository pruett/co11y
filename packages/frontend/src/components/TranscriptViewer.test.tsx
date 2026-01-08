import { describe, it, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { TranscriptViewer } from './TranscriptViewer'
import type { TranscriptRecord, UserTranscriptRecord, AssistantTranscriptRecord } from '@co11y/shared'

describe('TranscriptViewer', () => {
  it('renders empty state when no messages', () => {
    const { container } = render(<TranscriptViewer transcript={[]} />)
    expect(container.textContent).toContain('No messages in this transcript yet')
  })

  it('renders user message', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello, assistant!',
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-1',
        timestamp: new Date().toISOString(),
      } as UserTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('User')
    expect(container.textContent).toContain('Hello, assistant!')
  })

  it('renders assistant message', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Hello! How can I help you?',
            },
          ],
          model: 'claude-sonnet-4',
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-1',
        timestamp: new Date().toISOString(),
        requestId: 'req-1',
      } as AssistantTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Assistant')
    expect(container.textContent).toContain('Hello! How can I help you?')
    expect(container.textContent).toContain('claude-sonnet-4')
  })

  it('renders tool use content', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test/file.txt' },
            },
          ],
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-2',
        timestamp: new Date().toISOString(),
        requestId: 'req-2',
      } as AssistantTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('Tool Call')
  })

  it('renders tool result content', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: 'File contents here',
            },
          ],
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-2',
        timestamp: new Date().toISOString(),
      } as UserTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Tool Result')
    expect(container.textContent).toContain('File contents here')
  })

  it('renders tool result with error', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: 'Error: File not found',
              is_error: true,
            },
          ],
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-3',
        timestamp: new Date().toISOString(),
      } as UserTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Error')
  })

  it('filters out queue-operation records', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'queue-operation',
        operation: 'enqueue',
        timestamp: new Date().toISOString(),
        sessionId: 'test-session',
        content: 'test',
      },
      {
        type: 'user',
        message: {
          role: 'user',
          content: 'Test message',
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-4',
        timestamp: new Date().toISOString(),
      } as UserTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Test message')
    // Should not render queue-operation content
    expect(container.textContent).not.toContain('enqueue')
  })

  it('renders multiple messages in order', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: 'First message',
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-5',
        timestamp: new Date().toISOString(),
      } as UserTranscriptRecord,
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Second message',
            },
          ],
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-3',
        timestamp: new Date().toISOString(),
        requestId: 'req-3',
      } as AssistantTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('First message')
    expect(container.textContent).toContain('Second message')
  })

  it('renders code blocks with syntax highlighting', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Here is some code:\n```javascript\nconst x = 42;\nconsole.log(x);\n```',
            },
          ],
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-4',
        timestamp: new Date().toISOString(),
        requestId: 'req-4',
      } as AssistantTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Here is some code')
    // The code should be rendered with syntax highlighting
    expect(container.textContent).toContain('const x = 42')
    expect(container.textContent).toContain('console.log(x)')
  })

  it('renders mixed text and tool use in same message', () => {
    const transcript: TranscriptRecord[] = [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me read that file.',
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'Read',
              input: { file_path: '/test.txt' },
            },
          ],
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'assistant-5',
        timestamp: new Date().toISOString(),
        requestId: 'req-5',
      } as AssistantTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    expect(container.textContent).toContain('Let me read that file')
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('Tool Call')
  })

  it('renders timestamps with relative formatting', () => {
    const recentTime = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
    const transcript: TranscriptRecord[] = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: 'Recent message',
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test',
        sessionId: 'test-session',
        version: '1.0',
        gitBranch: 'main',
        uuid: 'user-6',
        timestamp: recentTime.toISOString(),
      } as UserTranscriptRecord,
    ]

    const { container } = render(<TranscriptViewer transcript={transcript} />)
    // Should show relative time like "2 minutes ago"
    expect(container.textContent).toMatch(/ago/)
  })
})
