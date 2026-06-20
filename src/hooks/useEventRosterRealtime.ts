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
    if (!eventId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    pb.collection('eventRosters')
      .subscribe(
        '*',
        (event: RecordSubscription<EventRoster>) => {
          if (cancelled) return;

          const roster = event.record;

          if (!roster || roster.event !== eventId) {
            return;
          }

          queryClient.setQueryData<EventRoster[]>(
            queryKeys.eventRoster.recordsByEventId(eventId),
            (old) => {
              if (event.action === 'delete') {
                return removeRosterRow(old, roster);
              }

              return upsertRosterRow(old, roster);
            }
          );
        },
        {
          filter: pb.filter('event = {:eventId}', { eventId }),
        }
      )
      .then((unsubscribeFn) => {
        if (cancelled) {
          unsubscribeFn();
          return;
        }

        unsubscribe = unsubscribeFn;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to subscribe to event roster realtime updates', err);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [eventId, queryClient]);
}
