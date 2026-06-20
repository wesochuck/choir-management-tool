import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import { queryKeys } from '../lib/queryKeys';

export function useTicketPurchasesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    pb.collection('ticketPurchases')
      .subscribe('*', () => {
        if (cancelled) return;

        // Invalidate all ticketing query keys to refresh checklists and purchase data
        queryClient.invalidateQueries({
          queryKey: queryKeys.ticketing.all,
        });
      })
      .then((unsubscribeFn) => {
        if (cancelled) {
          unsubscribeFn();
          return;
        }

        unsubscribe = unsubscribeFn;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to subscribe to ticket purchases realtime updates', err);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [queryClient]);
}
