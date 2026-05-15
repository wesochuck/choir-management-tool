import { useState, useEffect } from 'react';
import { eventService, type Event } from '../services/eventService';

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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (data: Partial<Event>) => {
    try {
      const record = await eventService.createEvent(data);
      await fetchEvents();
      return record;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add event');
    }
  };

  const editEvent = async (id: string, data: Partial<Event>) => {
    try {
      await eventService.updateEvent(id, data);
      await fetchEvents();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update event');
    }
  };

  const removeEvent = async (id: string) => {
    try {
      await eventService.deleteEvent(id);
      await fetchEvents();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete event');
    }
  };

  const bulkAddRehearsals = async (performance: Event, config: any) => {
    try {
      await eventService.bulkCreateRehearsals(performance, config);
      await fetchEvents();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to bulk create rehearsals');
    }
  };

  return {
    events,
    performances: events.filter(e => e.type === 'Performance'),
    isLoading,
    error,
    addEvent,
    editEvent,
    removeEvent,
    bulkAddRehearsals,
    refresh: fetchEvents,
  };
};
