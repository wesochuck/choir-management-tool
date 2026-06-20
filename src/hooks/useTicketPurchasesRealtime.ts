import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import { queryKeys } from '../lib/queryKeys';

export function useTicketPurchasesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    console.log('[Realtime Tickets Debug] Initiating subscription to ticketPurchases');

    pb.collection('ticketPurchases')
      .subscribe('*', (event) => {
        if (cancelled) {
          console.log(
            '[Realtime Tickets Debug] Event received but component has been unmounted/cancelled'
          );
          return;
        }

        console.log(
          '[Realtime Tickets Debug] Ticket purchase event received:',
          event ? event.action : 'unknown',
          event ? event.record : 'none'
        );

        // Invalidate all ticketing query keys to refresh checklists and purchase data
        console.log('[Realtime Tickets Debug] Invalidating all ticketing query keys');
        queryClient.invalidateQueries({
          queryKey: queryKeys.ticketing.all,
        });
      })
      .then((unsubscribeFn) => {
        if (cancelled) {
          console.log(
            '[Realtime Tickets Debug] Subscription succeeded but component has already been cancelled. Cleaning up.'
          );
          unsubscribeFn();
          return;
        }

        console.log('[Realtime Tickets Debug] Ticket subscription successfully established');
        unsubscribe = unsubscribeFn;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[Realtime Tickets Debug] Subscription error:', err);
        }
      });

    return () => {
      console.log(
        '[Realtime Tickets Debug] Unmounting: setting cancelled=true and calling unsubscribe'
      );
      cancelled = true;
      unsubscribe?.();
    };
  }, [queryClient]);
}
