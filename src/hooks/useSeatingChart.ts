import { useState, useEffect, useCallback, useMemo } from 'react';
import { seatingService, type SeatingChart, type VoicePart } from '../services/seatingService';
import { profileService, type Profile } from '../services/profileService';
import { type Venue } from '../services/venueService';

export const useSeatingChart = (performanceId: string, venue: Venue | null) => {
  const [chart, setChart] = useState<SeatingChart | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!performanceId) return;
    setIsLoading(true);
    try {
      const [existingChart, profiles] = await Promise.all([
        seatingService.getChartForPerformance(performanceId),
        profileService.getActiveProfiles(), // Filtered for Active (Current/Future)
      ]);

      // Strictly filter for Active (Current) as per user request for seating chart
      const activeCurrent = profiles.filter(p => p.globalStatus === 'Active (Current)');

      setChart(existingChart);
      setActiveProfiles(activeCurrent);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch seating data');
    } finally {
      setIsLoading(false);
    }
  }, [performanceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const partCounts = useMemo(() => {
    const counts: Record<VoicePart, number> = { S: 0, A: 0, T: 0, B: 0 };
    activeProfiles.forEach(p => {
      const section = p.voicePart[0] as VoicePart;
      if (counts[section] !== undefined) counts[section]++;
    });
    return counts;
  }, [activeProfiles]);

  const rowCounts = useMemo(() => {
    return chart?.layoutOverride || venue?.rowCounts || [];
  }, [chart, venue]);

  const suggestions = useMemo(() => {
    return seatingService.calculateAutoPaint(rowCounts, partCounts);
  }, [rowCounts, partCounts]);

  const assignSinger = async (seatKey: string, profileId: string) => {
    if (!venue || !performanceId) return;
    
    const newAssignments = { ...(chart?.assignments || {}), [seatKey]: profileId };
    // If profileId is empty, remove assignment
    if (!profileId) delete newAssignments[seatKey];

    try {
      const updated = await seatingService.saveChart({
        ...(chart || {}),
        performance: performanceId,
        venue: venue.id,
        assignments: newAssignments,
      });
      setChart(updated);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign singer');
    }
  };

  const updateLayout = async (newRowCounts: number[]) => {
     try {
        const updated = await seatingService.saveChart({
            ...(chart || {}),
            performance: performanceId,
            venue: venue?.id,
            layoutOverride: newRowCounts,
        });
        setChart(updated);
     } catch (err: any) {
        throw new Error(err.message || 'Failed to update layout');
     }
  }

  return {
    chart,
    activeProfiles,
    partCounts,
    rowCounts,
    suggestions,
    isLoading,
    error,
    assignSinger,
    updateLayout,
    refresh: fetchData,
  };
};
