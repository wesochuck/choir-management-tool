import React, { useState, useEffect, useMemo } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { eventService, type SetListItem } from '../../services/eventService';
import { findPieceDetails, formatPerformanceHistory } from '../../lib/musicPieceUtils';
import { BaseModal } from '../../components/common/BaseModal';
import { musicLibraryService, type MusicPiece } from '../../services/musicLibraryService';
import { AppCard } from '../../components/common/AppCard';
import { SortableSetListItem } from '../../components/admin/SortableSetListItem';
import { useDialog } from '../../contexts/DialogContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function SetListView() {
  const { events, refresh } = useEvents();
  const dialog = useDialog();
  
  const [selectedEventId, setSelectedEventId] = useState('');
  const [items, setItems] = useState<SetListItem[]>([]);
  const [library, setLibrary] = useState<MusicPiece[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [pieceId, setPieceId] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedPieceForDetail, setSelectedPieceForDetail] = useState<MusicPiece | null>(null);

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
  };

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

  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find(e => e.id === selectedEventId);
      setItems(ev?.setList || []);
    } else {
      setItems([]);
    }
    resetForm();
  }, [selectedEventId, events]);

  const handleEdit = (item: SetListItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setComposer(item.composer || '');
    setDuration(item.duration || '');
    setNotes(item.notes || '');
    setPieceId(item.pieceId || '');
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
    if (editingId) {
      newItems = items.map(i => i.id === editingId ? { id: editingId, title, composer, duration, notes, pieceId: pieceId || undefined } : i);
    } else {
      newItems = [...items, { id: crypto.randomUUID(), title, composer, duration, notes, pieceId: pieceId || undefined }];
    }
    setItems(newItems);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveToEvent = async () => {
    if (!selectedEventId) return;
    setIsSaving(true);
    try {
      await eventService.updateEvent(selectedEventId, { setList: items });
      await refresh();
      await dialog.showMessage({ title: 'Success', message: 'Set list saved.', variant: 'info' });
    } catch {
      await dialog.showMessage({ title: 'Error', message: 'Failed to save set list.', variant: 'danger' });
    } finally {
      setIsSaving(false);
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
          // generate new IDs for copied items
          const copied = sourceEvent.setList.map(i => ({...i, id: crypto.randomUUID()}));
          setItems(copied);
      }
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Set Lists</h1>
        {selectedEventId && (
          <button className="btn btn-primary" onClick={saveToEvent} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save to Event'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
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
                  style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
                >
                  <option value="">-- Select Source --</option>
                  {events.filter(e => e.id !== selectedEventId && e.setList && e.setList.length > 0).map(e => (
                    <option key={e.id} value={e.id}>{e.title || new Date(e.date).toLocaleDateString()}</option>
                  ))}
                </select>
            </div>
          )}
      </div>

      {selectedEventId ? (
        <div className="flex-responsive" style={{ alignItems: 'flex-start', gap: 'var(--space-xl)' }}>
          
          <AppCard title="Current Set List" style={{ flex: 2 }}>
            <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
              {items.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>No items in set list.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    {items.map((item) => (
                      <SortableSetListItem 
                        key={item.id} 
                        item={item} 
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

          <AppCard title={editingId ? "Edit Item" : "Add Item"} style={{ flex: 1 }}>
            <form onSubmit={handleFormSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
              {library.length > 0 && (
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
                <label className="text-label">Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="card" style={{ padding: '8px' }} />
              </div>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Composer/Arranger (Optional)</label>
                <input value={composer} onChange={e => setComposer(e.target.value)} className="card" style={{ padding: '8px' }} />
              </div>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Duration (Optional)</label>
                <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3:30" className="card" style={{ padding: '8px' }} />
              </div>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Notes (Optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. A cappella, or medley titles" className="card" style={{ padding: '8px' }} />
                <span className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  If this is a medley, please list the names of the different pieces here.
                </span>
              </div>
              <div className="flex-row" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingId ? 'Update' : 'Add'}</button>
                {editingId && <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>}
              </div>
            </form>
          </AppCard>

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
