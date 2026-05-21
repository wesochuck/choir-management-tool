import { useState, useEffect, useCallback } from 'react';
import { duesService, type SeasonalDue } from '../services/duesService';
import { settingsService } from '../services/settingsService';

export function useDues() {
  const [duesMap, setDuesMap] = useState<Record<string, SeasonalDue>>({});
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await settingsService.getRosterSettings();
      const season = settings?.currentSeason || '';
      setCurrentSeason(season);

      if (season) {
        const duesList = await duesService.getDuesForSeason(season);
        const map: Record<string, SeasonalDue> = {};
        for (const d of duesList) {
          map[d.profile] = d;
        }
        setDuesMap(map);
      } else {
        setDuesMap({});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDues = async (profileId: string, paid: boolean) => {
    if (!currentSeason) return;
    try {
      // Optimistic update
      setDuesMap(prev => ({
        ...prev,
        [profileId]: { ...prev[profileId], profile: profileId, season: currentSeason, paid } as SeasonalDue
      }));
      
      const updated = await duesService.updateDues(profileId, currentSeason, paid);
      setDuesMap(prev => ({ ...prev, [profileId]: updated }));
    } catch (e) {
      console.error("Failed to update dues", e);
      load(); // revert optimistic update on failure
    }
  };

  return { currentSeason, duesMap, toggleDues, isLoading, refresh: load };
}
