import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import { queryKeys } from '../lib/queryKeys';
import type { EventRoster } from '../services/rosterService';
import type { RecordSubscription } from 'pocketbase';
import { removeRosterRow, upsertRosterRow } from '../lib/eventRosterCache';

export function useEventRosterRealtime(eventId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) {
      console.log('[Realtime Roster Debug] No eventId provided, skipping subscription');
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    console.log('[Realtime Roster Debug] Initiating subscription for eventId:', eventId);

    pb.collection('eventRosters')
      .subscribe('*', (event: RecordSubscription<EventRoster>) => {
        if (cancelled) {
          console.log(
            '[Realtime Roster Debug] Event received but component has been unmounted/cancelled'
          );
          return;
        }

        const roster = event.record;
        console.log('[Realtime Roster Debug] Roster event received:', event.action, roster);

        if (!roster) {
          console.warn(
            '[Realtime Roster Debug] Event received but no roster record was found in the payload.'
          );
          return;
        }

        if (roster.event !== eventId) {
          console.log(
            `[Realtime Roster Debug] Roster event ID mismatch. Record event ID: "${roster.event}" vs current eventId: "${eventId}". Ignoring.`
          );
          return;
        }

        console.log(
          '[Realtime Roster Debug] Updating recordsByEventId cache for eventId:',
          eventId
        );
        queryClient.setQueryData<EventRoster[]>(
          queryKeys.eventRoster.recordsByEventId(eventId),
          (old) => {
            if (event.action === 'delete') {
              return removeRosterRow(old, roster);
            }

            return upsertRosterRow(old, roster);
          }
        );

        // Invalidate switcher stats in the background
        console.log('[Realtime Roster Debug] Invalidating background recordsForEvents query key');
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.eventRoster.all, 'recordsForEvents'],
        });
      })
      .then((unsubscribeFn) => {
        if (cancelled) {
          console.log(
            '[Realtime Roster Debug] Subscription succeeded but component has already been cancelled. Cleaning up.'
          );
          unsubscribeFn();
          return;
        }

        console.log(
          '[Realtime Roster Debug] Subscription successfully established for eventId:',
          eventId
        );
        unsubscribe = unsubscribeFn;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[Realtime Roster Debug] Subscription error for eventId:', eventId, err);
        }
      });

    return () => {
      console.log(
        '[Realtime Roster Debug] Unmounting: setting cancelled=true and calling unsubscribe for eventId:',
        eventId
      );
      cancelled = true;
      unsubscribe?.();
    };
  }, [eventId, queryClient]);
}
