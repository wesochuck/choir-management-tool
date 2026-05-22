import { useState, useEffect, useMemo } from 'react';
import { eventService, type Event, type BulkRehearsalConfig } from '../services/eventService';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await eventService.getEvents();
      setEvents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (data: Partial<Event>, bulkConfig?: BulkRehearsalConfig) => {
    try {
      const record = await eventService.createEventWithRehearsals(data, bulkConfig);
      await fetchEvents();
      return record;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const editEvent = async (id: string, data: Partial<Event>) => {
    try {
      const updated = await eventService.updateEvent(id, data);
      await fetchEvents();
      return updated;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  const removeEvent = async (id: string) => {
    try {
      await eventService.deleteEvent(id);
      await fetchEvents();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const bulkAddRehearsals = async (performance: Event, config: BulkRehearsalConfig) => {
    try {
      await eventService.bulkCreateRehearsals(performance, config);
      await fetchEvents();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to bulk create rehearsals');
    }
  };

  const performances = useMemo(() => {
    return events.filter(e => e.type === 'Performance');
  }, [events]);

  return {
    events,
    performances,
    isLoading,
    error,
    addEvent,
    editEvent,
    removeEvent,
    bulkAddRehearsals,
    refresh: fetchEvents,
  };
};
