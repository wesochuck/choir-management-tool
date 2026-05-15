import React, { useState, useEffect } from 'react';
import type { Event } from '../../services/eventService';

interface BulkEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (performance: Event, config: any) => Promise<void>;
  performances: Event[];
  initialPerformance?: Event | null;
}

export const BulkEventModal: React.FC<BulkEventModalProps> = ({ isOpen, onClose, onSave, performances, initialPerformance }) => {
  const [selectedPerformanceId, setSelectedPerformanceId] = useState(initialPerformance?.id || '');
  const [count, setCount] = useState(8);
  const [dayOfWeek, setDayOfWeek] = useState(2); // Tuesday default
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPerformance) {
        setSelectedPerformanceId(initialPerformance.id);
        setLocation(initialPerformance.location || '');
      } else {
        setSelectedPerformanceId('');
        setLocation('');
      }
    }
  }, [isOpen, initialPerformance]);

  const handlePerformanceChange = (id: string) => {
    setSelectedPerformanceId(id);
    const p = performances.find(perf => perf.id === id);
    if (p) {
      setLocation(p.location || '');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const performance = performances.find(p => p.id === selectedPerformanceId);
    if (!performance) return alert("Select a performance");

    setIsLoading(true);
    try {
      await onSave(performance, { count, dayOfWeek, time, location });
      onClose();
    } catch (err) {
      alert("Error generating rehearsals");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100
    }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '450px' }}>
        <h2>Bulk Add Rehearsals</h2>
        <p style={{ fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
          Quickly generate a series of weekly rehearsals leading up to a performance.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Target Performance</label>
            <select 
              value={selectedPerformanceId} 
              onChange={(e) => handlePerformanceChange(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            >
              <option value="">-- Select Performance --</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} ({p.location})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Rehearsal Location</label>
            <input 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              required
              placeholder="e.g. Rehearsal Hall"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Number of Rehearsals</label>
              <input 
                type="number" 
                value={count} 
                onChange={(e) => setCount(parseInt(e.target.value))} 
                min="1" max="20"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
            </div>
            <div style={{ flex: 1 }}>
               <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Rehearsal Time</label>
               <input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
                required
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Day of Week</label>
            <select 
              value={dayOfWeek} 
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '4px', border: 'none' }}>Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '10px 20px', borderRadius: '4px', backgroundColor: '#38a169', color: 'white', border: 'none', fontWeight: 'bold' }}
            >
              {isSubmitting ? 'Generating...' : 'Generate Rehearsals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
