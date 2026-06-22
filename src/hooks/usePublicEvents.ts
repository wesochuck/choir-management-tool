import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { eventService } from '../services/eventService';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const usePublicEvents = () => {
  const eventsQuery = useQuery({
    queryKey: queryKeys.events.publicTicketedList,
    queryFn: () => eventService.getPublicEvents(),
    staleTime: 5 * 60_000,
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error
      ? toErrorMessage(eventsQuery.error, 'Failed to load public events')
      : null,
    refresh: eventsQuery.refetch,
  };
};
