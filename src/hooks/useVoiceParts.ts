import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef,
} from '../services/settingsService';

export function useVoiceParts() {
  const query = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
    staleTime: 30 * 60_000,
  });

  const voiceParts: VoicePartDef[] = query.data?.voiceParts ?? [];
  const sections: SectionDef[] = query.data?.sections ?? [];
  const labels = voiceParts.map((vp) => vp.label);

  return {
    voiceParts,
    sections,
    labels,
    isLoading: query.isLoading,
    refresh: async () => {
      await query.refetch();
    },
  };
}
