import type { ToolCall } from '@co11y/shared';
import { cn } from '@/lib/utils';
import { timestampToPixels, durationToPixels, formatDuration } from '@/lib/timeline-utils';

interface ToolExecutionBlockProps {
  tool: ToolCall;
  windowStart: number;
  pixelsPerSecond: number;
  onClick?: () => void;
}

// Tool type color mapping - matches ToolCallTimeline
const getToolColor = (toolName: string): string => {
  const toolColors: Record<string, string> = {
    Read: 'bg-blue-500 dark:bg-blue-600',
    Write: 'bg-green-500 dark:bg-green-600',
    Edit: 'bg-yellow-500 dark:bg-yellow-600',
    Bash: 'bg-purple-500 dark:bg-purple-600',
    Glob: 'bg-pink-500 dark:bg-pink-600',
    Grep: 'bg-indigo-500 dark:bg-indigo-600',
    Task: 'bg-orange-500 dark:bg-orange-600',
    WebFetch: 'bg-cyan-500 dark:bg-cyan-600',
    WebSearch: 'bg-teal-500 dark:bg-teal-600',
    NotebookEdit: 'bg-amber-500 dark:bg-amber-600',
    KillShell: 'bg-red-500 dark:bg-red-600',
    TaskOutput: 'bg-lime-500 dark:bg-lime-600',
    Skill: 'bg-fuchsia-500 dark:bg-fuchsia-600',
    AskUserQuestion: 'bg-rose-500 dark:bg-rose-600',
    TodoWrite: 'bg-violet-500 dark:bg-violet-600',
  };

  return toolColors[toolName] || 'bg-gray-500 dark:bg-gray-600';
};

export function ToolExecutionBlock({
  tool,
  windowStart,
  pixelsPerSecond,
  onClick,
}: ToolExecutionBlockProps) {
  const leftOffset = timestampToPixels(tool.timestamp, windowStart, pixelsPerSecond);
  const width = tool.duration
    ? durationToPixels(tool.duration, pixelsPerSecond)
    : durationToPixels(1000, pixelsPerSecond); // Default 1s for pending tools

  // If the block is before the visible window, don't render
  if (leftOffset + width < 0) return null;

  const isError = tool.status === 'error';
  const isPending = tool.status === 'pending';

  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded-sm cursor-pointer transition-all hover:opacity-80',
        getToolColor(tool.name),
        isPending && 'animate-pulse',
        isError && 'ring-2 ring-red-500'
      )}
      style={{
        left: `${Math.max(leftOffset, 0)}px`,
        width: `${width}px`,
      }}
      onClick={onClick}
      title={`${tool.name}${tool.duration ? ` - ${formatDuration(tool.duration)}` : ' - Running'}`}
      role="button"
      tabIndex={0}
    >
      {/* Tool name label for wider blocks */}
      {width > 60 && (
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-[10px] font-medium text-white truncate">{tool.name}</span>
        </div>
      )}
    </div>
  );
}
