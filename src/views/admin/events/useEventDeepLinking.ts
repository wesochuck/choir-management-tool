import { useEffect } from 'react';
import type { URLSearchParamsInit } from 'react-router-dom';
import type { Event } from '../../../services/eventService';

interface UseEventDeepLinkingArgs {
  events: Event[];
  isLoading: boolean;
  searchParams: URLSearchParams;
  setSearchParams: (
    nextInit: URLSearchParams | URLSearchParamsInit,
    navigateOptions?: { replace?: boolean },
  ) => void;
  setCloningEventId: (id: string | null) => void;
  setEditingEvent: (event: Event | null) => void;
  setIsModalOpen: (open: boolean) => void;
}

export function useEventDeepLinking({
  events,
  isLoading,
  searchParams,
  setSearchParams,
  setCloningEventId,
  setEditingEvent,
  setIsModalOpen,
}: UseEventDeepLinkingArgs): void {
  useEffect(() => {
    if (isLoading) return;

    const eventId = searchParams.get('eventId');
    const openModal = searchParams.get('openModal') === 'true';
    const addNew = searchParams.get('add') === 'true';

    if (eventId && openModal && events.length > 0) {
      const found = events.find((event) => event.id === eventId);
      if (found) {
        setCloningEventId(null);
        setEditingEvent(found);
        setIsModalOpen(true);

        const newParams = new URLSearchParams(searchParams);
        newParams.delete('eventId');
        newParams.delete('openModal');
        setSearchParams(newParams, { replace: true });
      }
    } else if (addNew) {
      setCloningEventId(null);
      setEditingEvent(null);
      setIsModalOpen(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [
    events,
    isLoading,
    searchParams,
    setSearchParams,
    setCloningEventId,
    setEditingEvent,
    setIsModalOpen,
  ]);
}
