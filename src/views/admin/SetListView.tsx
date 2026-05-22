import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { eventService, type SetListItem } from '../../services/eventService';
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

export default function SetListView() {
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

  // Cumulative duration totals incorporating resolved library pieces
  const durationTotals = useMemo(() => {
    return calculateSetListDurationTotals(items, library);
  }, [items, library]);

  // Resolves linked music library piece info and computes running timestamps
  const itemsWithDetails = useMemo(() => {
    return resolveSetListDisplayRows(items, library);
  }, [items, library]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-md)' }}>
          <h1 className="text-display" style={{ margin: 0 }}>Set Lists</h1>
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
      </div>

      <div className="flex-responsive" style={{ gap: 'var(--space-md)', alignItems: 'flex-end' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)', flex: 1 }}>
            <label className="text-label">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'none' }}
            >
              <option value="">-- Choose Event --</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.date.split(' ')[0]} - {e.title || e.type}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Copy from Previous</label>
              <select 
                value="" 
                onChange={(e) => handleCopyFrom(e.target.value)}
                className="card"
                style={{ width: '240px', padding: '0 12px', height: '48px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'none' }}
              >
                <option value="">-- Copy Set List --</option>
                {events.filter(e => e.id !== selectedEventId && e.setList && e.setList.length > 0).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.date.split(' ')[0]} - {e.title || e.type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedEvent && selectedEvent.type === 'Performance' && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Singer Visibility</label>
              <div 
                className="card"
                style={{ 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 16px',
                  backgroundColor: selectedEvent.setListApproved !== false ? 'rgba(74, 124, 89, 0.1)' : 'var(--surface)',
                  border: selectedEvent.setListApproved !== false ? '1px solid var(--primary)' : '1px solid var(--border)',
                  transition: 'all 0.2s'
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
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Parent Set List</label>
              {parentPerformance ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedEventId(parentPerformance.id)}
                  style={{
                    height: '48px',
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
                    height: '48px', 
                    padding: '0 12px', 
                    fontSize: 'var(--font-size-label)', 
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface)'
                  }}
                >
                  No parent Performance linked
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
                  <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    {itemsWithDetails.map((item) => (
                      <SortableSetListItem 
                        key={item.id} 
                        item={item} 
                        linkedPiece={item.pieceId ? library.find(p => p.id === item.pieceId) : undefined}
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
    </div>
  );
}
