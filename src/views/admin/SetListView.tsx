import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { eventService, type SetListItem, type Event } from '../../services/eventService';
import { playerService } from '../../services/playerService';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';
import { settingsService, type MusicGenreDef } from '../../services/settingsService';
import { AppCard } from '../../components/common/AppCard';
import { SortableSetListItem } from '../../components/admin/SortableSetListItem';
import { SetListInlineCreator } from '../../components/admin/SetListInlineCreator';
import { SetListItemEditModal } from '../../components/admin/SetListItemEditModal';
import { FloatingAudioPlayer } from './music-library/FloatingAudioPlayer';
import { MusicPieceModal } from './music-library/MusicPieceModal';
import { musicLibraryWorkflows } from '../../services/musicLibraryWorkflows';
import { useDialog } from '../../contexts/DialogContext';
import SlDivider from '@shoelace-style/shoelace/dist/react/divider/index.js';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { resolveSetListDisplayRows, calculateSetListDurationTotals, getDefaultPlayableTrackKey, createSetListItemFromMusicPiece, getPerformanceIdForSetListLibraryLink, buildSetListPlainText } from '../../lib/setList/setListItems';
import { pb } from '../../lib/pocketbase';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { Modal, Input } from '../../components/ui';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { Button, Select, Spinner } from '../../components/ui';
import SlCopyButton from '@shoelace-style/shoelace/dist/react/copy-button/index.js';

