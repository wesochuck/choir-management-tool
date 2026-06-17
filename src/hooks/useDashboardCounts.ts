import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { pb } from '../lib/pocketbase';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const useDashboardCounts = () => {
  const activeSingersQuery = useQuery({
    queryKey: queryKeys.dashboard.activeSingers,
    queryFn: () =>
      pb.collection('profiles').getList(1, 1, {
        filter: pb.filter('globalStatus = {:status} && voicePart != ""', { status: 'Active' }),
      }),
    select: (res) => res.totalItems,
    staleTime: 60_000,
  });

  const upcomingEventsQuery = useQuery({
    queryKey: queryKeys.dashboard.upcomingEvents,
    queryFn: () => {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      return pb.collection('events').getList(1, 1, {
        filter: pb.filter('date >= {:todayStart}', { todayStart: todayStart.toISOString() }),
      });
    },
    select: (res) => res.totalItems,
    staleTime: 60_000,
  });

  const pendingAuditionsQuery = useQuery({
    queryKey: queryKeys.dashboard.pendingAuditions,
    queryFn: () =>
      pb.collection('auditions').getList(1, 1, {
        filter: pb.filter('status != {:status}', { status: 'Closed' }),
      }),
    select: (res) => res.totalItems,
    staleTime: 60_000,
  });

  return {
    activeSingers: activeSingersQuery.data,
    upcomingEvents: upcomingEventsQuery.data,
    pendingAuditions: pendingAuditionsQuery.data,
    errorMessage: activeSingersQuery.error
      ? toErrorMessage(activeSingersQuery.error, 'Failed to fetch active singers count')
      : upcomingEventsQuery.error
        ? toErrorMessage(upcomingEventsQuery.error, 'Failed to fetch upcoming events count')
        : pendingAuditionsQuery.error
          ? toErrorMessage(pendingAuditionsQuery.error, 'Failed to fetch pending auditions count')
          : null,
  };
};
