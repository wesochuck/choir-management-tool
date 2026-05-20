import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { eventService, type SetListItem } from '../../services/eventService';
import { findPieceDetails, formatPerformanceHistory, linkSetListItemToPiece, validatePieceForLibrary, parseDurationToSeconds, formatSecondsToDuration } from '../../lib/musicPieceUtils';
import { BaseModal } from '../../components/common/BaseModal';
import { musicLibraryService, type MusicPiece } from '../../services/musicLibraryService';
import { AppCard } from '../../components/common/AppCard';
import { SortableSetListItem } from '../../components/admin/SortableSetListItem';
import { useDialog } from '../../contexts/DialogContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { findNearestEvent } from '../../lib/eventUtils';

export default function SetListView() {
  const { events, refresh } = useEvents();
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

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      const nearest = findNearestEvent(events);
      if (nearest) {
        setSelectedEventId(nearest.id);
        hasDefaultedRef.current = true;
      }
    }
  }, [events, selectedEventId]);
  const [items, setItems] = useState<SetListItem[]>([]);
  const [library, setLibrary] = useState<MusicPiece[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isHoveredVisibility, setIsHoveredVisibility] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [pieceId, setPieceId] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedPieceForDetail, setSelectedPieceForDetail] = useState<MusicPiece | null>(null);
  const [type, setType] = useState<'song' | 'intermission'>('song');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setComposer('');
    setDuration('');
    setNotes('');
    setPieceId('');
    setLibrarySearch('');
    setType('song');
  };

  const handleTypeChange = (newType: 'song' | 'intermission') => {
    setType(newType);
    if (newType === 'intermission') {
      if (!title.trim() || title === '') {
        setTitle('Intermission');
      }
      setComposer('');
      setPieceId('');
      setLibrarySearch('');
    } else {
      if (title === 'Intermission') {
        setTitle('');
      }
    }
  };

  // Auto-saves any modifications to pocketbase
  const saveSetList = async (newItems: SetListItem[]) => {
    if (!selectedEventId) return;
    setSaveStatus('saving');
    try {
      await eventService.updateEvent(selectedEventId, { setList: newItems });
      await refresh();
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save set list:', error);
      setSaveStatus('error');
    }
  };

  const updateItems = (newItems: SetListItem[]) => {
    setItems(newItems);
    saveSetList(newItems);
  };

  // Cumulative duration totals incorporating resolved library pieces
  const durationTotals = useMemo(() => {
    let songsSeconds = 0;
    let intermissionSeconds = 0;
    items.forEach(item => {
      const linkedPiece = item.pieceId ? library.find(p => p.id === item.pieceId) : null;
      const rawDuration = item.duration || linkedPiece?.duration || '';
      const sec = parseDurationToSeconds(rawDuration);
      if (item.type === 'intermission') {
        intermissionSeconds += sec;
      } else {
        songsSeconds += sec;
      }
    });
    return {
      songs: formatSecondsToDuration(songsSeconds),
      intermissions: formatSecondsToDuration(intermissionSeconds),
      total: formatSecondsToDuration(songsSeconds + intermissionSeconds)
    };
  }, [items, library]);

  // Resolves linked music library piece info and computes running timestamps
  const itemsWithDetails = useMemo(() => {
    return items.reduce<Array<typeof items[number] & {
      displayTitle: string;
      displayComposer: string;
      displayDuration: string;
      cumulativeStart: string;
      cumulativeEnd: string;
    }>>((acc, item) => {
      const linkedPiece = item.pieceId ? library.find(p => p.id === item.pieceId) : null;
      
      const displayTitle = item.title || linkedPiece?.title || '';
      const displayComposer = item.type === 'song' ? (item.composer || linkedPiece?.composer || '') : '';
      const rawDuration = item.duration || linkedPiece?.duration || '';
      const durationSeconds = parseDurationToSeconds(rawDuration);
      
      const previousEnd = acc.length > 0 ? parseDurationToSeconds(acc[acc.length - 1].cumulativeEnd) : 0;
      const endSec = previousEnd + durationSeconds;

      acc.push({
        ...item,
        displayTitle,
        displayComposer,
        displayDuration: rawDuration ? formatSecondsToDuration(durationSeconds) : '',
        cumulativeStart: formatSecondsToDuration(previousEnd),
        cumulativeEnd: formatSecondsToDuration(endSec)
      });
      return acc;
    }, []);
  }, [items, library]);

  const filteredLibrary = useMemo(() => {
    return library
      .filter(p => {
        if (p.id === pieceId) return true;
        const query = librarySearch.toLowerCase();
        return p.title.toLowerCase().includes(query) || (p.composer && p.composer.toLowerCase().includes(query));
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [library, librarySearch, pieceId]);

  // Auto-select first matching piece when user filters the library
  useEffect(() => {
    const query = librarySearch.trim().toLowerCase();
    if (query && filteredLibrary.length > 0) {
      const firstMatch = filteredLibrary.find(p => 
        p.title.toLowerCase().includes(query) || 
        (p.composer && p.composer.toLowerCase().includes(query))
      );
      if (firstMatch && pieceId !== firstMatch.id) {
        setPieceId(firstMatch.id);
        setTitle(firstMatch.title);
        if (firstMatch.composer) setComposer(firstMatch.composer);
        if (firstMatch.duration) setDuration(firstMatch.duration);
      }
    }
  }, [librarySearch, filteredLibrary, pieceId]);

  useEffect(() => {
    musicLibraryService.getLibrary().then(setLibrary).catch(() => {});
  }, []);

  // Load event items ONLY when selectedEventId changes (NOT when global events state changes, to prevent resetting active edits)
  useEffect(() => {
    if (selectedEventId) {
      const ev = eventsRef.current.find(e => e.id === selectedEventId);
      setItems(ev?.setList || []);
    } else {
      setItems([]);
    }
    resetForm();
    setSaveStatus(null);
  }, [selectedEventId]);

  const handleEdit = (item: SetListItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setComposer(item.composer || '');
    setDuration(item.duration || '');
    setNotes(item.notes || '');
    setPieceId(item.pieceId || '');
    setType(item.type || 'song');
  };

  const handleConvertToLibraryPiece = async () => {
    if (!editingId) return;
    if (!validatePieceForLibrary(title)) {
      await dialog.showMessage({ title: 'Validation Error', message: 'Please enter a valid title for the library piece.', variant: 'danger' });
      return;
    }

    setIsPromoting(true);
    try {
      const performanceIdToLink = selectedEvent?.type === 'Rehearsal'
        ? (parentPerformance?.id || selectedEvent.parentPerformanceId || selectedEventId)
        : selectedEventId;

      const newPiece = await musicLibraryService.createPiece({
        title: title.trim(),
        composer: composer.trim() || undefined,
        duration: duration.trim() || undefined,
        notes: notes.trim() || undefined,
        performances: performanceIdToLink ? [performanceIdToLink] : undefined,
      });

      const freshLibrary = await musicLibraryService.getLibrary();
      setLibrary(freshLibrary);
      setPieceId(newPiece.id);

      const updatedItems = linkSetListItemToPiece(items, editingId, newPiece.id);
      updateItems(updatedItems);

      await dialog.showMessage({
        title: 'Success',
        message: `"${title}" has been successfully added to the Music Library and linked to this set list item.`,
        variant: 'info'
      });
    } catch (error) {
      console.error('Failed to promote set list piece to library:', error);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to create the music library piece.',
        variant: 'danger'
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleLibrarySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setPieceId(selectedId);
    
    if (selectedId) {
        const piece = library.find(p => p.id === selectedId);
        if (piece) {
            setTitle(piece.title);
            if (piece.composer) setComposer(piece.composer);
            if (piece.duration) setDuration(piece.duration);
        }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let newItems: SetListItem[];
    const itemData: SetListItem = {
      id: editingId || crypto.randomUUID(),
      title: title.trim(),
      composer: type === 'song' ? (composer.trim() || undefined) : undefined,
      duration: duration.trim() || undefined,
      notes: notes.trim() || undefined,
      pieceId: type === 'song' ? (pieceId || undefined) : undefined,
      type
    };

    if (editingId) {
      newItems = items.map(i => i.id === editingId ? itemData : i);
    } else {
      newItems = [...items, itemData];
    }

    // Sync duration changes to the Music Library if it is a linked song
    if (type === 'song' && pieceId) {
      musicLibraryService.updatePiece(pieceId, { duration: duration.trim() || undefined })
        .then(() => musicLibraryService.getLibrary())
        .then(setLibrary)
        .catch(err => console.error('Failed to update music library duration:', err));
    }

    updateItems(newItems);
    resetForm();
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

      <div className="setlist-grid">
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'none' }}
            >
              <option value="">-- Choose Event --</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.title || new Date(e.date).toLocaleDateString()} - {e.type}</option>
              ))}
            </select>
          </div>
          
          {selectedEventId && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
               <label className="text-label">Copy From Previous</label>
               <select 
                  value=""
                  onChange={(e) => handleCopyFrom(e.target.value)}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'none' }}
                >
                  <option value="">-- Select Source --</option>
                  {events.filter(e => e.id !== selectedEventId && e.setList && e.setList.length > 0).map(e => (
                    <option key={e.id} value={e.id}>{e.title || new Date(e.date).toLocaleDateString()}</option>
                  ))}
                </select>
            </div>
          )}

          {selectedEvent && selectedEvent.type === 'Performance' && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Singer Visibility</label>
              <div 
                onMouseEnter={() => setIsHoveredVisibility(true)}
                onMouseLeave={() => setIsHoveredVisibility(false)}
                style={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center', 
                  gap: 'var(--space-md)', 
                  height: '48px', 
                  padding: '0 16px', 
                  border: isHoveredVisibility ? '1px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isHoveredVisibility ? 'var(--primary-light)' : 'var(--surface)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
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

          <div className="setlist-grid" style={{ alignItems: 'flex-start' }}>
          
          <AppCard title="Current Set List" className="setlist-col-span-2">
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

              {items.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>No items in set list.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    {itemsWithDetails.map((item) => (
                      <SortableSetListItem 
                        key={item.id} 
                        item={item} 
                        displayTitle={item.displayTitle}
                        displayComposer={item.displayComposer}
                        displayDuration={item.displayDuration}
                        cumulativeStart={item.cumulativeStart}
                        cumulativeEnd={item.cumulativeEnd}
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                        onPieceClick={(id) => {
                          const piece = findPieceDetails(id, library);
                          if (piece) setSelectedPieceForDetail(piece);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </AppCard>

          <AppCard title={editingId ? "Edit Item" : "Add Item"} className="setlist-col-span-1">
            <form onSubmit={handleFormSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
              
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Item Type</label>
                <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                  <button
                    type="button"
                    className={`btn ${type === 'song' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '38px', height: '38px', padding: 0 }}
                    onClick={() => handleTypeChange('song')}
                  >
                    🎼 Song
                  </button>
                  <button
                    type="button"
                    className={`btn ${type === 'intermission' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '38px', height: '38px', padding: 0 }}
                    onClick={() => handleTypeChange('intermission')}
                  >
                    ⏸️ Intermission
                  </button>
                </div>
              </div>

              {type === 'song' && library.length > 0 && (
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label text-muted">Link to Music Library</label>
                  <div className="flex-col" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search music library..."
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      className="card"
                      style={{ padding: '8px 32px 8px 8px', fontSize: '14px', width: '100%', height: '40px', border: '1px solid var(--border)' }}
                    />
                    {librarySearch && (
                      <button 
                        type="button" 
                        onClick={() => setLibrarySearch('')} 
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontSize: '14px',
                          padding: '4px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select 
                    className="card" 
                    value={pieceId} 
                    onChange={handleLibrarySelect}
                    style={{ padding: '0 8px', height: '40px' }}
                  >
                    <option value="">
                      {librarySearch && filteredLibrary.filter(p => p.id !== pieceId).length === 0 
                        ? '-- No matches found --' 
                        : '-- Custom (No link) --'}
                    </option>
                    {filteredLibrary.map(p => (
                      <option key={p.id} value={p.id}>{p.title} {p.composer ? `(${p.composer})` : ''}</option>
                    ))}
                  </select>
                  {librarySearch && (
                    <span className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      Showing {filteredLibrary.length} of {library.length} items
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">{type === 'song' ? 'Title' : 'Intermission Title'}</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="card" style={{ padding: '8px' }} />
              </div>
              
              {type === 'song' && (
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label">Composer/Arranger (Optional)</label>
                  <input value={composer} onChange={e => setComposer(e.target.value)} className="card" style={{ padding: '8px' }} />
                </div>
              )}

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Duration {type === 'song' ? '(Optional)' : '(e.g. 15 mins)'}</label>
                <input 
                  value={duration} 
                  onChange={e => setDuration(e.target.value)} 
                  placeholder={type === 'song' ? 'e.g. 3:30' : 'e.g. 15:00 or 15'} 
                  className="card" 
                  style={{ padding: '8px' }} 
                />
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Notes (Optional)</label>
                <input 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder={type === 'song' ? 'e.g. A cappella, or medley titles' : 'e.g. Audience stretch, announcements'} 
                  className="card" 
                  style={{ padding: '8px' }} 
                />
                <span className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {type === 'song' 
                    ? 'If this is a medley, please list the names of the different pieces here.'
                    : 'Any announcements or details for the intermission.'}
                </span>
              </div>
              {editingId && !pieceId && (
                <div className="flex-col" style={{ gap: 'var(--space-xs)', padding: 'var(--space-xs) 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: 'var(--space-xs) 0' }}>
                  <span className="text-xs text-muted" style={{ fontWeight: 500 }}>This piece is not linked to the Music Library:</span>
                  <button
                    type="button"
                    onClick={handleConvertToLibraryPiece}
                    disabled={isPromoting}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-deep)',
                      border: '1px solid rgba(74, 124, 89, 0.2)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {isPromoting ? 'Converting...' : '✨ Convert to Library Piece'}
                  </button>
                </div>
              )}
              <div className="flex-row" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingId ? 'Update' : 'Add'}</button>
                {editingId && <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>}
              </div>
            </form>
          </AppCard>

        </div>
      </div>
      ) : (
        <AppCard style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <p className="text-muted">Select an event above to manage its set list.</p>
        </AppCard>
      )}

      <BaseModal
        isOpen={selectedPieceForDetail !== null}
        onClose={() => setSelectedPieceForDetail(null)}
        title="Music Piece Details"
        footer={
          <button className="btn btn-primary" onClick={() => setSelectedPieceForDetail(null)}>
            Close
          </button>
        }
        maxWidth="500px"
      >
        {selectedPieceForDetail && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div>
              <h2 className="text-display" style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>
                {selectedPieceForDetail.title}
              </h2>
              {selectedPieceForDetail.composer && (
                <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '4px' }}>
                  by {selectedPieceForDetail.composer}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-md)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <div className="flex-col" style={{ gap: '4px' }}>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Catalog ID</span>
                <span className="text-body" style={{ fontWeight: 500 }}>{selectedPieceForDetail.catalogId || 'N/A'}</span>
              </div>
              <div className="flex-col" style={{ gap: '4px' }}>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Duration</span>
                <span className="text-body" style={{ fontWeight: 500 }}>{selectedPieceForDetail.duration || 'N/A'}</span>
              </div>
              <div className="flex-col" style={{ gap: '4px' }}>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Physical Copies</span>
                <span className="text-body" style={{ fontWeight: 500 }}>
                  {selectedPieceForDetail.copies !== undefined ? selectedPieceForDetail.copies : 'N/A'}
                </span>
              </div>
            </div>

            {selectedPieceForDetail.notes && (
              <div className="flex-col" style={{ gap: 'var(--space-xs)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Notes & Details</span>
                <div 
                  className="card" 
                  style={{ 
                    padding: 'var(--space-sm) var(--space-md)', 
                    backgroundColor: 'rgba(74, 124, 89, 0.05)', 
                    borderLeft: '4px solid var(--primary)', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {selectedPieceForDetail.notes}
                </div>
              </div>
            )}

            {formatPerformanceHistory(selectedPieceForDetail).length > 0 && (
              <div className="flex-col" style={{ gap: 'var(--space-xs)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Performance History</span>
                <div className="flex-row" style={{ gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {formatPerformanceHistory(selectedPieceForDetail).map((perfStr, idx) => {
                    return (
                      <span 
                        key={idx} 
                        className="badge badge-performance" 
                        style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem', 
                          fontWeight: 500,
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary-deep)',
                          border: '1px solid rgba(74, 124, 89, 0.15)'
                        }}
                      >
                        {perfStr}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </BaseModal>
    </div>
  );
}
