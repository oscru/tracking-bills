import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide QueryClient with defaults tuned for a mobile/offline-ish client.
 * Create one per app instance and pass it to `<QueryClientProvider>`.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
