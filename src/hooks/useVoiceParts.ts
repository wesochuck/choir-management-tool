import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getVoicePartsAndSections, type SectionDef } from '../services/settingsService';

export function useVoiceParts(options?: { includeAll?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
    staleTime: 30 * 60_000,
  });

  const allVoiceParts = useMemo(() => query.data?.voiceParts ?? [], [query.data?.voiceParts]);
  // By default, exclude "Learning Track Only" voice parts (e.g. Soloists) from operational lists
  const voiceParts = useMemo(
    () => (options?.includeAll ? allVoiceParts : allVoiceParts.filter((vp) => !vp.trackOnly)),
    [allVoiceParts, options?.includeAll]
  );
  const sections: SectionDef[] = query.data?.sections ?? [];
  const labels = useMemo(() => voiceParts.map((vp) => vp.label), [voiceParts]);

  return {
    voiceParts,
    allVoiceParts,
    sections,
    labels,
    isLoading: query.isLoading,
    refresh: async () => {
      await query.refetch();
    },
  };
}
