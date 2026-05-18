import React, { useState, useEffect } from 'react';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import type { Venue } from '../../services/venueService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';

interface BulkEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (performance: Event, config: BulkRehearsalConfig) => Promise<void>;
  performances: Event[];
  venues: Venue[];
  initialPerformance?: Event | null;
}

export const BulkEventModal: React.FC<BulkEventModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  performances, 
  venues, 
  initialPerformance 
}) => {
  const dialog = useDialog();
  const [selectedPerformanceId, setSelectedPerformanceId] = useState(initialPerformance?.id || '');
  const [count, setCount] = useState(8);
  const [dayOfWeek, setDayOfWeek] = useState(2); // Tuesday default
  const [time, setTime] = useState('19:00');
  const [venue, setVenue] = useState('');
  const [isSubmitting, setIsLoading] = useState(false);

  const selectedPerformance = performances.find(p => p.id === selectedPerformanceId);

  const calculateRehearsalRange = (): { first: Date; last: Date } | null => {
    if (!selectedPerformance || !selectedPerformance.date) return null;
    const performanceDate = new Date(selectedPerformance.date);
    if (isNaN(performanceDate.getTime())) return null;

    const [hours, minutes] = (time || '19:00').split(':').map(n => parseInt(n));
    const current = new Date(performanceDate);
    current.setHours(isNaN(hours) ? 19 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);

    // Roll back to the last rehearsal date
    if (current.getDay() === dayOfWeek) {
      current.setDate(current.getDate() - 7);
    } else {
      let safety = 0;
      while (current.getDay() !== dayOfWeek && safety < 7) {
        current.setDate(current.getDate() - 1);
        safety++;
      }
    }

    const last = new Date(current);

    // Now roll back count - 1 weeks to find the first rehearsal
    const validCount = isNaN(count) ? 1 : count;
    if (validCount > 1) {
      current.setDate(current.getDate() - (validCount - 1) * 7);
    }
    const first = new Date(current);

    return { first, last };
  };

  const range = calculateRehearsalRange();

  useEffect(() => {
    if (isOpen) {
      if (initialPerformance) {
        setSelectedPerformanceId(initialPerformance.id);
        setVenue(initialPerformance.venue || '');
      } else {
        setSelectedPerformanceId('');
        setVenue('');
      }
    }
  }, [isOpen, initialPerformance]);

  const handlePerformanceChange = (id: string) => {
    setSelectedPerformanceId(id);
    const p = performances.find(perf => perf.id === id);
    if (p) {
      setVenue(p.venue || '');
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

    if (!venue) {
      await dialog.showMessage({
        title: 'Select Venue',
        message: 'Please select a rehearsal venue template.',
        variant: 'danger',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave(performance, { count, dayOfWeek, time, venue });
      onClose();
    } catch (err: unknown) {
      console.error("Bulk generate error:", err);
      await dialog.showMessage({
        title: 'Could Not Generate Rehearsals',
        message: "Error generating rehearsals: " + (err instanceof Error ? err.message : "Unknown error"),
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
              <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} ({p.expand?.venue?.name || ''})</option>
            ))}
          </select>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Rehearsal Venue</label>
          <select 
            value={venue} 
            onChange={(e) => setVenue(e.target.value)} 
            required
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          >
            <option value="">-- Select Rehearsal Venue --</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
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

        {range && selectedPerformance && (
          <div 
            className="card" 
            style={{ 
              backgroundColor: 'var(--primary-light)', 
              borderColor: 'rgba(74, 124, 89, 0.2)', 
              padding: '12px var(--space-md)', 
              borderRadius: 'var(--radius-md)', 
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginTop: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-deep)', fontWeight: 600, fontSize: '0.875rem' }}>
              <span style={{ fontSize: '1.1rem' }}>📅</span> Rehearsal Schedule Preview
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.4 }}>
              First Rehearsal: <strong style={{ color: 'var(--primary-deep)' }}>{range.first.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.4 }}>
              Last Rehearsal: <strong style={{ color: 'var(--primary-deep)' }}>{range.last.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px', fontStyle: 'italic' }}>
              Generates {count} weekly rehearsals leading up to the performance on {new Date(selectedPerformance.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
};
