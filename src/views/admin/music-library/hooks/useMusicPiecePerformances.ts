import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../lib/queryKeys';
import { useDialog } from '../../../../contexts/DialogContext';
import { useChoirSettings } from '../../../../hooks/useDocumentTitle';
import { zonedInputValueToUtc } from '../../../../lib/timezone';
import { eventService, type Event, type SetListItem } from '../../../../services/eventService';
import { venueService, type Venue } from '../../../../services/venueService';
import type { MusicPiece } from '../../../../services/musicLibraryService';

export interface UseMusicPiecePerformancesParams {
  piece: MusicPiece | null;
  allPieces?: MusicPiece[];
  isOpen: boolean;
  modalEvents: Event[];
}

export function useMusicPiecePerformances({
  piece,
  allPieces,
  isOpen,
  modalEvents,
}: UseMusicPiecePerformancesParams) {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const { timezone } = useChoirSettings();

  const [allPerformances, setAllPerformances] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedPerformanceIds, setSelectedPerformanceIds] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [quickVenue, setQuickVenue] = useState('');

  const venuesQuery = useQuery({
    queryKey: queryKeys.venues.list(),
    queryFn: () => venueService.getVenues(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (venuesQuery.data) {
      setVenues(venuesQuery.data);
    }
  }, [venuesQuery.data]);

  useEffect(() => {
    if (isOpen && modalEvents.length > 0) {
      setAllPerformances(modalEvents);
    }
  }, [isOpen, modalEvents]);

  useEffect(() => {
    if (piece) {
      const relevantIds = new Set([piece.id]);
      if (allPieces) {
        if (!piece.parentId) {
          allPieces.forEach((p) => {
            if (p.parentId === piece.id) relevantIds.add(p.id);
          });
        } else {
          relevantIds.add(piece.parentId);
        }
      }

      setSelectedPerformanceIds(
        modalEvents
          .filter((evt) =>
            evt.setList?.some((item) => item.pieceId && relevantIds.has(item.pieceId))
          )
          .map((evt) => evt.id)
      );
    } else {
      setSelectedPerformanceIds([]);
    }
    setShowQuickAdd(false);
    setQuickTitle('');
    setQuickDate('');
    setQuickVenue('');
  }, [piece, allPieces, isOpen, modalEvents]);

  const quickAddPerformanceMutation = useMutation<Event, Error, Partial<Event>>({
    mutationFn: (data: Partial<Event>) => eventService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
      eventService.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });

  const handleQuickAddPerformance = async () => {
    if (!quickTitle || !quickDate || !quickVenue) {
      dialog.showMessage({
        title: 'Validation Error',
        message: 'Please provide a title, date, and venue for the performance.',
        variant: 'warning',
      });
      return;
    }

    try {
      const utcDate = zonedInputValueToUtc(quickDate, timezone);
      const newPerf = await quickAddPerformanceMutation.mutateAsync({
        title: quickTitle,
        date: utcDate,
        type: 'Performance',
        venue: quickVenue,
        details: 'Quick added from music library historic logs',
      } as Partial<Event>);

      setAllPerformances((prev) => [newPerf, ...prev]);
      setSelectedPerformanceIds((prev) => [...prev, newPerf.id]);

      setQuickTitle('');
      setQuickDate('');
      setQuickVenue('');
      setShowQuickAdd(false);

      dialog.showMessage({
        title: 'Success',
        message: `Created performance "${newPerf.title}" and linked it to this piece.`,
        variant: 'info',
      });
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to create the performance.',
        variant: 'danger',
      });
    }
  };

  const togglePerformance = async (perfId: string) => {
    const event = modalEvents.find((e) => e.id === perfId);
    if (!event) return;

    const isLinked = selectedPerformanceIds.includes(perfId);
    try {
      if (isLinked) {
        const relevantIds = new Set([piece?.id]);
        if (piece && allPieces) {
          if (!piece.parentId) {
            allPieces.forEach((p) => {
              if (p.parentId === piece.id) relevantIds.add(p.id);
            });
          } else {
            relevantIds.add(piece.parentId);
          }
        }
        const updatedSetList = (event.setList || []).filter(
          (item) => !item.pieceId || !relevantIds.has(item.pieceId)
        );
        await updateEventMutation.mutateAsync({ id: perfId, data: { setList: updatedSetList } });
        setSelectedPerformanceIds((prev) => prev.filter((id) => id !== perfId));
      } else if (piece) {
        const newItem: SetListItem = {
          id: window.crypto.randomUUID(),
          title: piece.title,
          pieceId: piece.id,
          composer: piece.composer,
        };
        const updatedSetList = [...(event.setList || []), newItem];
        await updateEventMutation.mutateAsync({ id: perfId, data: { setList: updatedSetList } });
        setSelectedPerformanceIds((prev) => [...prev, perfId]);
      }
    } catch (error) {
      console.error('Failed to toggle performance set list link:', error);
    }
  };

  const selectedPerformances = useMemo(() => {
    return allPerformances
      .filter((p) => selectedPerformanceIds.includes(p.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allPerformances, selectedPerformanceIds]);

  const availablePerformances = useMemo(() => {
    return allPerformances
      .filter((p) => !selectedPerformanceIds.includes(p.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allPerformances, selectedPerformanceIds]);

  const reset = () => {
    setSelectedPerformanceIds([]);
    setShowQuickAdd(false);
    setQuickTitle('');
    setQuickDate('');
    setQuickVenue('');
  };

  return {
    allPerformances,
    venues,
    selectedPerformanceIds,
    setSelectedPerformanceIds,
    selectedPerformances,
    availablePerformances,
    showQuickAdd,
    setShowQuickAdd,
    quickTitle,
    setQuickTitle,
    quickDate,
    setQuickDate,
    quickVenue,
    setQuickVenue,
    handleQuickAddPerformance,
    togglePerformance,
    quickAddPerformanceMutation,
    reset,
  };
}
