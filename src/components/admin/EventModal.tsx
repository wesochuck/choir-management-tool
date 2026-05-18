import React, { useState, useEffect, useMemo } from 'react';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import type { Venue } from '../../services/venueService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { formatPocketBaseError } from '../../lib/pocketbase';
import { settingsService } from '../../services/settingsService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>, bulkConfig?: BulkRehearsalConfig, openAuditions?: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Event | null;
  performances: Event[];
  venues: Venue[];
  onAddVenue: (data: Partial<Venue>) => Promise<Venue>;
}

export const EventModal: React.FC<EventModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  initialData, 
  performances,
  venues,
  onAddVenue
}) => {
  const dialog = useDialog();
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    type: 'Rehearsal',
    details: '',
    parentPerformanceId: '',
    venue: '',
  });

  const [shouldBulkAdd, setShouldBulkAdd] = useState(false);
  const [isOpenAuditions, setIsOpenAuditions] = useState(false);
  const [bulkCount, setBulkCount] = useState(8);
  const [bulkDay, setBulkDay] = useState(2); // Tuesday
  const [bulkTime, setBulkTime] = useState('19:00');
  const [bulkVenue, setBulkVenue] = useState('');

  const [isSubmitting, setIsLoading] = useState(false);

  // Inline Quick-Add Venue States
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueRows, setNewVenueRows] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [isSavingVenue, setIsSavingVenue] = useState(false);

  useEffect(() => {
    if (initialData) {
      const formattedDate = new Date(initialData.date).toISOString().slice(0, 16);
      setFormData({ ...initialData, date: formattedDate });
      setShouldBulkAdd(false);
    } else {
      setFormData({
        title: '',
        date: new Date().toISOString().slice(0, 16),
        type: 'Rehearsal',
        details: '',
        parentPerformanceId: '',
        venue: '',
      });
      setBulkVenue('');
      setShouldBulkAdd(false);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsAddingNewVenue(false);
      setNewVenueName('');
      setNewVenueRows('');
      setNewVenueAddress('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!bulkVenue && formData.venue) {
        setBulkVenue(formData.venue);
    }
  }, [formData.venue, bulkVenue]);

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

  useEffect(() => {
    if (isOpen && initialData && initialData.type === 'Performance') {
      settingsService.getAuditionSettings().then(settings => {
        if (settings.enabled && settings.defaultPerformanceId === initialData.id) {
          setIsOpenAuditions(true);
        } else {
          setIsOpenAuditions(false);
        }
      });
    } else if (isOpen) {
      setIsOpenAuditions(false);
    }
  }, [initialData, isOpen]);

  const handleCreateVenueInline = async () => {
    if (!newVenueName.trim() || !newVenueRows.trim()) return;
    const rowCounts = newVenueRows
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
      
    if (rowCounts.length === 0) {
      await dialog.showMessage({
        title: 'Invalid Capacities',
        message: 'Please enter valid row capacities separated by commas (e.g. 10, 12, 14).',
        variant: 'danger',
      });
      return;
    }

    setIsSavingVenue(true);
    try {
      const created = await onAddVenue({ 
        name: newVenueName.trim(), 
        rowCounts,
        address: newVenueAddress.trim() || undefined
      });
      setFormData(prev => ({
        ...prev,
        venue: created.id,
      }));
      setIsAddingNewVenue(false);
      setNewVenueName('');
      setNewVenueRows('');
      setNewVenueAddress('');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Add Venue',
        message: err instanceof Error ? err.message : 'Error saving inline venue',
        variant: 'danger',
      });
    } finally {
      setIsSavingVenue(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const bulkConfig: BulkRehearsalConfig | undefined = shouldBulkAdd && formData.type === 'Performance' 
        ? { count: bulkCount, dayOfWeek: bulkDay, time: bulkTime, venue: bulkVenue }
        : undefined;

      await onSave(formData, bulkConfig, isOpenAuditions);
      onClose();
    } catch (err: unknown) {
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
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Performance' | 'Rehearsal', parentPerformanceId: e.target.value === 'Performance' ? '' : formData.parentPerformanceId })}
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

        <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
          <input
            type="checkbox"
            checked={formData.isOpenForRSVP || false}
            onChange={(e) => setFormData({ ...formData, isOpenForRSVP: e.target.checked })}
            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
          />
          <span className="text-label">Open for RSVP Links</span>
        </label>

        
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Venue</label>
          <select
            value={formData.venue || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'new') {
                setIsAddingNewVenue(true);
              } else {
                setFormData({ 
                  ...formData, 
                  venue: val
                });
              }
            }}
            required
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          >
            <option value="">-- Select Venue --</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value="new" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Add New Venue...</option>
          </select>
        </div>

        {isAddingNewVenue && (
          <div className="flex-col" style={{ 
            gap: 'var(--space-md)', 
            backgroundColor: 'rgba(107, 70, 193, 0.05)', 
            padding: 'var(--space-md)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px dashed var(--primary)',
            marginTop: '-4px'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>✨ Create New Venue Template Inline</div>
            
            <div className="flex-responsive" style={{ gap: 'var(--space-md)', width: '100%' }}>
              <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                <label className="text-muted text-xs" style={{ fontWeight: 600 }}>Venue Name</label>
                <input 
                  value={newVenueName} 
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="e.g. Grace Hall"
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '36px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>
              <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                <label className="text-muted text-xs" style={{ fontWeight: 600 }}>Row Capacities (e.g. 10, 12, 14)</label>
                <input 
                  value={newVenueRows} 
                  onChange={(e) => setNewVenueRows(e.target.value)}
                  placeholder="e.g. 8, 10, 12"
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '36px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)', width: '100%' }}>
              <label className="text-muted text-xs" style={{ fontWeight: 600 }}>Venue Address (Optional, for Google Maps)</label>
              <input 
                value={newVenueAddress} 
                onChange={(e) => setNewVenueAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Anytown, ST 12345"
                className="card"
                style={{ width: '100%', padding: '0 8px', height: '36px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
              />
            </div>

            <div className="flex-row" style={{ gap: 'var(--space-sm)', justifyContent: 'flex-end', width: '100%' }}>
              <button 
                type="button" 
                onClick={() => setIsAddingNewVenue(false)}
                className="btn btn-ghost btn-sm"
                style={{ height: '28px', padding: '0 12px', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCreateVenueInline}
                disabled={isSavingVenue || !newVenueName.trim() || !newVenueRows.trim()}
                className="btn btn-primary btn-sm"
                style={{ height: '28px', padding: '0 12px', fontSize: '0.8rem' }}
              >
                {isSavingVenue ? 'Adding...' : 'Add & Select Venue'}
              </button>
            </div>
          </div>
        )}

        {formData.type === 'Performance' && (
          <div className="flex-col" style={{ 
            backgroundColor: 'rgba(255, 138, 101, 0.05)', 
            padding: 'var(--space-md)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px dashed #ff8a65',
            gap: 'var(--space-sm)'
          }}>
            <label className="flex-row" style={{ gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isOpenAuditions} 
                onChange={(e) => setIsOpenAuditions(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#ff8a65' }}
              />
              <div className="flex-col" style={{ gap: 0 }}>
                <span className="text-label" style={{ fontWeight: 700, color: '#e64a19' }}>Open Public Auditions?</span>
                <span className="text-xs text-muted">If checked, this performance will be the target for new audition requests.</span>
              </div>
            </label>
          </div>
        )}

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
                            <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Rehearsal Venue</label>
                            <select 
                              value={bulkVenue} onChange={(e) => setBulkVenue(e.target.value)}
                              required
                              className="card"
                              style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                            >
                                <option value="">-- Select Rehearsal Venue --</option>
                                {venues.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
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
                <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.expand?.venue?.name || ''}</option>
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
