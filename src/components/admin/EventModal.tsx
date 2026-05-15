import React, { useState, useEffect } from 'react';
import type { Event } from '../../services/eventService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>) => Promise<void>;
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
  const [isSubmitting, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      // PocketBase dates are strings, but datetime-local needs YYYY-MM-DDTHH:mm
      const formattedDate = new Date(initialData.date).toISOString().slice(0, 16);
      setFormData({ ...initialData, date: formattedDate });
    } else {
      setFormData({
        title: '',
        date: new Date().toISOString().slice(0, 16),
        location: '',
        type: 'Rehearsal',
        details: '',
        parentPerformanceId: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
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
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '500px' }}>
        <h2>{initialData ? 'Edit Event' : 'Schedule Event'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>Event Title {formData.type === 'Performance' ? '(Concert Title)' : '(Optional)'}</label>
            <input 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder={formData.type === 'Performance' ? 'e.g. Spring Gala 2026' : 'e.g. Mid-week Rehearsal'}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Type</label>
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
              <label style={{ display: 'block', marginBottom: '4px' }}>Date & Time</label>
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
            <label style={{ display: 'block', marginBottom: '4px' }}>Location</label>
            <input 
              value={formData.location} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
              required
              placeholder="e.g. Main Sanctuary"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          {formData.type === 'Rehearsal' && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px' }}>Linked Performance (Parent)</label>
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
            <label style={{ display: 'block', marginBottom: '4px' }}>Details/Notes</label>
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
