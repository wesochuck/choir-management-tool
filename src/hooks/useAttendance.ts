import { useState, useEffect, useCallback } from 'react';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService } from '../services/profileService';
import { eventService, type Event } from '../services/eventService';

export interface AttendanceItem {
  id: string; 
  profileId: string;
  name: string;
  voicePart: string;
  attendance: 'Present' | 'Absent' | 'Pending';
  rsvp: 'Yes' | 'No' | 'Pending';
  rosterId?: string;
  folderNumber: string;
  folderReturned: boolean;
}

export const useAttendance = (eventId: string) => {
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const [currentEvent, activeProfiles, eventRosters] = await Promise.all([
        eventService.getEvents().then(events => events.find(e => e.id === eventId) || null),
        profileService.getActiveProfiles(),
        rosterService.getEventRoster(eventId),
      ]);

      setEvent(currentEvent);

      // If this is a Rehearsal, fetch the Parent Performance rosters to get folder info
      let parentRosters: EventRoster[] = [];
      if (currentEvent?.type === 'Rehearsal' && currentEvent.parentPerformanceId) {
        parentRosters = await rosterService.getEventRoster(currentEvent.parentPerformanceId);
      } else {
        parentRosters = eventRosters; // Performance uses its own roster for folders
      }

      const rosterMap: Record<string, EventRoster> = {};
      eventRosters.forEach(r => rosterMap[r.profile] = r);

      const parentRosterMap: Record<string, EventRoster> = {};
      parentRosters.forEach(r => parentRosterMap[r.profile] = r);

      const combined: AttendanceItem[] = activeProfiles.map(p => {
        const roster = rosterMap[p.id];
        const parentRoster = parentRosterMap[p.id];
        return {
          id: roster?.id || `p_${p.id}`,
          profileId: p.id,
          name: p.name,
          voicePart: p.voicePart,
          attendance: roster?.attendance || 'Pending',
          rsvp: roster?.rsvp || 'Pending',
          rosterId: roster?.id,
          folderNumber: parentRoster?.folderNumber || '',
          folderReturned: parentRoster?.folderReturned || false,
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

  const setAttendance = async (profileId: string, next: 'Present' | 'Absent' | 'Pending') => {
    try {
      const updated = await rosterService.upsertAttendance(eventId, profileId, next);
      setItems(prev => prev.map(item => item.profileId === profileId ? { ...item, id: updated.id, rosterId: updated.id, attendance: updated.attendance } : item));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update attendance');
    }
  };

  const updateFolder = async (profileId: string, folderNumber: string, folderReturned: boolean) => {
    if (!event) return;
    const targetEventId = event.type === 'Performance' ? event.id : event.parentPerformanceId;
    if (!targetEventId) {
       throw new Error("Assign a Parent Performance to this rehearsal to track folders across the cycle.");
    }

    try {
      const updated = await rosterService.upsertFolder(targetEventId, profileId, { folderNumber, folderReturned });
      setItems(prev => prev.map(item => item.profileId === profileId ? { ...item, folderNumber: updated.folderNumber, folderReturned: updated.folderReturned } : item));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update folder');
    }
  };

  return {
    items,
    isLoading,
    error,
    setAttendance,
    updateFolder,
    refresh: fetchAttendance,
  };
};
