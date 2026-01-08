import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SSEEvent } from '@co11y/shared';
import { queryKeys } from './useApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface UseEventSourceReturn {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  lastEvent: SSEEvent | null;
}

/**
 * Hook for connecting to Server-Sent Events endpoint
 * Automatically reconnects on disconnect and updates React Query cache
 */
export function useEventSource(): UseEventSourceReturn {
  const [status, setStatus] = useState<UseEventSourceReturn['status']>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      try {
        const eventSource = new EventSource(`${API_BASE_URL}/api/events`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          if (!isMounted) return;
          setStatus('connected');
          setError(null);
          reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        };

        // Handle hook events
        eventSource.addEventListener('hook', (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = { type: 'hook', data };
            setLastEvent(sseEvent);

            // Invalidate relevant queries on hook events
            // This triggers a refetch of session data
            queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
          } catch (err) {
            console.error('Failed to parse hook event:', err);
          }
        });

        // Handle sessions update events
        eventSource.addEventListener('sessions', (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = { type: 'sessions', data };
            setLastEvent(sseEvent);

            // Invalidate sessions queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
          } catch (err) {
            console.error('Failed to parse sessions event:', err);
          }
        });

        // Handle heartbeat events
        eventSource.addEventListener('heartbeat', (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = { type: 'heartbeat', timestamp: data.timestamp };
            setLastEvent(sseEvent);
          } catch (err) {
            console.error('Failed to parse heartbeat event:', err);
          }
        });

        // Handle errors
        eventSource.onerror = () => {
          if (!isMounted) return;

          eventSource.close();
          setStatus('disconnected');

          // Exponential backoff for reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isMounted) return;
            setStatus('connecting');
            connect();
          }, delay);
        };
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to connect to event source');
      }
    };

    connect();

    // Cleanup function
    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [queryClient]);

  return { status, error, lastEvent };
}
