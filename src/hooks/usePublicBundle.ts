import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { pb } from '../lib/pocketbase';
import { type TicketBundle } from '../services/ticketService';

export const usePublicBundle = (bundleId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.tickets.publicBundle(bundleId ?? '_'),
    queryFn: () =>
      pb.collection('ticketBundles').getOne<TicketBundle>(bundleId as string, { expand: 'events' }),
    enabled: !!bundleId,
  });
