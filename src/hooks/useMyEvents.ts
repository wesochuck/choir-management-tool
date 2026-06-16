import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { eventService, type Event } from '../services/eventService';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService, type Profile } from '../services/profileService';

export const useMyEvents = () => {
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: queryKeys.myEvents.list(),
    queryFn: async () => {
      const [allEvents, rosters, profile] = await Promise.all([
        eventService.getEvents(),
        rosterService.getMyRosters(),
        profileService.getMyProfile().catch(() => null),
      ]);
      return { allEvents, rosters, profile };
    },
  });

  const myProfile = eventsQuery.data?.profile ?? null;
  const events = eventsQuery.data?.allEvents ?? [];

  const myRosters: Record<string, EventRoster> = {};
  if (eventsQuery.data?.rosters) {
    for (const r of eventsQuery.data.rosters) {
      myRosters[r.event] = r;
    }
  }

  const updateRSVPMutation = useMutation({
    mutationFn: ({ eventId, rsvp, rsvpNote }: { eventId: string; rsvp: 'Yes' | 'No'; rsvpNote?: string }) =>
      rosterService.updateMyRSVP(eventId, rsvp, rsvpNote),
    onMutate: async ({ eventId, rsvp }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myEvents.all });
      const previous = queryClient.getQueryData(queryKeys.myEvents.list());
      queryClient.setQueryData(queryKeys.myEvents.list(), (old) => {
        if (!old || typeof old !== 'object' || !('rosters' in old)) return old;
        const typed = old as { allEvents: Event[]; rosters: EventRoster[]; profile: Profile | null };
        return {
          ...typed,
          rosters: typed.rosters.map(r =>
            r.event === eventId ? { ...r, rsvp } : r
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.myEvents.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.all });
    },
  });

  const updateRSVP = async (eventId: string, rsvp: 'Yes' | 'No', rsvpNote = '') => {
    if (!myProfile) throw new Error('No profile found for current user');
    try {
      await updateRSVPMutation.mutateAsync({ eventId, rsvp, rsvpNote });
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update RSVP');
    }
  };

  return {
    events,
    myRosters,
    myProfile,
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error
      ? (eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Failed to fetch dashboard data')
      : null,
    updateRSVP,
    refresh: async () => { await eventsQuery.refetch(); },
  };
};
