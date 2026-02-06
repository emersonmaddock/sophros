import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient instance for the application.
 * Configured with sensible defaults for React Native.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // User data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
});
