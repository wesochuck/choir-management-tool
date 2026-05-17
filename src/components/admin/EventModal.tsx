import React, { useState, useEffect, useMemo } from 'react';
import type { Event } from '../../services/eventService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { formatPocketBaseError } from '../../lib/pocketbase';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>, bulkConfig?: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Event | null;
  performances: Event[];
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, performances }) => {
  const dialog = useDialog();
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    type: 'Rehearsal',
    details: '',
    parentPerformanceId: '',
  });

  const [shouldBulkAdd, setShouldBulkAdd] = useState(false);
  const [bulkCount, setBulkCount] = useState(8);
  const [bulkDay, setBulkDay] = useState(2); // Tuesday
  const [bulkTime, setBulkTime] = useState('19:00');
  const [bulkLocation, setBulkLocation] = useState('');

  const [isSubmitting, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      const formattedDate = new Date(initialData.date).toISOString().slice(0, 16);
      setFormData({ ...initialData, date: formattedDate });
      setShouldBulkAdd(false);
    } else {
      setFormData({
        title: '',
        date: new Date().toISOString().slice(0, 16),
        location: '',
        type: 'Rehearsal',
        details: '',
        parentPerformanceId: '',
      });
      setBulkLocation('');
      setShouldBulkAdd(false);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!bulkLocation) {
        setBulkLocation(formData.location || '');
    }
  }, [formData.location, bulkLocation]);

  const startDate = useMemo(() => {
    if (!formData.date) return null;
    const current = new Date(formData.date);
    current.setHours(parseInt(bulkTime.split(':')[0]), parseInt(bulkTime.split(':')[1]), 0, 0);

    if (current.getDay() === bulkDay) {
       current.setDate(current.getDate() - 7);
    } else {
      while (current.getDay() !== bulkDay) {
        current.setDate(current.getDate() - 1);
      }
    }
    current.setDate(current.getDate() - (7 * (bulkCount - 1)));
    return current;
  }, [formData.date, bulkCount, bulkDay, bulkTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const bulkConfig = shouldBulkAdd && formData.type === 'Performance' 
        ? { count: bulkCount, dayOfWeek: bulkDay, time: bulkTime, location: bulkLocation }
        : undefined;

      await onSave(formData, bulkConfig);
      onClose();
    } catch (err: any) {
      await dialog.showMessage({
        title: 'Could Not Save Event',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    const shouldDelete = await dialog.confirm({
      title: 'Delete Event',
      message: 'Delete event?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    await onDelete(initialData.id);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Event' : 'Schedule Event'}
      footer={
        <>
          {initialData && onDelete && (
            <button 
              type="button" 
              onClick={handleDelete}
              className="btn btn-danger"
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button 
            type="submit" 
            form="event-form"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : 'Save Event'}
          </button>
        </>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Event Title {formData.type === 'Performance' ? '(Concert Title)' : '(Optional)'}</label>
          <input 
            value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            placeholder={formData.type === 'Performance' ? 'e.g. Spring Gala 2026' : 'e.g. Mid-week Rehearsal'}
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          />
        </div>

        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">Type</label>
            <select 
              value={formData.type} 
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any, parentPerformanceId: e.target.value === 'Performance' ? '' : formData.parentPerformanceId })}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            >
              <option value="Rehearsal">Rehearsal</option>
              <option value="Performance">Performance</option>
            </select>
          </div>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">Date & Time</label>
            <input 
              type="datetime-local"
              value={formData.date} 
              onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
        
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Location</label>
          <input 
            value={formData.location} 
            onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
            required
            placeholder="e.g. Main Sanctuary"
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          />
        </div>

        {formData.type === 'Performance' && !initialData && (
            <div className="flex-col" style={{ backgroundColor: 'var(--bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', gap: 'var(--space-md)' }}>
                <label className="flex-row" style={{ gap: 'var(--space-sm)', cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={shouldBulkAdd} 
                      onChange={(e) => setShouldBulkAdd(e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                    />
                    <span className="text-label">Auto-generate weekly rehearsals?</span>
                </label>

                {shouldBulkAdd && (
                    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                        <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                            <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
                                <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Count</label>
                                <input 
                                  type="number" min="1" max="20"
                                  value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value))}
                                  className="card"
                                  style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                                />
                            </div>
                            <div className="flex-col" style={{ flex: 2, gap: '2px' }}>
                                <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Day</label>
                                <select 
                                  value={bulkDay} onChange={(e) => setBulkDay(parseInt(e.target.value))}
                                  className="card"
                                  style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                                >
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                        <option key={d} value={i}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-col" style={{ flex: 2, gap: '2px' }}>
                                <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Time</label>
                                <input 
                                  type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)}
                                  className="card"
                                  style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                                />
                            </div>
                        </div>
                        <div className="flex-col" style={{ gap: '2px' }}>
                            <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Rehearsal Location</label>
                            <input 
                              value={bulkLocation} onChange={(e) => setBulkLocation(e.target.value)}
                              className="card"
                              style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                            />
                        </div>
                        {startDate && (
                            <div className="badge badge-rehearsal" style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center', textTransform: 'none' }}>
                                📅 First rehearsal: <strong>{startDate.toLocaleDateString()}</strong>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {formData.type === 'Rehearsal' && (
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Linked Performance (Parent)</label>
            <select 
              value={formData.parentPerformanceId} 
              onChange={(e) => setFormData({ ...formData, parentPerformanceId: e.target.value })}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            >
              <option value="">None</option>
              {performances.filter(p => p.id !== initialData?.id).map(p => (
                <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.location}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Details / Notes</label>
          <textarea 
            value={formData.details} 
            onChange={(e) => setFormData({ ...formData, details: e.target.value })} 
            className="card"
            style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', height: '80px', resize: 'vertical' }}
          />
        </div>
      </form>
    </BaseModal>
  );
};
