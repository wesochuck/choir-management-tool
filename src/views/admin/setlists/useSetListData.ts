import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DialogContextValue } from '../../../contexts/DialogContext';
import { eventService, type SetListItem, type Event } from '../../../services/eventService';
import { musicLibraryService, type MusicPiece } from '../../../services/musicLibraryService';
import { settingsService, type MusicGenreDef } from '../../../services/settingsService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import {
  resolveSetListDisplayRows,
  calculateSetListDurationTotals,
  buildSetListPlainText,
  type SetListDisplayRow,
  type SetListDurationTotals,
} from '../../../lib/setList/setListItems';
import { resolveInitialEventId } from '../../../lib/eventUtils';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type SensorDescriptor,
  type SensorOptions,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export interface UseSetListDataReturn {
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  selectedEvent: Event | undefined;
  parentPerformance: Event | null;
  items: SetListItem[];
  itemsWithDetails: SetListDisplayRow[];
  durationTotals: SetListDurationTotals;
  plainText: string;
  library: MusicPiece[];
  isLoading: boolean;
  localGapSeconds: number;
  localApproved: boolean;
  isPending: boolean;
  configuredGenres: MusicGenreDef[];
  catalogLookupTemplate: string;
  sensors: SensorDescriptor<SensorOptions>[];
  handleDelete: (id: string) => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  handleInlineAddItem: (item: SetListItem) => Promise<void>;
  handleCopyFrom: (sourceEventId: string) => Promise<void>;
  handleToggleApproved: (checked: boolean) => Promise<void>;
  handleAnnouncementGapChange: (seconds: number) => void;
  updateItems: (newItems: SetListItem[]) => Promise<boolean>;
}

