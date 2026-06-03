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
  rsvpNote?: string;
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

      const combined: AttendanceItem[] = activeProfiles
        .filter(p => !!p.voicePart)
        .map(p => {
          const roster = rosterMap[p.id];
          const parentRoster = parentRosterMap[p.id];
          return {
            id: roster?.id || `p_${p.id}`,
            profileId: p.id,
            name: p.name,
            voicePart: p.voicePart,
            attendance: roster?.attendance || 'Pending',
            rsvp: roster?.rsvp || 'Pending',
            rsvpNote: roster?.rsvpNote || '',
            rosterId: roster?.id,
            folderNumber: parentRoster?.folderNumber || '',
            folderReturned: parentRoster?.folderReturned || false,
          };
        });

      setItems(combined);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const setRSVP = async (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => {
    const originalItem = items.find(item => item.profileId === profileId);
    if (!originalItem) return;

    // Optimistically update local state immediately
    setItems(prev => prev.map(item => 
      item.profileId === profileId 
        ? { ...item, rsvp: nextRsvp } 
        : item
    ));

    try {
      // Record the RSVP against the current event (Rehearsal or Performance)
      await rosterService.updateRSVP(eventId, profileId, nextRsvp);
    } catch (err: unknown) {
      // Revert on failure
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { ...item, rsvp: originalItem.rsvp } 
          : item
      ));
      throw new Error(err instanceof Error ? err.message : 'Failed to update RSVP');
    }
  };

  const setAttendance = async (profileId: string, next: 'Present' | 'Absent' | 'Pending') => {
    const originalItem = items.find(item => item.profileId === profileId);
    if (!originalItem) return;

    // Optimistically update local state immediately
    setItems(prev => prev.map(item => 
      item.profileId === profileId 
        ? { ...item, attendance: next } 
        : item
    ));

    try {
      const updated = await rosterService.upsertAttendance(eventId, profileId, next);
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { ...item, id: updated.id, rosterId: updated.id, attendance: updated.attendance } 
          : item
      ));
    } catch (err: unknown) {
      // Revert to original state on failure
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { ...item, attendance: originalItem.attendance } 
          : item
      ));
      throw new Error(err instanceof Error ? err.message : 'Failed to update attendance');
    }
  };

  const updateFolder = async (profileId: string, folderNumber: string, folderReturned: boolean) => {
    if (!event) return;
    const targetEventId = event.type === 'Performance' ? event.id : event.parentPerformanceId;
    if (!targetEventId) {
       throw new Error("Assign a Parent Performance to this rehearsal to track folders across the cycle.");
    }

    const originalItem = items.find(item => item.profileId === profileId);
    if (!originalItem) return;

    // Optimistically update local state immediately
    setItems(prev => prev.map(item => 
      item.profileId === profileId 
        ? { ...item, folderNumber, folderReturned } 
        : item
    ));

    try {
      const updated = await rosterService.upsertFolder(targetEventId, profileId, { folderNumber, folderReturned });
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { ...item, folderNumber: updated.folderNumber, folderReturned: updated.folderReturned } 
          : item
      ));
    } catch (err: unknown) {
      // Revert to original state on failure
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { ...item, folderNumber: originalItem.folderNumber, folderReturned: originalItem.folderReturned } 
          : item
      ));
      throw new Error(err instanceof Error ? err.message : 'Failed to update folder');
    }
  };

  const setAllAttendance = async (next: 'Present' | 'Absent' | 'Pending', targetProfileIds?: string[]) => {
    if (!eventId || items.length === 0) return;

    // If targetProfileIds is provided, we only update those. Otherwise, we update all.
    const subset = targetProfileIds 
      ? items.filter(item => targetProfileIds.includes(item.profileId))
      : items;

    // Only update records whose current attendance status differs from the next status
    const changedSubset = subset.filter(item => item.attendance !== next);

    if (changedSubset.length === 0) return;

    const originalItems = [...items];

    // Optimistically update target items locally
    setItems(prev => prev.map(item => 
      (!targetProfileIds || targetProfileIds.includes(item.profileId))
        ? { ...item, attendance: next }
        : item
    ));

    try {
      const updates = changedSubset.map(item => ({
        profileId: item.profileId,
        attendance: next
      }));
      const updatedRosters = await rosterService.bulkUpsertAttendance(eventId, updates);

      const rosterMap = new Map(updatedRosters.map(r => [r.profile, r]));
      setItems(prev => prev.map(item => {
        if (!targetProfileIds || targetProfileIds.includes(item.profileId)) {
          const r = rosterMap.get(item.profileId);
          return {
            ...item,
            id: r?.id || item.id,
            rosterId: r?.id || item.rosterId,
            attendance: r?.attendance || next,
            rsvp: r?.rsvp || item.rsvp,
            folderNumber: r?.folderNumber ?? item.folderNumber,
            folderReturned: r?.folderReturned ?? item.folderReturned,
          };
        }
        return item;
      }));
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update bulk attendance';
      setError(message);
      // Revert to original state on failure
      setItems(originalItems);
      throw new Error(message);
    }
  };

  return {
    items,
    isLoading,
    error,
    setAttendance,
    setRSVP,
    setAllAttendance,
    updateFolder,
    refresh: fetchAttendance,
  };
};
