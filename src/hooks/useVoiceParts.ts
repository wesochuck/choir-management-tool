import { useState, useEffect, useCallback, useRef } from 'react';
import { getVoicePartsAndSections, type VoicePartDef, type SectionDef } from '../services/settingsService';

/**
 * Hook to fetch and manage the list of voice parts and sections from settings.
 * Returns both the full definitions and a convenience list of labels.
 */
export function useVoiceParts() {
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await getVoicePartsAndSections();
      if (isMountedRef.current) {
        setVoiceParts(data.voiceParts);
        setSections(data.sections);
        setIsLoading(false);
      }
    } catch {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  const labels = voiceParts.map(vp => vp.label);

  return {
    voiceParts,
    sections,
    labels,
    isLoading,
    refresh: fetchData,
  };
}
