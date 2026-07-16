import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { duesService, type SeasonalDue } from '../services/duesService';
import { seasonService } from '../services/seasonService';

export function useDues() {
  const queryClient = useQueryClient();

  const seasonQuery = useQuery({
    queryKey: ['activeSeason'],
    queryFn: () => seasonService.getActiveSeason(),
    staleTime: 5 * 60_000,
  });

  const activeSeason = seasonQuery.data;
  const currentSeasonId = activeSeason?.id ?? '';

  const duesQuery = useQuery({
    queryKey: queryKeys.dues.bySeason(currentSeasonId),
    queryFn: () => duesService.getDuesForSeason(currentSeasonId),
    enabled: !!currentSeasonId,
  });

  const duesMap = useMemo(() => {
    if (!duesQuery.data) return {} as Record<string, SeasonalDue>;
    const map: Record<string, SeasonalDue> = {};
    for (const d of duesQuery.data) {
      map[d.profile] = d;
    }
    return map;
  }, [duesQuery.data]);

  const toggleDuesMutation = useMutation({
    mutationFn: ({ profileId, paid }: { profileId: string; paid: boolean }) =>
      duesService.updateDues(profileId, currentSeasonId, paid),
    onMutate: async ({ profileId, paid }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dues.bySeason(currentSeasonId) });
      const previous = queryClient.getQueryData<SeasonalDue[]>(
        queryKeys.dues.bySeason(currentSeasonId)
      );
      queryClient.setQueryData<SeasonalDue[]>(queryKeys.dues.bySeason(currentSeasonId), (old) => {
        if (!old) return old;
        return old.map((d) => (d.profile === profileId ? { ...d, paid } : d));
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dues.bySeason(currentSeasonId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.bySeason(currentSeasonId) });
    },
  });

  const toggleDues = async (profileId: string, paid: boolean) => {
    if (!currentSeasonId) return;
    await toggleDuesMutation.mutateAsync({ profileId, paid });
  };

  return {
    activeSeason,
    currentSeason: currentSeasonId, // Backwards compat for UI labels
    duesMap,
    toggleDues,
    isLoading: seasonQuery.isLoading || (!!currentSeasonId && duesQuery.isLoading),
    refresh: async () => {
      await seasonQuery.refetch();
      await duesQuery.refetch();
    },
  };
}
