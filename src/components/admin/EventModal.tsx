import React, { useState, useEffect, useMemo } from 'react';
import type { Event } from '../../services/eventService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>, bulkConfig?: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Event | null;
  performances: Event[];
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, performances }) => {
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    type: 'Rehearsal',
    details: '',
    parentPerformanceId: '',
  });

  // Bulk Rehearsal Config
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

  // Sync bulk location with event location if not touched
  useEffect(() => {
    if (!bulkLocation) {
        setBulkLocation(formData.location || '');
    }
  }, [formData.location]);

  const startDate = useMemo(() => {
    if (!formData.date) return null;
    let current = new Date(formData.date);
    current.setHours(parseInt(bulkTime.split(':')[0]), parseInt(bulkTime.split(':')[1]), 0, 0);

    if (current.getDay() === bulkDay) {
       current.setDate(current.getDate() - 7);
    } else {
      while (current.getDay() !== bulkDay) {
        current.setDate(current.getDate() - 1);
      }
    }
    // Move back the remaining weeks
    current.setDate(current.getDate() - (7 * (bulkCount - 1)));
    return current;
  }, [formData.date, bulkCount, bulkDay, bulkTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const bulkConfig = shouldBulkAdd && formData.type === 'Performance' 
        ? { count: bulkCount, dayOfWeek: bulkDay, time: bulkTime, location: bulkLocation }
        : undefined;

      await onSave(formData, bulkConfig);
      onClose();
    } catch (err) {
      alert('Error saving event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ 
          backgroundColor: 'white', padding: '24px', borderRadius: '8px', 
          width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' 
      }}>
        <h2>{initialData ? 'Edit Event' : 'Schedule Event'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Event Title {formData.type === 'Performance' ? '(Concert Title)' : '(Optional)'}
            </label>
            <input 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder={formData.type === 'Performance' ? 'e.g. Spring Gala 2026' : 'e.g. Mid-week Rehearsal'}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Type</label>
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any, parentPerformanceId: e.target.value === 'Performance' ? '' : formData.parentPerformanceId })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              >
                <option value="Rehearsal">Rehearsal</option>
                <option value="Performance">Performance</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Date & Time</label>
              <input 
                type="datetime-local"
                value={formData.date} 
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Location</label>
            <input 
              value={formData.location} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
              required
              placeholder="e.g. Main Sanctuary"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          {formData.type === 'Performance' && !initialData && (
              <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <input 
                        type="checkbox" 
                        checked={shouldBulkAdd} 
                        onChange={(e) => setShouldBulkAdd(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      Auto-generate weekly rehearsals?
                  </label>

                  {shouldBulkAdd && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ flex: 1 }}>
                                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Count</label>
                                  <input 
                                    type="number" min="1" max="20"
                                    value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                  />
                              </div>
                              <div style={{ flex: 2 }}>
                                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Day</label>
                                  <select 
                                    value={bulkDay} onChange={(e) => setBulkDay(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                  >
                                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                          <option key={d} value={i}>{d}</option>
                                      ))}
                                  </select>
                              </div>
                              <div style={{ flex: 2 }}>
                                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Time</label>
                                  <input 
                                    type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                  />
                              </div>
                          </div>
                          <div>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Rehearsal Location</label>
                              <input 
                                value={bulkLocation} onChange={(e) => setBulkLocation(e.target.value)}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                              />
                          </div>
                          {startDate && (
                              <div style={{ fontSize: '12px', color: '#2c5282', backgroundColor: '#ebf8ff', padding: '8px', borderRadius: '4px' }}>
                                  📅 First rehearsal will be on <strong>{startDate.toLocaleDateString()}</strong>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )}

          {formData.type === 'Rehearsal' && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Linked Performance (Parent)</label>
              <select 
                value={formData.parentPerformanceId} 
                onChange={(e) => setFormData({ ...formData, parentPerformanceId: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              >
                <option value="">None</option>
                {performances.filter(p => p.id !== initialData?.id).map(p => (
                  <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.location}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Details/Notes</label>
            <textarea 
              value={formData.details} 
              onChange={(e) => setFormData({ ...formData, details: e.target.value })} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', height: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            {initialData && onDelete && (
               <button 
                type="button" 
                onClick={() => { if(confirm('Delete event?')) onDelete(initialData.id).then(onClose) }} 
                style={{ marginRight: 'auto', padding: '8px 16px', borderRadius: '4px', border: 'none', color: '#c53030' }}
               >
                 Delete
               </button>
            )}
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none' }}>Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: '#3182ce', color: 'white', border: 'none' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
