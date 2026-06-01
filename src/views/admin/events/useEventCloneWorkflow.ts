import { useCallback } from 'react';
import type { Event } from '../../../services/eventService';

interface UseEventCloneWorkflowArgs {
  setCloningEventId: (id: string | null) => void;
  setEditingEvent: (event: Event | null) => void;
  setIsModalOpen: (open: boolean) => void;
}

export function useEventCloneWorkflow({
  setCloningEventId,
  setEditingEvent,
  setIsModalOpen,
}: UseEventCloneWorkflowArgs) {
  const handleClone = useCallback((event: Event) => {
    setCloningEventId(event.id);
    setEditingEvent({
      ...event,
      id: '',
      isOpenForRSVP: false,
      setList: [],
      parentPerformanceId: '',
    });
    setIsModalOpen(true);
  }, [setCloningEventId, setEditingEvent, setIsModalOpen]);

  return { handleClone };
}
