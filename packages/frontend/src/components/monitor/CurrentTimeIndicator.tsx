import { useEffect, useState } from 'react';

interface CurrentTimeIndicatorProps {
  windowStart: number;
  pixelsPerSecond: number;
}

export function CurrentTimeIndicator({
  windowStart,
  pixelsPerSecond,
}: CurrentTimeIndicatorProps) {
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = Date.now();
      const offsetSeconds = (now - windowStart) / 1000;
      const position = offsetSeconds * pixelsPerSecond;
      setCurrentPosition(position);
    };

    // Update immediately
    updatePosition();

    // Update every second
    const interval = setInterval(updatePosition, 1000);

    return () => clearInterval(interval);
  }, [windowStart, pixelsPerSecond]);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none transition-all duration-1000 ease-linear"
      style={{ left: `${currentPosition}px` }}
    >
      {/* Arrow indicator at the top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-red-500" />
      </div>

      {/* Pulse effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />

      {/* Label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">
        NOW
      </div>
    </div>
  );
}
