import { QueryClient } from '@tanstack/react-query';

/**
 * Configure QueryClient with default options
 * - 10-second polling interval for automatic refetching
 * - Cache data for 5 minutes
 * - Retry failed queries up to 3 times
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 10000, // 10 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 5000, // Consider data fresh for 5 seconds
      gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