export function useSetListData(
  events: Event[],
  searchParams: URLSearchParams,
  timezone: string,
  dialog: DialogContextValue
): UseSetListDataReturn {
  const queryClient = useQueryClient();

  const setListMutation = useMutation({
    mutationFn: ({ eventId, items }: { eventId: string; items: SetListItem[] }) =>
      eventService.updateEvent(eventId, { setList: items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });

  const eventUpdateMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Record<string, unknown> }) =>
      eventService.updateEvent(eventId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });

  const hasDefaultedRef = useRef(false);

  const [selectedEventId, setSelectedEventId] = useState('');
  const [localGapSeconds, setLocalGapSeconds] = useState<number>(0);
  const [localApproved, setLocalApproved] = useState<boolean>(true);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId);
  }, [events, selectedEventId]);

  const parentPerformance = useMemo(() => {
    if (!selectedEvent || selectedEvent.type !== 'Rehearsal') return null;
    const parentId = selectedEvent.parentPerformanceId;
    return (
      events.find((e) => e.id === parentId) ||
      (selectedEvent.expand?.parentPerformanceId as Event) ||
      null
    );
  }, [selectedEvent, events]);

  const [items, setItems] = useState<SetListItem[]>([]);
  const { data: library = [], isLoading } = useQuery({
    queryKey: queryKeys.musicLibrary.list(),
    queryFn: () => musicLibraryService.getLibrary(),
  });

  const durationTotals = useMemo(() => {
    return calculateSetListDurationTotals(items, library, localGapSeconds);
  }, [items, library, localGapSeconds]);

  const itemsWithDetails = useMemo(() => {
    return resolveSetListDisplayRows(items, library);
  }, [items, library]);

  const [configuredGenres, setConfiguredGenres] = useState<MusicGenreDef[]>([]);
  const [catalogLookupTemplate, setCatalogLookupTemplate] = useState('');

  const plainText = useMemo(() => {
    if (!selectedEvent) return '';
    return buildSetListPlainText(
      selectedEvent.title || selectedEvent.type,
      selectedEvent.date,
      timezone,
      selectedEvent.expand?.venue?.name || '',
      itemsWithDetails
    );
  }, [selectedEvent, timezone, itemsWithDetails]);

  const gapSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedEventIdRef = useRef(selectedEventId);

  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  useEffect(() => {
    return () => {
      if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      hasDefaultedRef.current = true;
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(events, urlEventId, {
        futureOnly: true,
        type: 'Performance',
      });

      if (resolved) {
        setSelectedEventId(resolved);
      }
    }
  }, [events, selectedEventId, searchParams]);

  const { data: musicLibrarySettings } = useQuery({
    queryKey: queryKeys.appSettings.musicLibrary,
    queryFn: () => settingsService.getMusicLibrarySettings(),
  });

  useEffect(() => {
    if (musicLibrarySettings) {
      setCatalogLookupTemplate(musicLibrarySettings.catalogLookupUrlTemplate || '');
      setConfiguredGenres(musicLibrarySettings.genres || []);
    }
  }, [musicLibrarySettings]);

  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find((e) => e.id === selectedEventId);
      setItems(ev?.setList || []);
      setLocalGapSeconds(ev?.announcementGapSeconds ?? 0);
      setLocalApproved(ev?.setListApproved !== false);
    } else {
      setItems([]);
      setLocalGapSeconds(0);
      setLocalApproved(true);
    }
  }, [selectedEventId, events]);

  const handleToggleApproved = async (checked: boolean) => {
    if (!selectedEventId) return;
    setLocalApproved(checked);
    try {
      await eventUpdateMutation.mutateAsync({
        eventId: selectedEventId,
        data: { setListApproved: checked },
      });
    } catch (error) {
      console.error('Failed to update set list approval status:', error);
      const ev = events.find((e) => e.id === selectedEventId);
      setLocalApproved(ev?.setListApproved !== false);
    }
  };

  const handleAnnouncementGapChange = useCallback(
    (seconds: number) => {
      setLocalGapSeconds(seconds);
      if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
      gapSaveTimerRef.current = setTimeout(async () => {
        const eventId = selectedEventIdRef.current;
        if (!eventId) return;
        try {
          await eventUpdateMutation.mutateAsync({
            eventId,
            data: { announcementGapSeconds: seconds },
          });
        } catch (error) {
          console.error('Failed to save announcement gap:', error);
        }
      }, 500);
    },
    [eventUpdateMutation]
  );

  const saveSetList = async (newItems: SetListItem[]): Promise<boolean> => {
    if (!selectedEventId) return false;
    try {
      await setListMutation.mutateAsync({ eventId: selectedEventId, items: newItems });
      return true;
    } catch (error) {
      console.error('Failed to save set list:', error);
      return false;
    }
  };

  const updateItems = async (newItems: SetListItem[]): Promise<boolean> => {
    const previousItems = items;
    setItems(newItems);
    const success = await saveSetList(newItems);
    if (!success) {
      setItems(previousItems);
    }
    return success;
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from the set list?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (confirmed) {
      const newItems = items.filter((i) => i.id !== id);
      await updateItems(newItems);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      await updateItems(newItems);
    }
  };

  const handleInlineAddItem = async (item: SetListItem) => {
    const nextItems = [...items, item];
    const success = await updateItems(nextItems);
    if (!success) return;
  };

  const handleCopyFrom = async (sourceEventId: string) => {
    const sourceEvent = events.find((e) => e.id === sourceEventId);
    if (!sourceEvent || !sourceEvent.setList) return;

    const shouldCopy = await dialog.confirm({
      title: 'Copy Set List',
      message: `Replace current list with items from ${sourceEvent.title || sourceEvent.date}?`,
    });

    if (shouldCopy) {
      const copied = sourceEvent.setList.map((i: SetListItem) => ({
        ...i,
        id: crypto.randomUUID(),
      }));
      await updateItems(copied);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  return {
    selectedEventId,
    setSelectedEventId,
    selectedEvent,
    parentPerformance,
    items,
    itemsWithDetails,
    durationTotals,
    plainText,
    library,
    isLoading,
    localGapSeconds,
    localApproved,
    isPending: setListMutation.isPending || eventUpdateMutation.isPending,
    configuredGenres,
    catalogLookupTemplate,
    sensors,
    handleDelete,
    handleDragEnd,
    handleInlineAddItem,
    handleCopyFrom,
    handleToggleApproved,
    handleAnnouncementGapChange,
    updateItems,
  };
}
