import React, { useState, useEffect } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { eventService, type SetListItem } from '../../services/eventService';
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
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

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
  };

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
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let newItems: SetListItem[];
    if (editingId) {
      newItems = items.map(i => i.id === editingId ? { id: editingId, title, composer, duration, notes } : i);
    } else {
      newItems = [...items, { id: crypto.randomUUID(), title, composer, duration, notes }];
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
                      <SortableSetListItem key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </AppCard>

          <AppCard title={editingId ? "Edit Item" : "Add Item"} style={{ flex: 1 }}>
            <form onSubmit={handleFormSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
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
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. A cappella" className="card" style={{ padding: '8px' }} />
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
    </div>
  );
}
