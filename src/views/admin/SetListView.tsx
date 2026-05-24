import { useState, useEffect, useMemo, useRef } from 'react';
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
import { pb } from '../../lib/pocketbase';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { BaseModal } from '../../components/common/BaseModal';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';

export default function SetListView() {
  const { timezone } = useChoirSettings();
  const { events, refresh } = useEvents();
  const [searchParams] = useSearchParams();
  const dialog = useDialog();
  const hasDefaultedRef = useRef(false);
  const eventsRef = useRef(events);
  
  const [selectedEventId, setSelectedEventId] = useState('');

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
    return calculateSetListDurationTotals(items, library);
  }, [items, library]);

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
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy text: ', err);
    }
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
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <p>A standalone practice link has been generated for "{event.title || event.type}".</p>
            <div className="card" style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', wordBreak: 'break-all', fontSize: '0.85rem' }}>
              {url}
            </div>
            <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
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
                onClick={() => window.open(url, '_blank')}
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

  const handleSaveItem = (updatedItem: SetListItem) => {
    updateItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
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
        updateItems([...items, newItem]);
      }
      setPendingSetListAdd(false);
      setPrefilledTitleForSetList(null);
    } catch (err) {
      console.error(err);
      dialog.showMessage({ title: 'Error', message: 'Could not save the library piece.', variant: 'danger' });
    }
  };

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(events, urlEventId, {
        futureOnly: true,
        type: 'Performance'
      });
      
      if (resolved) {
        setSelectedEventId(resolved);
        hasDefaultedRef.current = true;
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

  // Load event items ONLY when selectedEventId changes
  useEffect(() => {
    if (selectedEventId) {
      const ev = eventsRef.current.find(e => e.id === selectedEventId);
      setItems(ev?.setList || []);
    } else {
      setItems([]);
    }
    setSaveStatus(null);
  }, [selectedEventId]);

  const handleToggleApproved = async (checked: boolean) => {
    if (!selectedEventId) return;
    setSaveStatus('saving');
    try {
      await eventService.updateEvent(selectedEventId, { setListApproved: checked });
      await refresh();
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to update set list approval status:', error);
      setSaveStatus('error');
    }
  };

  const updateItems = (newItems: SetListItem[]) => {
    setItems(newItems);
    saveSetList(newItems);
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

  const handleDelete = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    updateItems(newItems);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      updateItems(newItems);
    }
  };

  const handleInlineAddItem = async (item: SetListItem) => {
    const nextItems = [...items, item];
    setItems(nextItems);
    const savedSetList = await saveSetList(nextItems);
    if (!savedSetList) return;

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
          updateItems(copied);
      }
  };



  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
      <div className="no-print admin-view-header">
        <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-md)' }}>
          {selectedEventId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {saveStatus === 'saving' && (
                <>
                  <span className="spinner-small" />
                  <span>Saving changes...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <span style={{ color: 'var(--primary-deep)', fontWeight: 500 }}>
                  ✓ Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
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
              className="btn btn-secondary"
              onClick={() => handleOpenPlayer(selectedEvent)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}
              title="Open practice player link generator"
            >
              🎧 Practice Player
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPrintModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}
              title="View printable set list"
            >
              🖨️ Print & Copy
            </button>
          </div>
        )}
      </div>

      <div className="roster-filters-bar" style={{ alignItems: 'stretch' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)', flex: 1, minWidth: '200px' }}>
            <label className="text-label">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="card admin-filter-select"
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
            <div className="flex-col" style={{ gap: 'var(--space-xs)', minWidth: '200px' }}>
              <label className="text-label">Copy from Previous</label>
              <select 
                value="" 
                onChange={(e) => handleCopyFrom(e.target.value)}
                className="card admin-filter-select"
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
            <div className="flex-col" style={{ gap: 'var(--space-xs)', minWidth: '200px' }}>
              <label className="text-label">Singer Visibility</label>
              <div 
                className="card"
                style={{ 
                  height: '44px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 16px',
                  backgroundColor: selectedEvent.setListApproved !== false ? 'rgba(74, 124, 89, 0.1)' : 'var(--surface)',
                  border: selectedEvent.setListApproved !== false ? '1px solid var(--primary)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: 500,
                    fontSize: 'var(--font-size-label)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvent.setListApproved !== false}
                    onChange={(e) => handleToggleApproved(e.target.checked)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      accentColor: 'var(--primary)', 
                      cursor: 'pointer' 
                    }}
                  />
                  <span>Approved for Singers</span>
                </label>
              </div>
            </div>
          )}

          {selectedEvent && selectedEvent.type === 'Rehearsal' && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)', minWidth: '200px' }}>
              <label className="text-label">Parent Set List</label>
              {parentPerformance ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedEventId(parentPerformance.id)}
                  style={{
                    height: '44px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(74, 124, 89, 0.08)',
                    color: 'var(--primary-deep)',
                    border: '1px solid rgba(74, 124, 89, 0.2)'
                  }}
                >
                  🔗 Go to parent: {parentPerformance.title || 'Concert'}
                </button>
              ) : (
                <div 
                  style={{ 
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center', 
                    height: '44px', 
                    padding: '0 12px', 
                    fontSize: 'var(--font-size-label)', 
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface)'
                  }}
                >
                  No parent linked
                </div>
              )}
            </div>
          )}
      </div>

      {selectedEventId ? (
        <div className="flex-col" style={{ gap: 'var(--space-lg)', width: '100%' }}>
          {selectedEvent?.type === 'Rehearsal' && (
            <div 
              style={{
                backgroundColor: 'rgba(74, 124, 89, 0.05)',
                borderLeft: '4px solid var(--primary)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <strong>⚠️ Rehearsal Mode:</strong> This rehearsal inherits its set list and singer visibility from the parent Performance: <strong>{parentPerformance?.title || 'Concert'}</strong>. Direct edits here will not be visible on the Singer Dashboard.
              </div>
              {parentPerformance && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedEventId(parentPerformance.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Manage Parent Set List
                </button>
              )}
            </div>
          )}

          <AppCard title="Current Set List">
            <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
              {items.length > 0 && (
                <div className="flex-responsive" style={{ 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backgroundColor: 'var(--primary-light)', 
                  padding: 'var(--space-sm) var(--space-md)', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--primary-deep)',
                  marginBottom: 'var(--space-xs)',
                  border: '1px solid rgba(74, 124, 89, 0.15)',
                  gap: 'var(--space-sm)'
                }}>
                  <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
                    <span>🎼 Songs: {durationTotals.songs}</span>
                    <span>⏸️ Intermissions: {durationTotals.intermissions}</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--primary-deep)', borderLeft: '1px solid rgba(74, 124, 89, 0.3)', paddingLeft: 'var(--space-md)' }}>
                    ⏱️ Total: {durationTotals.total}
                  </span>
                </div>
              )}

              <div style={{ marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                <SetListInlineCreator 
                  library={library}
                  onAddItem={handleInlineAddItem}
                  onCreateNewPiece={handleCreateNewPieceFromSetList}
                  disabled={isLoading}
                />
              </div>

              {items.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>No items in set list.</div>
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
            <p className="text-muted text-sm" style={{ marginTop: 'var(--space-md)', padding: '0 var(--space-md) var(--space-md)' }}>
                Tip: Drag the ⣿ handle to reorder items. Changes are saved automatically.
            </p>
          </AppCard>
        </div>
      ) : (
        <AppCard style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
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
        onDelete={libraryEditingPiece ? () => musicLibraryService.deletePiece(libraryEditingPiece.id).then(() => { setIsLibraryModalOpen(false); return musicLibraryService.getLibrary(); }).then(setLibrary).then(() => {}) : undefined}
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
              className="btn btn-secondary" 
              onClick={handleCopyList}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Plain Text'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🖨️ Print List
            </button>
          </>
        }
      >
        <div 
          className="card" 
          style={{ 
            backgroundColor: '#fff', 
            color: '#333', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            padding: 'var(--space-lg)', 
            fontFamily: 'Georgia, serif',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: '0 0 var(--space-xxs) 0', fontSize: '1.4rem', color: '#111', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
              {selectedEvent?.title || selectedEvent?.type}
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#666', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              {selectedEvent && formatInTimezone(selectedEvent.date, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent && ` at ${formatInTimezone(selectedEvent.date, timezone, { hour: 'numeric', minute: '2-digit' })}`}
              {selectedEvent?.expand?.venue?.name && ` | ${selectedEvent.expand.venue.name}`}
            </div>
          </div>
          <div style={{ borderBottom: '1px solid #eee', marginBottom: 'var(--space-md)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(() => {
              let songIndex = 1;
              return itemsWithDetails.map((item) => {
                if (item.type === 'intermission') {
                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        fontWeight: 'bold', 
                        color: '#666', 
                        textAlign: 'center', 
                        padding: '6px 0', 
                        borderTop: '1px dashed #eee', 
                        borderBottom: '1px dashed #eee',
                        margin: '8px 0',
                        fontSize: '0.95rem'
                      }}
                    >
                      ⏸️ {item.displayTitle || 'Intermission'}
                    </div>
                  );
                } else {
                  const el = (
                    <div 
                      key={item.id} 
                      style={{ 
                        fontSize: '1.05rem', 
                        padding: '2px 0', 
                        borderBottom: '1px solid #fafafa',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 'var(--space-md)'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{songIndex}. {item.displayTitle}</span>
                      {item.displayComposer && (
                        <span style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic', textAlign: 'right' }}>
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

      {selectedEvent && (
        <div style={{ display: 'none' }} className="print-only">
          <style>{`
            @media print {
              .print-only { display: block !important; }
              .no-print { display: none !important; }
              .modal-overlay, .modal-overlay * { display: none !important; }
              body {
                background: white !important;
                color: black !important;
              }
              body .printable-setlist.printable-setlist {
                font-family: Georgia, serif;
                max-width: 600px;
                margin: 0 auto !important;
                padding: 20px !important;
                background: white !important;
                color: black !important;
                border: 1px solid #ccc !important;
                border-radius: 8px !important;
              }
              body .printable-setlist.printable-setlist h2 {
                font-size: 24px !important;
                margin: 0 0 10px 0 !important;
                text-align: center !important;
                font-family: var(--font-sans), sans-serif !important;
                font-weight: 700 !important;
              }
              body .printable-setlist.printable-setlist p {
                font-size: 14px !important;
                margin: 0 0 25px 0 !important;
                text-align: center !important;
                color: #555 !important;
                font-family: var(--font-sans), sans-serif !important;
              }
              body .printable-setlist.printable-setlist hr.printable-divider {
                border: none !important;
                border-bottom: 2px solid black !important;
                margin: 25px 0 !important;
                display: block !important;
                height: 0 !important;
              }
              body .printable-setlist-items.printable-setlist-items {
                list-style: none !important;
                padding: 0 !important;
                margin: 20px 0 0 0 !important;
                display: block !important;
              }
              body .printable-setlist-item.printable-setlist-item {
                font-size: 18px !important;
                padding: 8px 0 !important;
                border-bottom: 1px solid #eee !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: baseline !important;
              }
              body .printable-setlist-intermission.printable-setlist-intermission {
                font-size: 18px !important;
                font-weight: bold !important;
                padding: 12px 0 !important;
                color: #444 !important;
                text-align: center !important;
                border-top: 1px dashed #ccc !important;
                border-bottom: 1px dashed #ccc !important;
                margin: 15px 0 !important;
              }
            }
          `}</style>
          <div className="printable-setlist">
            <h2>Set List: {selectedEvent.title || selectedEvent.type}</h2>
            <p>
              Date: {formatInTimezone(selectedEvent.date, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent && ` at ${formatInTimezone(selectedEvent.date, timezone, { hour: 'numeric', minute: '2-digit' })}`}
              {selectedEvent.expand?.venue?.name && ` | Venue: ${selectedEvent.expand.venue.name}`}
            </p>
            <hr style={{ border: 'none', borderBottom: '2px solid black', margin: '25px 0', display: 'block', height: 0 }} className="printable-divider" />
            <div className="printable-setlist-items">
              {(() => {
                let songIndex = 1;
                return itemsWithDetails.map((item) => {
                  if (item.type === 'intermission') {
                    return (
                      <div key={item.id} className="printable-setlist-intermission">
                        ⏸️ {item.displayTitle || 'Intermission'}
                      </div>
                    );
                  } else {
                    const el = (
                      <div 
                        key={item.id} 
                        className="printable-setlist-item"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: '15px'
                        }}
                      >
                        <span>{songIndex}. {item.displayTitle}</span>
                        {item.displayComposer && (
                          <span style={{ fontSize: '14px', color: '#555', fontStyle: 'italic', textAlign: 'right' }}>
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
        </div>
      )}
    </div>
  );
}
