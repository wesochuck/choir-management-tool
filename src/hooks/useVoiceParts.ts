import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getVoicePartsAndSections, type SectionDef, type VoicePartDef } from '../services/settingsService';

function filterSections(allSections: SectionDef[], includeAll?: boolean) {
  if (includeAll) return allSections;
  return allSections.filter((s) => !s.trackOnly);
}

function filterVoiceParts(
  allVoiceParts: VoicePartDef[],
  allSections: SectionDef[],
  includeAll?: boolean
) {
  if (includeAll) return allVoiceParts;
  const trackOnlySections = new Set(allSections.filter((s) => s.trackOnly).map((s) => s.code));
  return allVoiceParts.filter((vp) => !trackOnlySections.has(vp.sectionCode));
}

export function useVoiceParts(options?: { includeAll?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
    staleTime: 30 * 60_000,
  });

  const allVoiceParts = useMemo(() => query.data?.voiceParts ?? [], [query.data?.voiceParts]);
  const allSections: SectionDef[] = useMemo(
    () => query.data?.sections ?? [],
    [query.data?.sections]
  );

  const sections = useMemo(
    () => filterSections(allSections, options?.includeAll),
    [allSections, options?.includeAll]
  );

  // By default, exclude voice parts whose associated section is "Learning Track Only" (e.g. Soloists) from operational lists
  const voiceParts = useMemo(
    () => filterVoiceParts(allVoiceParts, allSections, options?.includeAll),
    [allVoiceParts, allSections, options?.includeAll]
  );

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
