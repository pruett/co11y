import { formatTimeLabel } from '@/lib/timeline-utils';

interface TimeAxisProps {
  windowStart: number;
  windowEnd: number;
  pixelsPerSecond: number;
}

export function TimeAxis({ windowStart, windowEnd, pixelsPerSecond }: TimeAxisProps) {
  // Calculate time markers (every minute)
  const windowDurationMs = windowEnd - windowStart;
  const windowDurationMinutes = Math.ceil(windowDurationMs / 60000);
  const markerIntervalMs = 60000; // 1 minute

  const markers: { time: number; label: string; position: number }[] = [];

  // Start from the first minute boundary after windowStart
  const firstMarkerTime = Math.ceil(windowStart / markerIntervalMs) * markerIntervalMs;

  for (let i = 0; i <= windowDurationMinutes; i++) {
    const time = firstMarkerTime + i * markerIntervalMs;
    if (time >= windowStart && time <= windowEnd) {
      const offsetSeconds = (time - windowStart) / 1000;
      const position = offsetSeconds * pixelsPerSecond;
      markers.push({
        time,
        label: formatTimeLabel(time),
        position,
      });
    }
  }

  return (
    <div className="relative h-8 bg-muted/50 border-b border-border">
      {/* Fixed-width space to align with agent names */}
      <div className="absolute left-0 w-48 h-full border-r border-border bg-background flex items-center px-3">
        <span className="text-xs font-medium text-muted-foreground">Time</span>
      </div>

      {/* Timeline markers */}
      <div className="absolute left-48 right-0 h-full overflow-hidden">
        <div className="relative h-full">
          {markers.map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 h-full flex flex-col items-center"
              style={{ left: `${marker.position}px` }}
            >
              {/* Tick mark */}
              <div className="w-px h-2 bg-border" />
              {/* Time label */}
              <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
