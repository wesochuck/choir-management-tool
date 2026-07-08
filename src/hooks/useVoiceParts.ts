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
  const sections: SectionDef[] = useMemo(() => query.data?.sections ?? [], [query.data?.sections]);

  // By default, exclude voice parts whose associated section is "Learning Track Only" (e.g. Soloists) from operational lists
  const voiceParts = useMemo(() => {
    if (options?.includeAll) return allVoiceParts;
    const trackOnlySections = new Set(sections.filter((s) => s.trackOnly).map((s) => s.code));
    return allVoiceParts.filter((vp) => !trackOnlySections.has(vp.sectionCode));
  }, [allVoiceParts, sections, options?.includeAll]);

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
