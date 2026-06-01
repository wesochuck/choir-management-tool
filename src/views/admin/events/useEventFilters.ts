import { useMemo, useState } from 'react';
import type { Event } from '../../../services/eventService';

export type EventsTab = 'all' | 'performances' | 'rehearsals';

export function useEventFilters(events: Event[]) {
  const [activeTab, setActiveTab] = useState<EventsTab>('all');
  const [showPastEvents, setShowPastEvents] = useState(false);

  const [now] = useState(() => Date.now());

  const filteredEvents = useMemo(() => {
    const cutoffTime = now - 3 * 60 * 60 * 1000;

    const filtered = events.filter((event) => {
      if (!showPastEvents) {
        const eventTime = new Date(event.date).getTime();
        if (eventTime < cutoffTime) return false;
      }

      if (activeTab === 'performances') return event.type === 'Performance';
      if (activeTab === 'rehearsals') return event.type === 'Rehearsal';
      return true;
    });

    return [...filtered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [events, activeTab, showPastEvents, now]);

  return {
    activeTab,
    setActiveTab,
    showPastEvents,
    setShowPastEvents,
    filteredEvents,
  };
}
