import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { eventService, type Event } from '../../../services/eventService';
import { ticketService } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { pb } from '../../../lib/pocketbase';
import { fetchChoirTimezone } from '../../../lib/timezone';
import { chunkArray, mapWithConcurrency } from '../../../lib/networkSafety';

const FALLBACK_TZ = 'America/New_York';
export const TICKETING_REFRESH_INTERVAL_MS = 3000;

export interface BundleOrder {
  purchaseId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  amountPaidCents: number;
  created: string;
  status: string;
  bundleTitle: string;
  bundleId: string;
}

export interface ResendConfirmationTarget {
  purchaseId: string;
  buyerEmail: string;
  buyerName?: string;
}

const fetchMissingTicketingEvents = async (missingEventIds: string[]): Promise<Event[]> => {
  if (missingEventIds.length === 0) return [];
  const chunks = chunkArray(missingEventIds, 50);
  const missingEventsResults = await mapWithConcurrency(
    chunks,
    (chunk) => {
      const filterStr = chunk.map((_, idx) => `id = {:id_${idx}}`).join(' || ');
      const placeholders = chunk.reduce(
        (acc, id, idx) => {
          acc[`id_${idx}`] = id;
          return acc;
        },
        {} as { [key: string]: string }
      );
      return pb.collection('events').getFullList<Event>({
        filter: pb.filter(filterStr, placeholders),
      });
    },
    { concurrency: 2 }
  );

  return missingEventsResults.flat();
};

export function useTicketingEvents({ includeMissingFromPurchases = false } = {}) {
  const eventsEnabledQuery = useQuery({
    queryKey: queryKeys.ticketing.events(),
    queryFn: () => eventService.getTicketingEnabledEvents(),
    staleTime: 30_000,
  });

  const allPurchasesQuery = useQuery({
    queryKey: queryKeys.ticketing.allPurchases(),
    queryFn: () => ticketService.getAllPurchases(),
    enabled: includeMissingFromPurchases,
    refetchInterval: includeMissingFromPurchases ? TICKETING_REFRESH_INTERVAL_MS : undefined,
  });

  const timezoneQuery = useQuery({
    queryKey: queryKeys.ticketing.timezone(),
    queryFn: () => fetchChoirTimezone().catch(() => FALLBACK_TZ),
    staleTime: 30_000,
  });

  const missingEventIds = useMemo(() => {
    if (!includeMissingFromPurchases) return [];
    const eventsEnabled = eventsEnabledQuery.data ?? [];
    const allPurchasesData = allPurchasesQuery.data ?? [];
    const enabledIds = new Set(eventsEnabled.map((event) => event.id));
    const eventIdsWithPurchases = Array.from(
      new Set(allPurchasesData.map((purchase) => purchase.event))
    );
    return eventIdsWithPurchases.filter((eventId) => !enabledIds.has(eventId));
  }, [includeMissingFromPurchases, eventsEnabledQuery.data, allPurchasesQuery.data]);

  const missingEventsQuery = useQuery({
    queryKey: queryKeys.ticketing.missingEvents(missingEventIds),
    queryFn: () => fetchMissingTicketingEvents(missingEventIds),
    enabled: includeMissingFromPurchases && missingEventIds.length > 0,
    staleTime: 30_000,
  });

  const events = useMemo(() => {
    const allEvents = [...(eventsEnabledQuery.data ?? [])];
    if (includeMissingFromPurchases && missingEventsQuery.data) {
      allEvents.push(...missingEventsQuery.data);
    }
    return allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [eventsEnabledQuery.data, includeMissingFromPurchases, missingEventsQuery.data]);

  const timezone = timezoneQuery.data ?? FALLBACK_TZ;

  return {
    events,
    timezone,
    isLoading:
      eventsEnabledQuery.isLoading ||
      timezoneQuery.isLoading ||
      (includeMissingFromPurchases &&
        (allPurchasesQuery.isLoading || missingEventsQuery.isLoading)),
  };
}
