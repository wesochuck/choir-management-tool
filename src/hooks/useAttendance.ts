import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService } from '../services/profileService';
import { eventService } from '../services/eventService';
import type { Retry429Options } from '../lib/networkSafety';

type BulkAttendanceUpdate = {
  profileId: string;
  attendance: 'Present' | 'Absent' | 'Pending';
};

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
  rosterRefreshIntervalMs?: number | false;
}

interface MutationContext {
  previousRosters: EventRoster[] | undefined;
}

function upsertRosterRow(rows: EventRoster[] | undefined, roster: EventRoster): EventRoster[] {
  const existingRows = rows ?? [];
  const withoutDuplicate = existingRows.filter(
    (r) => r.id !== roster.id && r.profile !== roster.profile
  );
  return [...withoutDuplicate, roster];
}

export const useAttendance = (eventId: string, options: UseAttendanceOptions = {}) => {
  const queryClient = useQueryClient();
  const onRateLimitRetryRef = useRef(options.onRateLimitRetry);
  const rosterRefreshIntervalMs = options.rosterRefreshIntervalMs ?? 3000;
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    onRateLimitRetryRef.current = options.onRateLimitRetry;
  }, [options.onRateLimitRetry]);

  // --- Queries ---

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: () => eventService.getEvents(),
    enabled: !!eventId,
  });

  const activeProfilesQuery = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () =>
      profileService.getActiveProfiles({
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
      }),
    enabled: !!eventId,
  });

  const eventRosterQuery = useQuery({
    queryKey: queryKeys.eventRoster.recordsByEventId(eventId),
    queryFn: () =>
      rosterService.getEventRoster(eventId, {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
      }),
    enabled: !!eventId,
    refetchInterval: rosterRefreshIntervalMs,
  });

  const currentEvent = useMemo(() => {
    if (!eventsQuery.data) return null;
    return eventsQuery.data.find((ev) => ev.id === eventId) || null;
  }, [eventsQuery.data, eventId]);

  const parentEventId =
    currentEvent?.type === 'Rehearsal' && currentEvent.parentPerformanceId
      ? currentEvent.parentPerformanceId
      : null;

  const parentEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    parentEventIdRef.current = parentEventId;
  }, [parentEventId]);

  const parentRosterQuery = useQuery({
    queryKey: queryKeys.eventRoster.recordsByEventId(parentEventId ?? '__none__'),
    queryFn: () =>
      rosterService.getEventRoster(parentEventId!, {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
      }),
    enabled: !!parentEventId,
  });

  // --- Derived state ---

  const items = useMemo(() => {
    const activeProfiles = activeProfilesQuery.data ?? [];
    const eventRosters = eventRosterQuery.data ?? [];
    const parentRosters =
      currentEvent?.type === 'Rehearsal' && currentEvent.parentPerformanceId
        ? (parentRosterQuery.data ?? [])
        : eventRosters;

    const rosterMap: Record<string, EventRoster> = {};
    eventRosters.forEach((r) => (rosterMap[r.profile] = r));

    const parentRosterMap: Record<string, EventRoster> = {};
    parentRosters.forEach((r) => (parentRosterMap[r.profile] = r));

    return activeProfiles
      .filter((p) => !!p.voicePart)
      .map((p) => {
        const roster = rosterMap[p.id];
        const parentRoster = parentRosterMap[p.id];

        let resolvedRsvp: 'Yes' | 'No' | 'Pending' = roster?.rsvp || 'Pending';
        if (
          resolvedRsvp === 'Pending' &&
          currentEvent?.type === 'Rehearsal' &&
          parentRoster?.rsvp === 'No'
        ) {
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
  }, [activeProfilesQuery.data, eventRosterQuery.data, parentRosterQuery.data, currentEvent]);

  const isLoading =
    eventsQuery.isLoading ||
    activeProfilesQuery.isLoading ||
    eventRosterQuery.isLoading ||
    (parentEventId ? parentRosterQuery.isLoading : false);

  const queryError =
    eventsQuery.error ??
    activeProfilesQuery.error ??
    eventRosterQuery.error ??
    parentRosterQuery.error;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch attendance'
    : localError;

  // --- Query cache helpers ---

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.eventRoster.recordsByEventId(eventId) }),
      ...(parentEventIdRef.current
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.eventRoster.recordsByEventId(parentEventIdRef.current),
            }),
          ]
        : []),
    ]);
  }, [queryClient, eventId]);

  // --- Mutations ---

  const rsvpMutation = useMutation({
    mutationFn: ({ profileId, rsvp }: { profileId: string; rsvp: 'Yes' | 'No' | 'Pending' }) =>
      rosterService.updateRSVP(eventId, profileId, rsvp, '', {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
      }),
    onMutate: async ({ profileId, rsvp }): Promise<MutationContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.eventRoster.recordsByEventId(eventId),
      });
      const previousRosters = queryClient.getQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId)
      );
      queryClient.setQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId),
        (old) => {
          if (!old) return old;
          return old.map((r) => (r.profile === profileId ? { ...r, rsvp } : r));
        }
      );
      return { previousRosters };
    },
    onError: (err, _vars, context?: MutationContext) => {
      if (context?.previousRosters) {
        queryClient.setQueryData(
          queryKeys.eventRoster.recordsByEventId(eventId),
          context.previousRosters
        );
      }
      setLocalError(err instanceof Error ? err.message : 'Failed to update RSVP');
    },
    onSuccess: () => setLocalError(null),
    onSettled: () => invalidateAll(),
  });

  const attendanceMutation = useMutation({
    mutationFn: ({
      profileId,
      next,
      rosterId,
      rsvp,
    }: {
      profileId: string;
      next: 'Present' | 'Absent' | 'Pending';
      rosterId?: string;
      rsvp?: 'Yes' | 'No' | 'Pending';
    }) =>
      rosterService.upsertAttendance(eventId, profileId, next, {
        rosterId,
        rsvp,
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
      }),
    onMutate: async ({ profileId, next, rsvp }): Promise<MutationContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.eventRoster.recordsByEventId(eventId),
      });

      const previousRosters = queryClient.getQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId)
      );

      const existingRoster = previousRosters?.find((r) => r.profile === profileId);

      const effectiveRsvp = existingRoster?.rsvp ?? 'Pending';
      const targetRsvp =
        rsvp || (effectiveRsvp === 'Pending' && next === 'Present' ? 'Yes' : effectiveRsvp);

      queryClient.setQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId),
        (old) => {
          const rows = old ?? [];
          const existing = rows.find((r) => r.profile === profileId);

          if (existing) {
            return rows.map((r) =>
              r.profile === profileId ? { ...r, attendance: next, rsvp: targetRsvp } : r
            );
          }

          return [
            ...rows,
            {
              id: `optimistic_${eventId}_${profileId}`,
              event: eventId,
              profile: profileId,
              attendance: next,
              rsvp: targetRsvp,
              rsvpNote: '',
              seatId: '',
              folderNumber: '',
              folderReturned: false,
              collectionId: '',
              collectionName: 'eventRosters',
              created: '',
              updated: '',
            } as EventRoster,
          ];
        }
      );

      return { previousRosters };
    },
    onError: (err, _vars, context?: MutationContext) => {
      if (context) {
        queryClient.setQueryData(
          queryKeys.eventRoster.recordsByEventId(eventId),
          context.previousRosters
        );
      }
      setLocalError(err instanceof Error ? err.message : 'Failed to update attendance');
    },
    onSuccess: (savedRoster) => {
      setLocalError(null);

      queryClient.setQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId),
        (old) => upsertRosterRow(old, savedRoster)
      );
    },
  });

  const folderMutation = useMutation({
    mutationFn: ({
      profileId,
      folderNumber,
      folderReturned,
    }: {
      profileId: string;
      folderNumber?: string;
      folderReturned?: boolean;
    }) =>
      rosterService.upsertFolder(
        eventId,
        profileId,
        { folderNumber, folderReturned },
        {
          onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
        }
      ),
    onMutate: async ({ profileId, folderNumber, folderReturned }): Promise<MutationContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.eventRoster.recordsByEventId(eventId),
      });
      const previousRosters = queryClient.getQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId)
      );
      queryClient.setQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId),
        (old) => {
          if (!old) return old;
          return old.map((r) =>
            r.profile === profileId
              ? {
                  ...r,
                  folderNumber: folderNumber !== undefined ? folderNumber : r.folderNumber,
                  folderReturned: folderReturned !== undefined ? folderReturned : r.folderReturned,
                }
              : r
          );
        }
      );
      return { previousRosters };
    },
    onError: (err, _vars, context?: MutationContext) => {
      if (context?.previousRosters) {
        queryClient.setQueryData(
          queryKeys.eventRoster.recordsByEventId(eventId),
          context.previousRosters
        );
      }
      setLocalError(err instanceof Error ? err.message : 'Failed to update folder');
    },
    onSuccess: () => setLocalError(null),
    onSettled: () => invalidateAll(),
  });

  const bulkAttendanceMutation = useMutation({
    mutationFn: ({ updates }: { updates: BulkAttendanceUpdate[] }) => {
      if (updates.length === 0) return Promise.resolve([] as EventRoster[]);
      return rosterService.bulkUpsertAttendance(eventId, updates, {
        onRetry: (attempt, delayMs, err) => onRateLimitRetryRef.current?.(attempt, delayMs, err),
      });
    },
    onMutate: async ({ updates }): Promise<MutationContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.eventRoster.recordsByEventId(eventId),
      });
      const previousRosters = queryClient.getQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId)
      );
      const updateMap = new Map(updates.map((u) => [u.profileId, u.attendance]));
      queryClient.setQueryData<EventRoster[]>(
        queryKeys.eventRoster.recordsByEventId(eventId),
        (old) => {
          if (!old) return old;
          return old.map((r) => {
            const next = updateMap.get(r.profile);
            return next !== undefined ? { ...r, attendance: next } : r;
          });
        }
      );
      return { previousRosters };
    },
    onError: (err, _vars, context?: MutationContext) => {
      if (context?.previousRosters) {
        queryClient.setQueryData(
          queryKeys.eventRoster.recordsByEventId(eventId),
          context.previousRosters
        );
      }
      setLocalError(err instanceof Error ? err.message : 'Failed to update bulk attendance');
    },
    onSuccess: () => setLocalError(null),
    onSettled: () => invalidateAll(),
  });

  // --- Public API ---

  const setRSVP = useCallback(
    async (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => {
      await rsvpMutation.mutateAsync({ profileId, rsvp: nextRsvp });
    },
    [rsvpMutation]
  );

  const setAttendance = useCallback(
    async (
      profileId: string,
      next: 'Present' | 'Absent' | 'Pending',
      rosterId?: string,
      rsvp?: 'Yes' | 'No' | 'Pending'
    ) => {
      await attendanceMutation.mutateAsync({ profileId, next, rosterId, rsvp });
    },
    [attendanceMutation]
  );

  const updateFolder = useCallback(
    async (profileId: string, folderNumber?: string, folderReturned?: boolean) => {
      await folderMutation.mutateAsync({ profileId, folderNumber, folderReturned });
    },
    [folderMutation]
  );

  const setAllAttendance = useCallback(
    async (next: 'Present' | 'Absent' | 'Pending', targetProfileIds?: string[]) => {
      if (!eventId || items.length === 0) return;
      const subset = targetProfileIds
        ? items.filter((item) => targetProfileIds.includes(item.profileId))
        : items;
      const updates: BulkAttendanceUpdate[] = subset
        .filter((item) => item.attendance !== next)
        .map((item) => ({ profileId: item.profileId, attendance: next }));
      if (updates.length === 0) return;
      await bulkAttendanceMutation.mutateAsync({ updates });
    },
    [eventId, items, bulkAttendanceMutation]
  );

  const refresh = useCallback(async () => {
    await invalidateAll();
  }, [invalidateAll]);

  return {
    items,
    isLoading,
    error,
    event: currentEvent,
    setAttendance,
    setRSVP,
    setAllAttendance,
    updateFolder,
    refresh,
  };
};
