import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { eventService } from '../services/eventService';

export const usePublicEvent = (eventId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.events.publicById(eventId ?? '_'),
    queryFn: () => eventService.getPublicEventById(eventId as string),
    enabled: !!eventId,
  });
