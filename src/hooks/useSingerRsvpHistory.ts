import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { eventService, type Event } from '../services/eventService';
import { rosterService, type EventRoster } from '../services/rosterService';

const EMPTY_PERFORMANCES: Event[] = [];
const EMPTY_ROSTERS: EventRoster[] = [];

interface UseSingerRsvpHistoryParams {
  isOpen: boolean;
  singerId?: string;
  isActive: boolean;
}

export function useSingerRsvpHistory({ isOpen, singerId, isActive }: UseSingerRsvpHistoryParams) {
  const queryClient = useQueryClient();
  const [rsvpSaveErrors, setRsvpSaveErrors] = useState<Record<string, string>>({});
  const [savingRsvpId, setSavingRsvpId] = useState<string | null>(null);

  const rsvpQuery = useQuery({
    queryKey: queryKeys.singerRsvps.bySingerId(singerId ?? ''),
    queryFn: async () => {
      const [allEvents, allRosters] = await Promise.all([
        eventService.getEvents(),
        rosterService.getSingerRosters(singerId!),
      ]);
      return {
        performances: allEvents.filter((eventItem) => eventItem.type === 'Performance'),
        rosters: allRosters,
      };
    },
    enabled: !!isOpen && !!singerId && isActive,
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, newRsvp }: { eventId: string; newRsvp: EventRoster['rsvp'] }) =>
      rosterService.updateRSVP(eventId, singerId!, newRsvp),
    onMutate: ({ eventId }) => {
      setSavingRsvpId(eventId);
      setRsvpSaveErrors(prev => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    },
    onError: (_err, { eventId }) => {
      setRsvpSaveErrors(prev => ({ ...prev, [eventId]: 'Failed to save' }));
    },
    onSettled: () => {
      setSavingRsvpId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.singerRsvps.bySingerId(singerId ?? '') });
    },
  });

  const performances = rsvpQuery.data?.performances ?? EMPTY_PERFORMANCES;
  const rosters = rsvpQuery.data?.rosters ?? EMPTY_ROSTERS;

  const { upcomingPerformances, pastPerformances } = useMemo(() => {
    const now = new Date();
    const upcoming: Event[] = [];
    const past: Event[] = [];

    performances.forEach((performance) => {
      const performanceDate = new Date(performance.date);
      if (performanceDate >= now) {
        upcoming.push(performance);
      } else {
        past.push(performance);
      }
    });

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { upcomingPerformances: upcoming, pastPerformances: past };
  }, [performances]);

  const onRsvpChange = async (eventId: string, newRsvp: EventRoster['rsvp']) => {
    if (!singerId) return;
    await rsvpMutation.mutateAsync({ eventId, newRsvp });
  };

  return {
    loadingRsvps: rsvpQuery.isLoading,
    savingRsvpId,
    rsvpSaveErrors,
    rosters,
    upcomingPerformances,
    pastPerformances,
    onRsvpChange,
  };
}
