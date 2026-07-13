import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communicationService } from '../../../services/communicationService';
import type { DeliverySummary, RetryFailedResponse } from '../../../services/communicationService';
import { queryKeys } from '../../../lib/queryKeys';

/**
 * Page-scoped delivery summary hook.
 *
 * Fetches aggregated queue state for the visible history page in one bounded
 * request. Polls every 15 seconds while any message is still Queued/Sending.
 * Stops polling once all visible messages reach terminal states, and stops
 * entirely when the History panel is unmounted.
 */
export function useDeliverySummaries(messageIds: string[]): {
  summaries: Record<string, DeliverySummary>;
  isLoading: boolean;
  error: unknown;
  retryFailed: (messageId: string) => Promise<RetryFailedResponse>;
  isRetrying: boolean;
} {
  const queryClient = useQueryClient();

  // Stable key — changes when the set of visible messages changes (new page)
  const stableIds = useMemo(() => [...messageIds].sort(), [messageIds]);

  const summariesQuery = useQuery({
    queryKey: queryKeys.communications.deliverySummaries(stableIds),
    queryFn: () => communicationService.getDeliverySummaries(stableIds),
    enabled: stableIds.length > 0,
    refetchInterval: (query) => {
      const summaries = Object.values(query.state.data?.summaries ?? {});
      const hasActiveMessages = summaries.some(
        (s) => s.state === 'queued' || s.state === 'sending'
      );
      return hasActiveMessages ? 15_000 : false;
    },
    refetchOnWindowFocus: true,
  });

  const retryMutation = useMutation({
    mutationFn: (messageId: string) => communicationService.retryFailedDeliveries(messageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.communications.delivery() });
    },
  });

  return {
    summaries: summariesQuery.data?.summaries ?? {},
    isLoading: summariesQuery.isLoading,
    error: summariesQuery.error,
    retryFailed: (messageId: string) => retryMutation.mutateAsync(messageId),
    isRetrying: retryMutation.isPending,
  };
}
