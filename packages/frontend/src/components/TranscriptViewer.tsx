import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TranscriptRecord, MessageContent } from '@co11y/shared'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, User, Bot, Terminal } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatDistanceToNow } from 'date-fns'

interface TranscriptViewerProps {
  transcript: TranscriptRecord[]
}

interface ToolCallState {
  [key: string]: boolean
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [expandedTools, setExpandedTools] = useState<ToolCallState>({})
  const parentRef = useRef<HTMLDivElement>(null)

  // Filter out queue-operation records and only show user/assistant messages
  const messages = useMemo(() => {
    return transcript.filter((record) => record.type === 'user' || record.type === 'assistant')
  }, [transcript])

  // Virtual scrolling for performance with large transcripts
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated height of each message
    overscan: 5, // Number of items to render outside visible area
  })

  const toggleTool = (toolId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }))
  }

  const renderToolUse = (content: MessageContent, recordId: string) => {
    if (content.type !== 'tool_use') return null

    const toolId = `${recordId}-${content.id}`
    const isExpanded = expandedTools[toolId]

    return (
      <div key={content.id} className="mt-2 border rounded-lg bg-muted/50">
        <button
          onClick={() => toggleTool(toolId)}
          className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors text-left"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          <Terminal className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">{content.name}</span>
          <Badge variant="outline" className="ml-auto">
            Tool Call
          </Badge>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Input:</p>
              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(content.input, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderToolResult = (content: MessageContent) => {
    if (content.type !== 'tool_result') return null

    return (
      <div key={content.tool_use_id} className="mt-2 border rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Tool Result</span>
          {content.is_error && (
            <Badge variant="destructive" className="ml-auto">
              Error
            </Badge>
          )}
        </div>
        <pre className="bg-background p-2 rounded text-xs overflow-x-auto max-h-96">
          {typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2)}
        </pre>
      </div>
    )
  }

  const renderTextContent = (content: MessageContent) => {
    if (content.type !== 'text') return null

    // Check if the text contains code blocks (markdown-style)
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content.text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.text.substring(lastIndex, match.index)
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {textBefore}
          </p>
        )
      }

      // Add code block with syntax highlighting
      const language = match[1] || 'text'
      const code = match[2]
      parts.push(
        <div key={`code-${match.index}`} className="my-2">
          <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: '0.5rem' }}>
            {code}
          </SyntaxHighlighter>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last code block
    if (lastIndex < content.text.length) {
      const textAfter = content.text.substring(lastIndex)
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {textAfter}
        </p>
      )
    }

    return parts.length > 0 ? <div>{parts}</div> : <p className="whitespace-pre-wrap">{content.text}</p>
  }

  const renderMessage = (record: TranscriptRecord, index: number) => {
    if (record.type === 'queue-operation') return null

    const isUser = record.type === 'user'
    const message = record.message
    const content = typeof message.content === 'string' ? [{ type: 'text' as const, text: message.content }] : message.content

    return (
      <div key={record.uuid || index} className="mb-4">
        <Card className={`p-4 ${isUser ? 'bg-accent/30' : 'bg-card'}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary' : 'bg-muted'}`}>
              {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{isUser ? 'User' : 'Assistant'}</span>
                {record.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                  </span>
                )}
                {!isUser && record.message.model && (
                  <Badge variant="outline" className="ml-auto text-xs font-mono">
                    {record.message.model}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {content.map((item, idx) => (
                  <div key={idx}>
                    {item.type === 'text' && renderTextContent(item)}
                    {item.type === 'tool_use' && renderToolUse(item, record.uuid || `${index}`)}
                    {item.type === 'tool_result' && renderToolResult(item)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No messages in this transcript yet.
      </div>
    )
  }

  // Use virtual scrolling for performance when there are many messages
  if (messages.length > 50) {
    return (
      <div ref={parentRef} className="h-[600px] overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const record = messages[virtualItem.index]
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
              >
                {renderMessage(record, virtualItem.index)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // For smaller transcripts, render all messages without virtualization
  return (
    <div className="space-y-4">
      {messages.map((record, index) => renderMessage(record, index))}
    </div>
  )
}
