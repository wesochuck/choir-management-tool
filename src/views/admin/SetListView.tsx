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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { resolveSetListDisplayRows, calculateSetListDurationTotals, getDefaultPlayableTrackKey, createSetListItemFromMusicPiece, getPerformanceIdForSetListLibraryLink } from '../../lib/setList/setListItems';
import { escapeHtml } from '../../lib/textSafety';
import { pb } from '../../lib/pocketbase';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { BaseModal } from '../../components/common/BaseModal';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { Button, Select } from '../../components/ui';

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
  const [copied, setCopied] = useState(false);

  const getPlainText = () => {
    if (!selectedEvent) return '';
    const dateStr = formatInTimezone(selectedEvent.date, timezone, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = formatInTimezone(selectedEvent.date, timezone, {
      hour: 'numeric',
      minute: '2-digit'
    });
    const venueStr = selectedEvent.expand?.venue?.name || '';
    
    let text = `Set List: ${selectedEvent.title || selectedEvent.type}\n`;
    text += `Date: ${dateStr}\n`;
    text += `Time: ${timeStr}\n`;
    if (venueStr) text += `Venue: ${venueStr}\n`;
    text += `\n`;
    
    let songIndex = 1;
    itemsWithDetails.forEach((item) => {
      if (item.type === 'intermission') {
        text += `${item.displayTitle || 'Intermission'}\n`;
      } else {
        const composerSuffix = item.displayComposer ? ` ~ ${item.displayComposer}` : '';
        text += `${songIndex}. ${item.displayTitle}${composerSuffix}\n`;
        songIndex++;
      }
    });
    
    return text;
  };

  const handleCopyList = async () => {
    const text = getPlainText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePrintList = () => {
    if (!selectedEvent) return;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      dialog.showMessage({
        title: 'Popup Blocked',
        message: 'Could not open print window. Please allow popups for this site.',
        variant: 'danger'
      });
      return;
    }

    const dateStr = formatInTimezone(selectedEvent.date, timezone, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = formatInTimezone(selectedEvent.date, timezone, {
      hour: 'numeric',
      minute: '2-digit'
    });
    const safeEventTitle = escapeHtml(selectedEvent.title || selectedEvent.type);
    const safeVenue = escapeHtml(selectedEvent.expand?.venue?.name || '');

    let songIndex = 1;
    const itemsHTML = itemsWithDetails.map((item) => {
      if (item.type === 'intermission') {
        return `
          <div class="printable-setlist-intermission">
            ${escapeHtml(item.displayTitle || 'Intermission')}
          </div>
        `;
      } else {
        const safeComposer = escapeHtml(item.displayComposer || '');
        const composerHTML = safeComposer
          ? `<span class="printable-setlist-composer">${safeComposer}</span>`
          : '';
        const el = `
          <div class="printable-setlist-item">
            <span class="printable-setlist-title">${songIndex}. ${escapeHtml(item.displayTitle)}</span>
            ${composerHTML}
          </div>
        `;
        songIndex++;
        return el;
      }
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Set List: ${safeEventTitle}</title>
          <style>
            @media print {
              body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            body {
              font-family: Georgia, serif;
              max-width: 600px;
              margin: 40px auto;
              padding: 20px;
              background: white;
              color: #333;
            }
            .printable-setlist {
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 30px;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            @media print {
              .printable-setlist {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
            }
            .printable-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .printable-title {
              margin: 0 0 6px 0;
              font-size: 1.6rem;
              color: #111;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-weight: 700;
            }
            .printable-meta {
              font-size: 0.9rem;
              color: #666;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-weight: 500;
            }
            .printable-divider {
              border: none;
              border-bottom: 2px solid #333;
              margin: 20px 0;
            }
            .printable-setlist-items {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .printable-setlist-item {
              font-size: 1.1rem;
              padding: 4px 0;
              border-bottom: 1px solid #fafafa;
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              gap: 15px;
            }
            .printable-setlist-title {
              font-weight: 500;
              color: #111;
            }
            .printable-setlist-composer {
              font-size: 0.95rem;
              color: #555;
              font-style: italic;
              text-align: right;
            }
            .printable-setlist-intermission {
              font-size: 1.1rem;
              font-weight: bold;
              padding: 10px 0;
              color: #555;
              text-align: center;
              border-top: 1px dashed #ddd;
              border-bottom: 1px dashed #ddd;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="printable-setlist">
            <div class="printable-header">
              <h2 class="printable-title">${safeEventTitle}</h2>
              <div class="printable-meta">
                ${dateStr} at ${timeStr} ${safeVenue ? ` | ${safeVenue}` : ''}
              </div>
            </div>
            <hr class="printable-divider" />
            <div class="printable-setlist-items">
              ${itemsHTML}
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          <div className="flex-col gap-[var(--space-md)]">
            <p>A standalone practice link has been generated for "{event.title || event.type}".</p>
            <div className="card border border-[var(--border)] bg-[var(--bg)] p-[var(--space-sm)] text-[0.85rem] break-all">
              {url}
            </div>
            <div className="flex-row gap-[var(--space-sm)]">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                }}
              >
                Copy Link
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                Open Player
              </button>
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

  const handleEditLinkedPiece = (item: SetListItem) => {
    if (!item.pieceId) return;
    handleOpenPieceEditor(item.pieceId);
  };

  const handleEdit = (item: SetListItem) => {
    if (item.pieceId) {
      handleEditLinkedPiece(item);
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
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
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
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Set Lists
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage performance set lists, timings, and singer visibility
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedEventId && (
            <div className="flex items-center gap-2 text-sm text-text-muted mr-2">
              {saveStatus === 'saving' && (
                <>
                  <span className="spinner-small" />
                  <span>Saving changes...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <span className="font-medium text-emerald-700">
                  ✓ Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="font-medium text-red-600">
                  ✗ Save failed
                </span>
              )}
            </div>
          )}
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

      <AppCard noPadding>
        <div className="flex flex-col gap-4 border-b border-border px-4 py-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.5fr_1.5fr_1fr] items-end">
            <div>
              <span className="text-text-muted text-sm font-bold tracking-wider uppercase mb-2 block">Select Event</span>
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
                <span className="text-text-muted text-sm font-bold tracking-wider uppercase mb-2 block">Copy from Previous</span>
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
                <span className="text-text-muted text-sm font-bold tracking-wider uppercase mb-2 block">Singer Visibility</span>
                <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-slate-50 hover:bg-slate-100/70 px-4 text-sm font-medium transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={localApproved}
                    onChange={(e) => handleToggleApproved(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/25"
                  />
                  <span>Approved for Singers</span>
                </label>
              </div>
            )}

            {selectedEvent && selectedEvent.type === 'Rehearsal' && (
              <div className="flex flex-col">
                <span className="text-text-muted text-sm font-bold tracking-wider uppercase mb-2 block">Parent Set List</span>
                {parentPerformance ? (
                  <Button
                    variant="secondary"
                    className="w-full h-11 flex items-center justify-center gap-2"
                    onClick={() => setSelectedEventId(parentPerformance.id)}
                  >
                    🔗 Go to parent: {parentPerformance.title || 'Concert'}
                  </Button>
                ) : (
                  <div className="flex h-11 items-center justify-center rounded-md border border-border bg-slate-50 text-text-muted text-sm px-4">
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
              <div className="border-l-4 border-amber-500 bg-amber-50/70 p-3 rounded-r-md text-sm leading-relaxed text-amber-900">
                <div className="font-semibold mb-1">⚠️ Rehearsal Mode</div>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-md border border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                  <div className="flex flex-row flex-wrap items-center gap-6">
                    <span>🎼 Songs: <span className="text-slate-900">{durationTotals.songs}</span></span>
                    <span>⏸️ Intermissions: <span className="text-slate-900">{durationTotals.intermissions}</span></span>
                    <span className="flex flex-row items-center gap-2">
                      📢 Gaps:
                      <input
                        type="number"
                        className="w-12 h-7 rounded border border-border bg-white text-center text-sm font-bold text-slate-800 focus:outline-none focus:border-primary"
                        min={0}
                        step={1}
                        value={localGapSeconds}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleAnnouncementGapChange(isNaN(val) ? 0 : val);
                        }}
                      />
                      <span className="text-xs font-normal text-emerald-700/80">s × {Math.max(0, items.length - 1)} = {durationTotals.gaps}</span>
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
                <div className="text-text-muted p-12 text-center text-sm">
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
            
            {items.length > 0 && (
              <p className="text-text-muted m-0 px-2 py-1 text-xs italic">
                Tip: Drag the ⣿ handle on any row to reorder set list items. Changes are saved automatically.
              </p>
            )}
          </div>
        ) : (
          <div className="p-16 text-center">
            <p className="text-text-muted m-0 text-sm">Select an event above to view and manage its set list.</p>
          </div>
        )}
      </AppCard>

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

      <BaseModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Printable Set List"
        maxWidth="600px"
        footer={
          <>
            <button 
              className="btn btn-ghost" 
              onClick={() => setIsPrintModalOpen(false)}
            >
              Close
            </button>
            <button 
              className="btn btn-secondary flex items-center gap-[6px]" 
              onClick={handleCopyList}
            >
              {copied ? '✓ Copied!' : '📋 Copy Plain Text'}
            </button>
            <button 
              className="btn btn-primary flex items-center gap-[6px]" 
              onClick={handlePrintList}
            >
              🖨️ Print List
            </button>
          </>
        }
      >
        <div className="card rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-[var(--space-lg)] font-[Georgia,serif] text-[#333] shadow-[inset_0_2px_4px_rgb(0_0_0_/_6%)]">
          <div className="mb-[var(--space-md)] text-center">
            <h3 className="!m-0 mb-[var(--space-xxs)] text-[1.4rem] font-bold text-[#111]">
              {selectedEvent?.title || selectedEvent?.type}
            </h3>
            <div className="text-[0.85rem] font-medium text-[#666]">
              {selectedEvent && formatInTimezone(selectedEvent.date, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent && ` at ${formatInTimezone(selectedEvent.date, timezone, { hour: 'numeric', minute: '2-digit' })}`}
              {selectedEvent?.expand?.venue?.name && ` | ${selectedEvent.expand.venue.name}`}
            </div>
          </div>
          <div className="mb-[var(--space-md)] border-b border-[#eee]"></div>
          <div className="flex flex-col gap-2">
            {(() => {
              let songIndex = 1;
              return itemsWithDetails.map((item) => {
                if (item.type === 'intermission') {
                  return (
                    <div 
                      key={item.id} 
                      className="my-2 border-y border-dashed border-dashed border-[#eee] border-[#eee] py-[6px] text-center text-[0.95rem] font-bold text-[#666]"
                    >
                      ⏸️ {item.displayTitle || 'Intermission'}
                    </div>
                  );
                } else {
                  const el = (
                    <div 
                      key={item.id} 
                      className="flex justify-between border-b border-[#fafafa] py-[2px] text-[1.05rem]"
                    >
                      <span className="font-medium">{songIndex}. {item.displayTitle}</span>
                      {item.displayComposer && (
                        <span className="text-right text-[0.9rem] text-[#666] italic">
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
      </BaseModal>


    </div>
  );
}