export default function SetListView() {
  const { timezone } = useChoirSettings();
  const { events, refresh } = useEvents();
  const [searchParams] = useSearchParams();
  const dialog = useDialog();
  const hasDefaultedRef = useRef(false);
  
  const [selectedEventId, setSelectedEventId] = useState('');
  const [localGapSeconds, setLocalGapSeconds] = useState<number>(0);
  const [localApproved, setLocalApproved] = useState<boolean>(true);

  const selectedEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId);
  }, [events, selectedEventId]);

  const parentPerformance = useMemo(() => {
    if (!selectedEvent || selectedEvent.type !== 'Rehearsal') return null;
    const parentId = selectedEvent.parentPerformanceId;
    return events.find(e => e.id === parentId) || selectedEvent.expand?.parentPerformanceId;
  }, [selectedEvent, events]);

  const [items, setItems] = useState<SetListItem[]>([]);
  const [library, setLibrary] = useState<MusicPiece[]>([]);

  // Cumulative duration totals incorporating resolved library pieces
  const durationTotals = useMemo(() => {
    return calculateSetListDurationTotals(items, library, localGapSeconds);
  }, [items, library, localGapSeconds]);

  // Resolves linked music library piece info and computes running timestamps
  const itemsWithDetails = useMemo(() => {
    return resolveSetListDisplayRows(items, library);
  }, [items, library]);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Library Piece Modal state
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryEditingPiece, setLibraryEditingPiece] = useState<MusicPiece | null>(null);
  const [configuredGenres, setConfiguredGenres] = useState<MusicGenreDef[]>([]);
  const [catalogLookupTemplate, setCatalogLookupTemplate] = useState('');
  const [pendingSetListAdd, setPendingSetListAdd] = useState(false);
  const [prefilledTitleForSetList, setPrefilledTitleForSetList] = useState<string | null>(null);

  // Custom Item Modal state
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<SetListItem | null>(null);

  // Print Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  const handlePrintList = () => {
    window.print();
  };

  // Audio player state
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState('');
  const [activeAudioPart, setActiveAudioPart] = useState('');

  const handlePlayRowTrack = (piece: MusicPiece) => {
    const key = getDefaultPlayableTrackKey(piece);
    if (!key) return;

    const filename = piece.audioTrackMapping?.[key];
    if (!filename) return;

    setActiveAudioUrl(pb.files.getURL(piece, filename));
    setActiveAudioTitle(piece.title);
    setActiveAudioPart(key === 'tutti' ? 'Tutti' : key);
  };

  const handleOpenPlayer = async (event: Event) => {
    try {
      const token = await playerService.generateToken(event.id);
      const url = `${window.location.origin}/player?token=${encodeURIComponent(token)}`;
      
      await dialog.showMessage({
        title: 'Player Link Generated',
        message: (
          <div className="flex flex-col gap-4">
            <p>A standalone practice link has been generated for "{event.title || event.type}".</p>
             <div className="rounded-lg border border-border bg-bg p-2 text-[0.85rem] break-all">
              {url}
            </div>
            <div className="flex flex-row gap-2">
              <SlCopyButton value={url}>
                Copy Link
              </SlCopyButton>
              <Button 
                variant="secondary"
                size="small"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                Open Player
              </Button>
            </div>
          </div>
        )
      });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'Error',
        message: `Could not generate player link: ${message}`,
        variant: 'danger'
      });
    }
  };

  const handleOpenPieceEditor = (pieceId: string) => {
    const selectedPiece = library.find(p => p.id === pieceId);
    if (!selectedPiece) return;

    // Resolve to top-level parent work if clicked item is a child movement
    if (selectedPiece.parentId) {
      const parentPiece = library.find(p => p.id === selectedPiece.parentId);
      if (parentPiece) {
        setLibraryEditingPiece(parentPiece);
        setIsLibraryModalOpen(true);
        return;
      }
    }

    // Fallback for standalone standard pieces
    setLibraryEditingPiece(selectedPiece);
    setIsLibraryModalOpen(true);
  };

  const handleEdit = (item: SetListItem) => {
    const displayRow = itemsWithDetails.find(i => i.id === item.id);
    const pieceId = item.pieceId || displayRow?.resolvedPiece?.id;
    if (pieceId) {
      handleOpenPieceEditor(pieceId);
    } else {
      setItemEditing(item);
      setIsItemEditModalOpen(true);
    }
  };

  const handleSaveItem = async (updatedItem: SetListItem) => {
    await updateItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const handleCreateNewPieceFromSetList = (title: string) => {
    setLibraryEditingPiece(null);
    setPrefilledTitleForSetList(title);
    setPendingSetListAdd(true);
    setIsLibraryModalOpen(true);
  };

  const handleSaveLibraryPiece = async (data: Partial<MusicPieceInput> & { 
    tuttiFile?: File | null; 
    movements?: { title: string; duration?: string }[] 
  }) => {
    try {
      let savedPiece: MusicPiece;
      if (libraryEditingPiece) {
        const updateData = { ...data };
        delete updateData.movements;
        savedPiece = await musicLibraryService.updatePiece(libraryEditingPiece.id, updateData);
      } else {
        const { tuttiFile, movements, ...rest } = data;
        const performanceIdToLink = getPerformanceIdForSetListLibraryLink(selectedEvent);
        
        const pieceData = {
          ...rest,
          performances: rest.performances && rest.performances.length > 0 
            ? rest.performances 
            : (performanceIdToLink ? [performanceIdToLink] : [])
        };

        if (tuttiFile || (movements && movements.length > 0)) {
          savedPiece = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(pieceData, { tuttiFile, movements });
        } else {
          savedPiece = await musicLibraryService.createPiece(pieceData);
        }
      }

      setIsLibraryModalOpen(false);
      // Refresh library to reflect changes
      const updatedLib = await musicLibraryService.getLibrary();
      setLibrary(updatedLib);

      if (pendingSetListAdd) {
        const newItem = createSetListItemFromMusicPiece(savedPiece);
        await updateItems([...items, newItem]);
      }
      setPendingSetListAdd(false);
      setPrefilledTitleForSetList(null);
    } catch (err) {
      console.error(err);
      dialog.showMessage({ title: 'Error', message: 'Could not save the library piece.', variant: 'danger' });
    }
  };

  const handleDeleteLibraryPiece = async () => {
    if (!libraryEditingPiece) return;
    try {
      await musicLibraryService.deletePiece(libraryEditingPiece.id);
      setIsLibraryModalOpen(false);
      const updatedLib = await musicLibraryService.getLibrary();
      setLibrary(updatedLib);
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the music piece.',
        variant: 'danger',
      });
    }
  };

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
        type: 'Performance'
      });
      
      if (resolved) {
        setSelectedEventId(resolved);
      }
    }
  }, [events, selectedEventId, searchParams]);

  useEffect(() => {
    setIsLoading(true);
    musicLibraryService.getLibrary()
      .then(setLibrary)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    settingsService.getMusicLibrarySettings().then(settings => {
      setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
      setConfiguredGenres(settings.genres || []);
    }).catch(console.error);
  }, []);

  // Load event items when selectedEventId or events change
  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find(e => e.id === selectedEventId);
      setItems(ev?.setList || []);
      setLocalGapSeconds(ev?.announcementGapSeconds ?? 0);
      setLocalApproved(ev?.setListApproved !== false);
    } else {
      setItems([]);
      setLocalGapSeconds(0);
      setLocalApproved(true);
    }
    setSaveStatus(null);
  }, [selectedEventId, events]);

  const handleToggleApproved = async (checked: boolean) => {
    if (!selectedEventId) return;
    setLocalApproved(checked);
    setSaveStatus('saving');
    try {
      await eventService.updateEvent(selectedEventId, { setListApproved: checked });
      await refresh();
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to update set list approval status:', error);
      setSaveStatus('error');
      // Revert local state on error
      const ev = events.find(e => e.id === selectedEventId);
      setLocalApproved(ev?.setListApproved !== false);
    }
  };

  const gapSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedEventIdRef = useRef(selectedEventId);

  const handleAnnouncementGapChange = useCallback((seconds: number) => {
    setLocalGapSeconds(seconds);
    if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
    // eslint-disable-next-line react-hooks/immutability -- ref mutation is standard pattern for debounce timers
    gapSaveTimerRef.current = setTimeout(async () => {
      const eventId = selectedEventIdRef.current;
      if (!eventId) return;
      setSaveStatus('saving');
      try {
        await eventService.updateEvent(eventId, { announcementGapSeconds: seconds });
        await refresh();
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to save announcement gap:', error);
        setSaveStatus('error');
      }
    }, 500);
  }, [refresh]);

  const updateItems = async (newItems: SetListItem[]): Promise<boolean> => {
    const previousItems = items;
    setItems(newItems);
    const success = await saveSetList(newItems);
    if (!success) {
      setItems(previousItems);
    }
    return success;
  };

  const saveSetList = async (newItems: SetListItem[]): Promise<boolean> => {
    if (!selectedEventId) return false;
    setSaveStatus('saving');
    try {
      await eventService.updateEvent(selectedEventId, { setList: newItems });
      setSaveStatus('saved');
      return true;
    } catch (error) {
      console.error('Failed to save set list:', error);
      setSaveStatus('error');
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from the set list?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (confirmed) {
      const newItems = items.filter(i => i.id !== id);
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

    const performanceIdToLink = getPerformanceIdForSetListLibraryLink(selectedEvent);
    if (item.pieceId && performanceIdToLink) {
      try {
        const piece = library.find(p => p.id === item.pieceId);
        if (piece) {
          const currentPerfs = piece.performances || [];
          if (!currentPerfs.includes(performanceIdToLink)) {
            const updatedPerfs = [...currentPerfs, performanceIdToLink];
            await musicLibraryService.updatePiece(piece.id, { performances: updatedPerfs });
            const updatedLib = await musicLibraryService.getLibrary();
            setLibrary(updatedLib);
          }
        }
      } catch (err) {
        console.error('Failed to auto-link performance on inline add:', err);
      }
    }
  };

  const handleCopyFrom = async (sourceEventId: string) => {
      const sourceEvent = events.find(e => e.id === sourceEventId);
      if (!sourceEvent || !sourceEvent.setList) return;
      
      const shouldCopy = await dialog.confirm({
          title: 'Copy Set List',
          message: `Replace current list with items from ${sourceEvent.title || sourceEvent.date}?`
      });
      
      if (shouldCopy) {
          const copied = sourceEvent.setList.map(i => ({...i, id: crypto.randomUUID()}));
          await updateItems(copied);
      }
  };



  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Set Lists
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage performance set lists, timings, and singer visibility
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedEvent && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleOpenPlayer(selectedEvent)}
                title="Open practice player link generator"
              >
                🎧 Practice Player
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsPrintModalOpen(true)}
                title="View printable set list"
              >
                🖨️ Print & Copy
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="no-print">
        <AppCard noPadding>
        <div className="flex flex-col gap-4 border-b border-border px-4 py-3">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1.5fr_1.5fr_1fr]">
            <div>
              <span className="mb-2 block text-sm font-bold tracking-wider text-text-muted uppercase">Select Event</span>
              <Select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full"
              >
                <option value="">-- Choose Event --</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.type}
                  </option>
                ))}
              </Select>
            </div>

            {selectedEvent ? (
              <div>
                <span className="mb-2 block text-sm font-bold tracking-wider text-text-muted uppercase">Copy from Previous</span>
                <Select
                  value=""
                  onChange={async (e) => {
                    if (e.target.value) {
                      await handleCopyFrom(e.target.value);
                    }
                  }}
                  className="w-full"
                >
                  <option value="">-- Copy Set List --</option>
                  {events.filter(e => e.id !== selectedEventId && e.setList && e.setList.length > 0).map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.type}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}

            {selectedEvent && selectedEvent.type === 'Performance' && (
              <div className="flex flex-col">
                <span className="mb-2 block text-sm font-bold tracking-wider text-text-muted uppercase">Singer Visibility</span>
                <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-slate-50 px-4 text-sm font-medium transition-colors select-none hover:bg-slate-100/70">
                  <Input
                    type="checkbox"
                    checked={localApproved}
                    onChange={(e) => handleToggleApproved(e.target.checked)}
                    className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary/25"
                  />
                  <span>Approved for Singers</span>
                </label>
              </div>
            )}

            {selectedEvent && selectedEvent.type === 'Rehearsal' && (
              <div className="flex flex-col">
                <span className="mb-2 block text-sm font-bold tracking-wider text-text-muted uppercase">Parent Set List</span>
                {parentPerformance ? (
                  <Button
                    variant="secondary"
                    className="flex h-11 w-full items-center justify-center gap-2"
                    onClick={() => setSelectedEventId(parentPerformance.id)}
                  >
                    🔗 Go to parent: {parentPerformance.title || 'Concert'}
                  </Button>
                ) : (
                  <div className="flex h-11 items-center justify-center rounded-md border border-border bg-slate-50 px-4 text-sm text-text-muted">
                    No parent linked
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedEventId ? (
          <div className="flex flex-col gap-4 p-4">
            {selectedEvent?.type === 'Rehearsal' && (
              <div className="rounded-r-md border-l-4 border-amber-500 bg-amber-50/70 p-3 text-sm leading-relaxed text-amber-900">
                <div className="mb-1 font-semibold">⚠️ Rehearsal Mode</div>
                <p className="m-0">
                  This rehearsal inherits its set list and singer visibility from the parent Performance: <strong>{parentPerformance?.title || 'Concert'}</strong>. Direct edits here will not be visible on the Singer Dashboard.
                </p>
                {parentPerformance && (
                  <Button
                    variant="secondary"
                    size="small"
                    className="mt-2"
                    onClick={() => setSelectedEventId(parentPerformance.id)}
                  >
                    Manage Parent Set List
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {items.length > 0 && (
                <div className="flex flex-col justify-between gap-4 rounded-md border border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-sm font-semibold text-emerald-800 md:flex-row md:items-center">
                  <div className="flex flex-row flex-wrap items-center gap-6">
                    <span>🎼 Songs: <span className="text-slate-900">{durationTotals.songs}</span></span>
                    <span>⏸️ Intermissions: <span className="text-slate-900">{durationTotals.intermissions}</span></span>
                    <span className="flex flex-row items-center gap-2">
                      📢 Gaps:
                      <Input
                        type="number"
                        className="h-7 w-12 rounded border border-border bg-white text-center text-sm font-bold text-slate-800 focus:border-primary focus:outline-none"
                        min={0}
                        step={1}
                        value={localGapSeconds}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleAnnouncementGapChange(isNaN(val) ? 0 : val);
                        }}
                      />
                      <span className="text-xs font-normal text-emerald-700/80">s × {Math.max(0, items.length - 1)} =</span>
                      <span className="text-slate-900">{durationTotals.gaps}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[0.95rem] font-bold text-emerald-800">
                    ⏱️ Total: <span className="text-slate-900">{durationTotals.total}</span>
                  </div>
                </div>
              )}

              <div className="border-b border-border pb-4">
                <SetListInlineCreator 
                  library={library}
                  onAddItem={handleInlineAddItem}
                  onCreateNewPiece={handleCreateNewPieceFromSetList}
                  disabled={isLoading}
                />
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center text-sm text-text-muted">
                  No items in set list. Select event/add items above to build.
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-md border border-border bg-slate-50/50 p-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {itemsWithDetails.map((item) => (
                        <SortableSetListItem 
                          key={item.id} 
                          item={item} 
                          linkedPiece={item.resolvedPiece || undefined}
                          displayTitle={item.displayTitle}
                          displayComposer={item.displayComposer}
                          displayDuration={item.displayDuration}
                          cumulativeStart={item.cumulativeStart}
                          cumulativeEnd={item.cumulativeEnd}
                          onEdit={handleEdit} 
                          onDelete={handleDelete} 
                          onPlayTrack={handlePlayRowTrack}
                          onPieceClick={handleOpenPieceEditor}
                          genres={configuredGenres}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
            
            {items.length > 0 ? (
              <div className="flex flex-col justify-between gap-2 px-2 py-1 text-xs text-text-muted sm:flex-row sm:items-center">
                <span className="italic">Tip: Drag the ⣿ handle on any row to reorder set list items. Changes are saved automatically.</span>
                {saveStatus && (
                  <div className="flex shrink-0 items-center gap-1.5 font-medium">
                    {saveStatus === 'saving' && (
                      <>
                        <Spinner size="small" />
                        <span>Saving...</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-emerald-700">✓ Saved</span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-red-600">✗ Save failed</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              saveStatus && (
                <div className="flex justify-end px-2 py-1 text-xs font-medium text-text-muted">
                  {saveStatus === 'saving' && (
                    <div className="flex items-center gap-1.5">
                      <Spinner size="small" />
                      <span>Saving...</span>
                    </div>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-700">✓ Saved</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-600">✗ Save failed</span>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <div className="p-16 text-center">
            <p className="m-0 text-sm text-text-muted">Select an event above to view and manage its set list.</p>
          </div>
        )}
      </AppCard>
      </div>

      {/* @allow-inline-style - print page styling rule for print-only rendering */}
      <div className="mx-auto hidden max-w-2xl p-8 print:block" style={{ page: 'setlist' }}>
        {selectedEvent && (
          <>
            <div className="mb-6 text-center">
              <h2 className="mb-1 text-2xl font-bold text-gray-900">{selectedEvent.title || selectedEvent.type}</h2>
              <p className="text-sm text-gray-600">
                {formatInTimezone(selectedEvent.date, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' at '}
                {formatInTimezone(selectedEvent.date, timezone, { hour: 'numeric', minute: '2-digit' })}
                {selectedEvent.expand?.venue?.name && ` | ${selectedEvent.expand.venue.name}`}
              </p>
            </div>
            <SlDivider />
            <div className="flex flex-col gap-2">
              {(() => {
                let songIndex = 1;
                return itemsWithDetails.map((item) => {
                  if (item.type === 'intermission') {
                    return (
                      <div key={item.id} className="my-2 border-y border-dashed border-gray-300 py-2 text-center text-base font-bold text-gray-600">
                        {item.displayTitle || 'Intermission'}
                      </div>
                    );
                  }
                  const el = (
                    <div key={item.id} className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-1 text-lg">
                      <span className="font-medium text-gray-900">{songIndex}. {item.displayTitle}</span>
                      {item.displayComposer && (
                        <span className="text-right text-base text-gray-600 italic">{item.displayComposer}</span>
                      )}
                    </div>
                  );
                  songIndex++;
                  return el;
                });
              })()}
            </div>
          </>
        )}
      </div>

      <div className="no-print">
        <MusicPieceModal
        isOpen={isLibraryModalOpen}
        piece={libraryEditingPiece}
        onClose={() => {
          setIsLibraryModalOpen(false);
          setPendingSetListAdd(false);
          setPrefilledTitleForSetList(null);
        }}
        onSave={handleSaveLibraryPiece}
        onDelete={libraryEditingPiece ? handleDeleteLibraryPiece : undefined}
        catalogLookupTemplate={catalogLookupTemplate}
        allPieces={library}
        allGenres={configuredGenres}
        initialTitle={prefilledTitleForSetList || undefined}
      />

      <SetListItemEditModal 
        isOpen={isItemEditModalOpen}
        item={itemEditing}
        onClose={() => setIsItemEditModalOpen(false)}
        onSave={handleSaveItem}
      />

      <MusicImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={refresh}
      />

      <FloatingAudioPlayer 
        url={activeAudioUrl}
        title={activeAudioTitle}
        part={activeAudioPart}
        onClose={() => setActiveAudioUrl(null)}
      />

      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Printable Set List"
        maxWidth="600px"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="flex justify-between gap-2 sm:mr-auto sm:items-center">
              <Button
                variant="outline"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Close
              </Button>
              <div className="flex-1 sm:flex-none">
                <SlCopyButton value={plainText} className="flex w-full items-center gap-[6px]">
                  📋 Copy Plain Text
                </SlCopyButton>
              </div>
            </div>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={handlePrintList}
            >
              🖨️ Print List
            </Button>
          </div>
        }
      >
        <div className="rounded-md border border-border bg-white p-6 font-[Georgia,serif] text-gray-800 shadow-[inset_0_2px_4px_rgb(0_0_0_/_6%)]">
          <div className="mb-4 text-center">
            <h3 className="!m-0 mb-0.5 text-[1.4rem] font-bold text-gray-900">
              {selectedEvent?.title || selectedEvent?.type}
            </h3>
            <div className="text-[0.85rem] font-medium text-text-muted">
              {selectedEvent && formatInTimezone(selectedEvent.date, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent && ` at ${formatInTimezone(selectedEvent.date, timezone, { hour: 'numeric', minute: '2-digit' })}`}
              {selectedEvent?.expand?.venue?.name && ` | ${selectedEvent.expand.venue.name}`}
            </div>
          </div>
          <div className="mb-4 border-b border-border"></div>
          <div className="flex flex-col gap-2">
            {(() => {
              let songIndex = 1;
              return itemsWithDetails.map((item) => {
                if (item.type === 'intermission') {
                  return (
                    <div 
                      key={item.id} 
                      className="my-2 border-y border-dashed border-border py-[6px] text-center text-[0.95rem] font-bold text-text-muted"
                    >
                      ⏸️ {item.displayTitle || 'Intermission'}
                    </div>
                  );
                } else {
                  const el = (
                    <div 
                      key={item.id} 
                      className="flex justify-between border-b border-gray-50 py-[2px] text-[1.05rem]"
                    >
                      <span className="font-medium">{songIndex}. {item.displayTitle}</span>
                      {item.displayComposer && (
                        <span className="text-right text-[0.9rem] text-text-muted italic">
                          {item.displayComposer}
                        </span>
                      )}
                    </div>
                  );
                  songIndex++;
                  return el;
                }
              });
            })()}
          </div>
        </div>
      </Modal>
      </div>


    </div>
  );
}
