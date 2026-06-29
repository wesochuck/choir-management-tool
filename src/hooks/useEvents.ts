import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { eventService, type Event, type BulkRehearsalConfig } from '../services/eventService';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const useEvents = () => {
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: () => eventService.getEvents(),
    staleTime: 30_000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
  };

  const addEventMutation = useMutation({
    mutationFn: ({
      data,
      bulkConfig,
    }: {
      data: Partial<Event> | FormData;
      bulkConfig?: BulkRehearsalConfig;
    }) => eventService.createEventWithRehearsals(data, bulkConfig),
    onSuccess: invalidate,
  });

  const editEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> | FormData }) =>
      eventService.updateEvent(id, data),
    onSuccess: invalidate,
  });

  const removeEventMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: invalidate,
  });

  const bulkAddMutation = useMutation({
    mutationFn: ({ performance, config }: { performance: Event; config: BulkRehearsalConfig }) =>
      eventService.bulkCreateRehearsals(performance, config),
    onSuccess: invalidate,
  });

  const addEvent = async (data: Partial<Event> | FormData, bulkConfig?: BulkRehearsalConfig) => {
    return await addEventMutation.mutateAsync({ data, bulkConfig });
  };

  const editEvent = async (id: string, data: Partial<Event> | FormData) => {
    return await editEventMutation.mutateAsync({ id, data });
  };

  const removeEvent = async (id: string) => {
    await removeEventMutation.mutateAsync(id);
  };

  const bulkAddRehearsals = async (performance: Event, config: BulkRehearsalConfig) => {
    await bulkAddMutation.mutateAsync({ performance, config });
  };

  const performances = useMemo(() => {
    return (eventsQuery.data ?? []).filter((e) => e.type === 'Performance');
  }, [eventsQuery.data]);

  return {
    events: eventsQuery.data ?? [],
    performances,
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error ? toErrorMessage(eventsQuery.error, 'Failed to fetch events') : null,
    addEvent,
    editEvent,
    removeEvent,
    bulkAddRehearsals,
    refresh: async () => {
      await eventsQuery.refetch();
    },
  };
};
