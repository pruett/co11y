import { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { useEventSource, type UseEventSourceReturn } from '../hooks/useEventSource';

export interface ActivityIndicatorProps {
  /**
   * Optional override for testing - if provided, useEventSource won't be called
   */
  testStatus?: UseEventSourceReturn;
}

/**
 * ActivityIndicator component displays real-time activity status in the header
 * Shows SSE connection status and pulses on incoming hook events
 */
export function ActivityIndicator({ testStatus }: ActivityIndicatorProps = {}) {
  const hookResult = useEventSource();
  const { status, lastEvent } = testStatus || hookResult;
  const [shouldPulse, setShouldPulse] = useState(false);

  // Trigger pulse animation on hook events
  useEffect(() => {
    if (lastEvent?.type === 'hook') {
      setShouldPulse(true);
      // Remove pulse after animation completes (2 seconds)
      const timeout = setTimeout(() => {
        setShouldPulse(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [lastEvent]);

  // Map status to badge properties
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          label: 'Live',
          className: 'bg-green-500 text-white',
          showDot: true,
        };
      case 'connecting':
        return {
          label: 'Connecting',
          className: 'bg-yellow-500 text-white',
          showDot: true,
        };
      case 'disconnected':
        return {
          label: 'Disconnected',
          className: 'bg-gray-500 text-white',
          showDot: false,
        };
      case 'error':
        return {
          label: 'Error',
          className: 'bg-red-500 text-white',
          showDot: false,
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gray-500 text-white',
          showDot: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      variant="secondary"
      className={`${config.className} ${shouldPulse ? 'animate-pulse' : ''}`}
      data-status={status}
      data-pulsing={shouldPulse}
    >
      {config.showDot && (
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white" />
      )}
      {config.label}
    </Badge>
  );
}
