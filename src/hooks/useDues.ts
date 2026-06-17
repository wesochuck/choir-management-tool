import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { duesService, type SeasonalDue } from '../services/duesService';
import { settingsService } from '../services/settingsService';

export function useDues() {
  const queryClient = useQueryClient();

  const seasonQuery = useQuery({
    queryKey: queryKeys.settings.roster,
    queryFn: () => settingsService.getRosterSettings(),
    staleTime: 5 * 60_000,
  });

  const currentSeason = seasonQuery.data?.currentSeason ?? '';

  const duesQuery = useQuery({
    queryKey: queryKeys.dues.bySeason(currentSeason),
    queryFn: () => duesService.getDuesForSeason(currentSeason),
    enabled: !!currentSeason,
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
      duesService.updateDues(profileId, currentSeason, paid),
    onMutate: async ({ profileId, paid }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dues.bySeason(currentSeason) });
      const previous = queryClient.getQueryData<SeasonalDue[]>(queryKeys.dues.bySeason(currentSeason));
      queryClient.setQueryData<SeasonalDue[]>(queryKeys.dues.bySeason(currentSeason), (old) => {
        if (!old) return old;
        return old.map(d => d.profile === profileId ? { ...d, paid } : d);
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dues.bySeason(currentSeason), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.bySeason(currentSeason) });
    },
  });

  const toggleDues = async (profileId: string, paid: boolean) => {
    if (!currentSeason) return;
    await toggleDuesMutation.mutateAsync({ profileId, paid });
  };

  return {
    currentSeason,
    duesMap,
    toggleDues,
    isLoading: seasonQuery.isLoading || (!!currentSeason && duesQuery.isLoading),
    refresh: async () => {
      await seasonQuery.refetch();
      await duesQuery.refetch();
    },
  };
}
