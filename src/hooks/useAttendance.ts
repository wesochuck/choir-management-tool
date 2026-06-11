import { useState, useEffect, useCallback, useRef } from 'react';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService } from '../services/profileService';
import { eventService, type Event } from '../services/eventService';
import type { Retry429Options } from '../lib/networkSafety';

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
  photo?: string;
}

export interface UseAttendanceOptions {
  onRateLimitRetry?: Retry429Options['onRetry'];
}

export const useAttendance = (eventId: string, options: UseAttendanceOptions = {}) => {
  const onRateLimitRetryRef = useRef(options.onRateLimitRetry);
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    onRateLimitRetryRef.current = options.onRateLimitRetry;
  }, [options.onRateLimitRetry]);

  const fetchAttendance = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const [currentEvent, activeProfiles, eventRosters] = await Promise.all([
        eventService.getEvents().then(events => events.find(e => e.id === eventId) || null),
        profileService.getActiveProfiles({
          onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
        }),
        rosterService.getEventRoster(eventId, {
          onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
        }),
      ]);

      setEvent(currentEvent);

      // If this is a Rehearsal, fetch the Parent Performance rosters to get folder info
      let parentRosters: EventRoster[] = [];
      if (currentEvent?.type === 'Rehearsal' && currentEvent.parentPerformanceId) {
        parentRosters = await rosterService.getEventRoster(currentEvent.parentPerformanceId, {
          onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
        });
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

          // Determine RSVP status:
          // If the singer has an explicit RSVP for the rehearsal (Yes/No), use it.
          // If the rehearsal RSVP is Pending (or not set), and they declined the parent performance, default to 'No'.
          // Otherwise, default to 'Pending'.
          let resolvedRsvp: 'Yes' | 'No' | 'Pending' = roster?.rsvp || 'Pending';
          if (resolvedRsvp === 'Pending' && currentEvent?.type === 'Rehearsal' && parentRoster?.rsvp === 'No') {
            resolvedRsvp = 'No';
          }

          return {
            id: roster?.id || `p_${p.id}`,
            profileId: p.id,
            name: p.name,
            voicePart: p.voicePart,
            attendance: roster?.attendance || 'Pending',
            rsvp: resolvedRsvp,
            rsvpNote: roster?.rsvpNote || '',
            rosterId: roster?.id,
            folderNumber: parentRoster?.folderNumber || '',
            folderReturned: parentRoster?.folderReturned || false,
            photo: p.photo,
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
      const roster = await rosterService.updateRSVP(eventId, profileId, nextRsvp, '', {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
      });
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { 
              ...item, 
              id: roster.id || item.id,
              rosterId: roster.id || item.rosterId,
              rsvp: roster.rsvp || nextRsvp,
              attendance: roster.attendance || item.attendance,
              folderNumber: roster.folderNumber ?? item.folderNumber,
              folderReturned: roster.folderReturned ?? item.folderReturned,
            } 
          : item
      ));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update RSVP');
      // Revert to original state on failure
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

    // Determine target RSVP based on attendance auto-promotion
    const targetRsvp = (originalItem.rsvp === 'Pending' && next === 'Present') ? 'Yes' : originalItem.rsvp;

    // Optimistically update local state immediately
    setItems(prev => prev.map(item => 
      item.profileId === profileId 
        ? { ...item, attendance: next, rsvp: targetRsvp } 
        : item
    ));

    try {
      const roster = await rosterService.upsertAttendance(eventId, profileId, next, {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
      });
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { 
              ...item, 
              id: roster.id || item.id,
              rosterId: roster.id || item.rosterId,
              attendance: roster.attendance || next,
              rsvp: roster.rsvp || targetRsvp,
              folderNumber: roster.folderNumber ?? item.folderNumber,
              folderReturned: roster.folderReturned ?? item.folderReturned,
            } 
          : item
      ));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance');
      // Revert to original state on failure
      setItems(prev => prev.map(item => 
        item.profileId === profileId 
          ? { ...item, attendance: originalItem.attendance, rsvp: originalItem.rsvp } 
          : item
      ));
      throw new Error(err instanceof Error ? err.message : 'Failed to update attendance');
    }
  };

  const updateFolder = async (profileId: string, folderNumber?: string, folderReturned?: boolean) => {
    const originalItem = items.find(item => item.profileId === profileId);
    if (!originalItem) return;

    // Optimistically update local state immediately
    setItems(prev => prev.map(item => 
      item.profileId === profileId 
        ? { 
            ...item, 
            folderNumber: folderNumber !== undefined ? folderNumber : item.folderNumber, 
            folderReturned: folderReturned !== undefined ? folderReturned : item.folderReturned 
          } 
        : item
    ));

    try {
      await rosterService.upsertFolder(eventId, profileId, { folderNumber, folderReturned }, {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
      });
      setError(null);
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
      const updatedRosters = await rosterService.bulkUpsertAttendance(eventId, updates, {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err)
      });

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
    event,
    setAttendance,
    setRSVP,
    setAllAttendance,
    updateFolder,
    refresh: fetchAttendance,
  };
};
