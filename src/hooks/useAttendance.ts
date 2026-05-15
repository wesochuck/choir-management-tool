import { useState, useEffect } from 'react';
import { rosterService, type EventRoster } from '../services/rosterService';

export const useAttendance = (eventId: string) => {
  const [rosters, setRosters] = useState<EventRoster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const data = await rosterService.getEventRoster(eventId);
      // Filter to only those who RSVP'd Yes
      setRosters(data.filter(r => r.rsvp === 'Yes'));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [eventId]);

  const toggleAttendance = async (rosterId: string, current: string) => {
    const next: 'Present' | 'Absent' | 'Pending' = current === 'Present' ? 'Absent' : 'Present';
    try {
      const updated = await rosterService.updateAttendance(rosterId, next);
      setRosters(prev => prev.map(r => r.id === rosterId ? updated : r));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update attendance');
    }
  };

  return {
    rosters,
    isLoading,
    error,
    toggleAttendance,
    refresh: fetchAttendance,
  };
};
