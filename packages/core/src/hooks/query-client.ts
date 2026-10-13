import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide QueryClient with defaults tuned for a mobile/offline-ish client.
 * Create one per app instance and pass it to `<QueryClientProvider>`.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Every mutation in `@repo/core/hooks` invalidates what it touches,
        // so cached data only goes stale from changes made elsewhere (another
        // device). A short window here made each newly mounted screen refetch
        // the whole transaction history — and re-render every screen
        // subscribed to it — just from navigating; pull-to-refresh still
        // forces a fresh read.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
