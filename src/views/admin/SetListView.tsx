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
import './SetList.css';

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
          <div className="flex-col sl-player-modal-msg">
            <p>A standalone practice link has been generated for "{event.title || event.type}".</p>
            <div className="card sl-stats-card">
              {url}
            </div>
            <div className="flex-row sl-player-modal-actions">
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
    <div className="flex-col sl-main-wrapper">
      <div className="no-print admin-view-header">
        <div className="flex-row sl-header-title-row">
          {selectedEventId && (
            <div className="sl-warning-text">
              {saveStatus === 'saving' && (
                <>
                  <span className="spinner-small" />
                  <span>Saving changes...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <span className="sl-text-primary-deep">
                  ✓ Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="sl-text-danger">
                  ✗ Save failed
                </span>
              )}
            </div>
          )}
        </div>
        {selectedEvent && (
          <div className="admin-view-actions">
            <button
              type="button"
              className="btn btn-secondary sl-primary-action-btn"
              onClick={() => handleOpenPlayer(selectedEvent)}
              title="Open practice player link generator"
            >
              🎧 Practice Player
            </button>
            <button
              type="button"
              className="btn btn-secondary sl-primary-action-btn"
              onClick={() => setIsPrintModalOpen(true)}
              title="View printable set list"
            >
              🖨️ Print & Copy
            </button>
          </div>
        )}
      </div>

      <div className="roster-filters-bar sl-filters-bar">
          <div className="flex-col sl-filter-col">
            <label className="text-label">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="admin-filter-select sl-filter-input"
            >
              <option value="">-- Choose Event --</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.type}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="flex-col sl-filter-col">
              <label className="text-label">Copy from Previous</label>
              <select 
                value="" 
                onChange={async (e) => {
                  if (e.target.value) {
                    await handleCopyFrom(e.target.value);
                  }
                }}
                className="admin-filter-select sl-filter-input"
              >
                <option value="">-- Copy Set List --</option>
                {events.filter(e => e.id !== selectedEventId && e.setList && e.setList.length > 0).map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedEvent && selectedEvent.type === 'Performance' && (
            <div className="flex-col sl-filter-select-col">
              <label className="text-label">Singer Visibility</label>
              <div 
                className={`card sl-singer-visibility-card ${localApproved ? 'approved' : ''}`}
              >
                <label 
                  className="sl-approved-label"
                >
                  <input
                    type="checkbox"
                    checked={localApproved}
                    onChange={(e) => handleToggleApproved(e.target.checked)}
                    className="sl-approved-checkbox"
                  />
                  <span>Approved for Singers</span>
                </label>
              </div>
            </div>
          )}

          {selectedEvent && selectedEvent.type === 'Rehearsal' && (
            <div className="flex-col sl-filter-select-col">
              <label className="text-label">Parent Set List</label>
              {parentPerformance ? (
                <button
                  type="button"
                  className="btn btn-secondary sl-parent-link-btn"
                  onClick={() => setSelectedEventId(parentPerformance.id)}
                >
                  🔗 Go to parent: {parentPerformance.title || 'Concert'}
                </button>
              ) : (
                <div className="card sl-approved-card">
                  No parent linked
                </div>
              )}
            </div>
          )}
      </div>

      {selectedEventId ? (
        <div className="flex-col sl-main-content">
          {selectedEvent?.type === 'Rehearsal' && (
            <div className="sl-rehearsal-warning">
              <div>
                <strong>⚠️ Rehearsal Mode:</strong> This rehearsal inherits its set list and singer visibility from the parent Performance: <strong>{parentPerformance?.title || 'Concert'}</strong>. Direct edits here will not be visible on the Singer Dashboard.
              </div>
              {parentPerformance && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm sl-filter-select"
                  onClick={() => setSelectedEventId(parentPerformance.id)}
                >
                  Manage Parent Set List
                </button>
              )}
            </div>
          )}

          <AppCard title="Current Set List">
            <div className="flex-col sl-dnd-container">
              {items.length > 0 && (
                <div className="flex-responsive sl-list-header-bar">
                  <div className="flex-row sl-list-section">
                    <span>🎼 Songs: {durationTotals.songs}</span>
                    <span>⏸️ Intermissions: {durationTotals.intermissions}</span>
                    <span className="flex-row sl-gap-section">
                      📢 Gaps:
                      <input
                        type="number"
                        className="sl-gap-input"
                        min={0}
                        step={1}
                        value={localGapSeconds}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleAnnouncementGapChange(isNaN(val) ? 0 : val);
                        }}
                      />
                      s × {Math.max(0, items.length - 1)} = {durationTotals.gaps}
                    </span>
                  </div>
                  <span className="sl-list-section-title">
                    ⏱️ Total: {durationTotals.total}
                  </span>
                </div>
              )}

              <div className="sl-list-divider">
                <SetListInlineCreator 
                  library={library}
                  onAddItem={handleInlineAddItem}
                  onCreateNewPiece={handleCreateNewPieceFromSetList}
                  disabled={isLoading}
                />
              </div>

              {items.length === 0 ? (
                <div className="text-muted sl-empty-list">No items in set list.</div>
              ) : (
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
              )}
            </div>
            <p className="text-muted text-sm sl-hint-text">
                Tip: Drag the ⣿ handle to reorder items. Changes are saved automatically.
            </p>
          </AppCard>
        </div>
      ) : (
        <AppCard className="sl-empty-state-card">
          <p className="text-muted">Select an event above to manage its set list.</p>
        </AppCard>
      )}

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
              className="btn btn-secondary sl-icon-btn" 
              onClick={handleCopyList}
            >
              {copied ? '✓ Copied!' : '📋 Copy Plain Text'}
            </button>
            <button 
              className="btn btn-primary sl-icon-btn" 
              onClick={handlePrintList}
            >
              🖨️ Print List
            </button>
          </>
        }
      >
        <div className="card sl-print-preview-card">
          <div className="sl-print-header">
            <h3 className="sl-print-title">
              {selectedEvent?.title || selectedEvent?.type}
            </h3>
            <div className="sl-print-subtitle">
              {selectedEvent && formatInTimezone(selectedEvent.date, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent && ` at ${formatInTimezone(selectedEvent.date, timezone, { hour: 'numeric', minute: '2-digit' })}`}
              {selectedEvent?.expand?.venue?.name && ` | ${selectedEvent.expand.venue.name}`}
            </div>
          </div>
          <div className="sl-print-divider"></div>
          <div className="sl-print-list">
            {(() => {
              let songIndex = 1;
              return itemsWithDetails.map((item) => {
                if (item.type === 'intermission') {
                  return (
                    <div 
                      key={item.id} 
                      className="sl-print-preview-intermission"
                    >
                      ⏸️ {item.displayTitle || 'Intermission'}
                    </div>
                  );
                } else {
                  const el = (
                    <div 
                      key={item.id} 
                      className="sl-print-preview-song"
                    >
                      <span className="sl-print-item-title">{songIndex}. {item.displayTitle}</span>
                      {item.displayComposer && (
                        <span className="sl-print-item-duration">
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
