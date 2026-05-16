import React, { useState, useEffect } from 'react';
import type { Event } from '../../services/eventService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';

interface BulkEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (performance: Event, config: any) => Promise<void>;
  performances: Event[];
  initialPerformance?: Event | null;
}

export const BulkEventModal: React.FC<BulkEventModalProps> = ({ isOpen, onClose, onSave, performances, initialPerformance }) => {
  const dialog = useDialog();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const performance = performances.find(p => p.id === selectedPerformanceId);
    if (!performance) {
      await dialog.showMessage({
        title: 'Select Performance',
        message: 'Select a performance',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave(performance, { count, dayOfWeek, time, location });
      onClose();
    } catch (err: any) {
      console.error("Bulk generate error:", err);
      await dialog.showMessage({
        title: 'Could Not Generate Rehearsals',
        message: "Error generating rehearsals: " + (err.message || "Unknown error"),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Add Rehearsals"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button 
            type="submit" 
            form="bulk-event-form"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Generating...' : 'Generate Rehearsals'}
          </button>
        </>
      }
      maxWidth="480px"
    >
      <p className="text-muted text-sm">
        Quickly generate a series of weekly rehearsals leading up to a performance.
      </p>

      <form id="bulk-event-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Target Performance</label>
          <select 
            value={selectedPerformanceId} 
            onChange={(e) => handlePerformanceChange(e.target.value)}
            required
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          >
            <option value="">-- Select Performance --</option>
            {performances.map(p => (
              <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} ({p.location})</option>
            ))}
          </select>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Rehearsal Location</label>
          <input 
            value={location} 
            onChange={(e) => setLocation(e.target.value)} 
            required
            placeholder="e.g. Rehearsal Hall"
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          />
        </div>

        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">Count</label>
            <input 
              type="number" 
              value={count} 
              onChange={(e) => setCount(parseInt(e.target.value))} 
              min="1" max="20"
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
             <label className="text-label">Time</label>
             <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Day of Week</label>
          <select 
            value={dayOfWeek} 
            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
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
      </form>
    </BaseModal>
  );
};
