import { useMemo, useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AgentLaneData } from '@/hooks/useMonitorData';
import type { ToolCall } from '@co11y/shared';
import { AgentLane } from './AgentLane';
import { TimeAxis } from './TimeAxis';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { getTimeWindow, PIXELS_PER_SECOND, calculateTimelineWidth } from '@/lib/timeline-utils';

interface SwimlaneTimelineProps {
  agents: AgentLaneData[];
  onToolClick?: (tool: ToolCall) => void;
  onAgentClick?: (agent: AgentLaneData) => void;
}

export function SwimlaneTimeline({
  agents,
  onToolClick,
  onAgentClick,
}: SwimlaneTimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Time window configuration
  const { start: windowStart, end: windowEnd } = useMemo(() => getTimeWindow(10), []);
  const pixelsPerSecond = PIXELS_PER_SECOND;
  const timelineWidth = calculateTimelineWidth(10, pixelsPerSecond);

  // Virtualize agent lanes for performance with many agents
  const virtualizer = useVirtualizer({
    count: agents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Height of each lane (h-12 = 48px)
    overscan: 5, // Render 5 extra items above and below viewport
  });

  // Auto-scroll to keep "now" visible
  useEffect(() => {
    if (!autoScroll || !timelineRef.current) return;

    const scrollContainer = timelineRef.current;
    const now = Date.now();
    const nowPosition = ((now - windowStart) / 1000) * pixelsPerSecond;

    // Keep "now" centered or near the right edge
    const containerWidth = scrollContainer.clientWidth;
    const targetScrollLeft = Math.max(0, nowPosition - containerWidth + 200);

    scrollContainer.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });
  }, [windowStart, pixelsPerSecond, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  useEffect(() => {
    const scrollContainer = timelineRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setAutoScroll(false);
      clearTimeout(scrollTimeout);
      // Re-enable auto-scroll after 5 seconds of no interaction
      scrollTimeout = setTimeout(() => setAutoScroll(true), 5000);
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Time axis header */}
      <TimeAxis
        windowStart={windowStart}
        windowEnd={windowEnd}
        pixelsPerSecond={pixelsPerSecond}
      />

      {/* Agents + Timeline container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={timelineRef}
          className="absolute left-48 right-0 top-0 bottom-0 overflow-x-auto overflow-y-hidden"
        >
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, height: '100%' }}
          >
            {/* Current time indicator */}
            <CurrentTimeIndicator
              windowStart={windowStart}
              pixelsPerSecond={pixelsPerSecond}
            />
          </div>
        </div>

        {/* Virtualized agent lanes */}
        <div
          ref={parentRef}
          className="h-full overflow-y-auto"
          style={{ contain: 'strict' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const agent = agents[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  onClick={() => onAgentClick?.(agent)}
                >
                  <AgentLane
                    agent={agent}
                    windowStart={windowStart}
                    windowEnd={windowEnd}
                    pixelsPerSecond={pixelsPerSecond}
                    onToolClick={onToolClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="absolute bottom-4 right-4 bg-background/90 border border-border px-3 py-2 rounded-md shadow-lg text-xs">
          <span className="text-muted-foreground">Auto-scroll paused</span>
          <button
            onClick={() => setAutoScroll(true)}
            className="ml-2 text-primary hover:underline"
          >
            Resume
          </button>
        </div>
      )}
    </div>
  );
}
