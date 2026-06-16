import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : 0;

        if (status === 401 || status === 403 || status === 404) {
          return false;
        }

        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
