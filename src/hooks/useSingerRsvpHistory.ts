import { useEffect, useMemo, useState } from 'react';
import { eventService, type Event } from '../services/eventService';
import { rosterService, type EventRoster } from '../services/rosterService';

interface UseSingerRsvpHistoryParams {
  isOpen: boolean;
  singerId?: string;
  isActive: boolean;
}

export function useSingerRsvpHistory({ isOpen, singerId, isActive }: UseSingerRsvpHistoryParams) {
  const [performances, setPerformances] = useState<Event[]>([]);
  const [rosters, setRosters] = useState<EventRoster[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [rsvpSaveErrors, setRsvpSaveErrors] = useState<Record<string, string>>({});
  const [savingRsvpId, setSavingRsvpId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPerformances([]);
      setRosters([]);
      setRsvpSaveErrors({});
      setSavingRsvpId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !singerId || !isActive) {
      return;
    }

    const loadRsvps = async () => {
      setLoadingRsvps(true);
      try {
        const [allEvents, allRosters] = await Promise.all([
          eventService.getEvents(),
          rosterService.getSingerRosters(singerId),
        ]);
        setPerformances(allEvents.filter((eventItem) => eventItem.type === 'Performance'));
        setRosters(allRosters);
      } catch (err: unknown) {
        console.error('Failed to load RSVP history:', err);
      } finally {
        setLoadingRsvps(false);
      }
    };

    loadRsvps();
  }, [isOpen, singerId, isActive]);

  const onRsvpChange = async (eventId: string, newRsvp: EventRoster['rsvp']) => {
    if (!singerId) return;

    setSavingRsvpId(eventId);
    try {
      const updated = await rosterService.updateRSVP(eventId, singerId, newRsvp);
      setRosters((prev) => {
        const existingIndex = prev.findIndex((roster) => roster.event === eventId);
        if (existingIndex === -1) {
          return [...prev, updated];
        }

        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], rsvp: newRsvp };
        return next;
      });

      setRsvpSaveErrors((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    } catch (err: unknown) {
      console.error('Failed to update RSVP:', err);
      setRsvpSaveErrors((prev) => ({
        ...prev,
        [eventId]: 'Failed to save',
      }));
    } finally {
      setSavingRsvpId(null);
    }
  };

  const { upcomingPerformances, pastPerformances } = useMemo(() => {
    const now = new Date();
    const upcoming: Event[] = [];
    const past: Event[] = [];

    performances.forEach((performance) => {
      const performanceDate = new Date(performance.date);
      if (performanceDate >= now) {
        upcoming.push(performance);
      } else {
        past.push(performance);
      }
    });

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { upcomingPerformances: upcoming, pastPerformances: past };
  }, [performances]);

  return {
    loadingRsvps,
    savingRsvpId,
    rsvpSaveErrors,
    rosters,
    upcomingPerformances,
    pastPerformances,
    onRsvpChange,
  };
}
