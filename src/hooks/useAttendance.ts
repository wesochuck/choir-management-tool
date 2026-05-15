import { useState, useEffect, useCallback } from 'react';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService } from '../services/profileService';

export interface AttendanceItem {
  id: string; // Roster ID if exists, otherwise Profile ID (prefixed)
  profileId: string;
  name: string;
  voicePart: string;
  attendance: 'Present' | 'Absent' | 'Pending';
  rsvp: 'Yes' | 'No' | 'Pending';
  rosterId?: string;
}

export const useAttendance = (eventId: string) => {
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const [activeProfiles, eventRosters] = await Promise.all([
        profileService.getActiveProfiles(),
        rosterService.getEventRoster(eventId),
      ]);

      const rosterMap: Record<string, EventRoster> = {};
      eventRosters.forEach(r => rosterMap[r.profile] = r);

      const combined: AttendanceItem[] = activeProfiles.map(p => {
        const roster = rosterMap[p.id];
        return {
          id: roster?.id || `p_${p.id}`,
          profileId: p.id,
          name: p.name,
          voicePart: p.voicePart,
          attendance: roster?.attendance || 'Pending',
          rsvp: roster?.rsvp || 'Pending',
          rosterId: roster?.id,
        };
      });

      setItems(combined);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const toggleAttendance = async (profileId: string, current: string) => {
    const next: 'Present' | 'Absent' | 'Pending' = current === 'Present' ? 'Absent' : 'Present';
    try {
      const updated = await rosterService.upsertAttendance(eventId, profileId, next);
      
      setItems(prev => prev.map(item => {
        if (item.profileId === profileId) {
          return {
            ...item,
            id: updated.id,
            rosterId: updated.id,
            attendance: updated.attendance,
          };
        }
        return item;
      }));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update attendance');
    }
  };

  return {
    items,
    isLoading,
    error,
    toggleAttendance,
    refresh: fetchAttendance,
  };
};
