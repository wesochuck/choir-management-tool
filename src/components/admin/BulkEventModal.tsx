import React, { useState, useEffect, useMemo } from 'react';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import type { Venue } from '../../services/venueService';
import { useDialog } from '../../contexts/DialogContext';
import { Modal, Button, Select, Input } from '../ui';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone, zonedInputValueToUtc } from '../../lib/timezone';


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
  const { timezone } = useChoirSettings();
  const [selectedPerformanceId, setSelectedPerformanceId] = useState(initialPerformance?.id || '');
  const [count, setCount] = useState(8);
  const [dayOfWeek, setDayOfWeek] = useState(2); // Tuesday default
  const [time, setTime] = useState('19:00');
  const [venue, setVenue] = useState('');
  const [isSubmitting, setIsLoading] = useState(false);

  const selectedPerformance = performances.find(p => p.id === selectedPerformanceId);

  const calculateRehearsalRange = (): { first: string; last: string } | null => {
    if (!selectedPerformance || !selectedPerformance.date) return null;
    let dateObj: Date;
    try {
      dateObj = new Date(selectedPerformance.date);
      if (isNaN(dateObj.getTime())) return null;
    } catch {
      return null;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour12: false
    });
    let parts;
    try {
      parts = formatter.formatToParts(dateObj);
    } catch {
      return null;
    }
    const getPart = (type: string) => Number(parts.find(p => p.type === type)?.value || '0');

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');

    const localPerfDate = new Date(year, month - 1, day);

    // Roll back to the last rehearsal date
    const current = new Date(localPerfDate);
    if (current.getDay() === dayOfWeek) {
      current.setDate(current.getDate() - 7);
    } else {
      let safety = 0;
      while (current.getDay() !== dayOfWeek && safety < 7) {
        current.setDate(current.getDate() - 1);
        safety++;
      }
    }

    const lastYear = current.getFullYear();
    const lastMonth = String(current.getMonth() + 1).padStart(2, '0');
    const lastDay = String(current.getDate()).padStart(2, '0');
    const lastUtc = zonedInputValueToUtc(`${lastYear}-${lastMonth}-${lastDay}T${time}`, timezone);

    // Now roll back count - 1 weeks to find the first rehearsal
    const validCount = isNaN(count) ? 1 : count;
    if (validCount > 1) {
      current.setDate(current.getDate() - (validCount - 1) * 7);
    }
    const firstYear = current.getFullYear();
    const firstMonth = String(current.getMonth() + 1).padStart(2, '0');
    const firstDay = String(current.getDate()).padStart(2, '0');
    const firstUtc = zonedInputValueToUtc(`${firstYear}-${firstMonth}-${firstDay}T${time}`, timezone);

    return { first: firstUtc, last: lastUtc };
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
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
      dialog.showToast(`Successfully generated ${count} rehearsals.`);
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

  const isDirty = useMemo(() => {
    const hasPerformance = Boolean(selectedPerformanceId !== (initialPerformance?.id || ''));
    const hasVenue = Boolean(venue !== (initialPerformance?.venue || ''));
    const isCountChanged = count !== 8;
    const isDayChanged = dayOfWeek !== 2;
    const isTimeChanged = time !== '19:00';
    return hasPerformance || hasVenue || isCountChanged || isDayChanged || isTimeChanged;
  }, [selectedPerformanceId, venue, count, dayOfWeek, time, initialPerformance]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved selections in this bulk generator. Do you want to discard them?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Add Rehearsals"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
          <Button 
            disabled={isSubmitting}
            variant="primary"
            loading={isSubmitting}
            onClick={() => handleSubmit()}
          >
            Generate Rehearsals
          </Button>
        </div>
      }
      maxWidth="480px"
    >
      <p className="text-muted text-sm">
        Quickly generate a series of weekly rehearsals leading up to a performance.
      </p>

      <form id="bulk-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-label">Target Performance</label>
          <Select 
            value={selectedPerformanceId} 
            onChange={(e) => handlePerformanceChange(e.target.value)}
            required
            className="w-full"
          >
            <option value="">-- Select Performance --</option>
            {performances.map(p => (
              <option key={p.id} value={p.id}>
                {p.title || formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} ({p.expand?.venue?.name || ''})
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label">Rehearsal Venue</label>
          <Select 
            value={venue} 
            onChange={(e) => setVenue(e.target.value)} 
            required
            className="w-full"
          >
            <option value="">-- Select Rehearsal Venue --</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-label">Count</label>
            <Input 
              type="number" 
              value={count} 
              onChange={(e) => setCount(parseInt(e.target.value))} 
              min="1" max="20"
              
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
             <label className="text-label">Time</label>
             <Input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              required
              
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label">Day of Week</label>
          <Select 
            value={dayOfWeek} 
            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
            className="w-full"
          >
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
          </Select>
        </div>

        {range && selectedPerformance && (
          <div className="mt-1 flex flex-col gap-1 rounded-md border border-[rgba(74,124,89,0.2)] bg-primary-light p-3 px-4 shadow-none">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-deep">
              <span className="text-lg">📅</span> Rehearsal Schedule Preview
            </div>
            <div className="text-[0.8125rem] leading-relaxed text-text">
              First Rehearsal: <strong className="text-primary-deep">{formatInTimezone(range.first, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </div>
            <div className="text-[0.8125rem] leading-relaxed text-text">
              Last Rehearsal: <strong className="text-primary-deep">{formatInTimezone(range.last, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </div>
            <div className="text-muted mt-1 text-xs">
              Generates {count} weekly rehearsals leading up to the performance on {formatInTimezone(selectedPerformance.date, timezone, { year: 'numeric', month: 'long', day: 'numeric' })}.
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
