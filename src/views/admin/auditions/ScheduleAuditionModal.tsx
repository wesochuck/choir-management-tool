import { useState, useEffect } from 'react';
import { Button, Select, Input, Modal } from '../../../components/ui';
import {
  formatInTimezone,
  utcToZonedInputValue,
  zonedInputValueToUtc,
} from '../../../lib/timezone';
import type { Audition } from '../../../services/auditionService';

interface ScheduleAuditionModalProps {
  audition: Audition | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (timeSlot: string) => Promise<void>;
  savedSlots: string[];
  timezone: string;
}

export function ScheduleAuditionModal({
  audition,
  isOpen,
  onClose,
  onConfirm,
  savedSlots = [],
  timezone,
}: ScheduleAuditionModalProps) {
  const [schedSlot, setSchedSlot] = useState('');
  const [schedCustom, setSchedCustom] = useState('');

  useEffect(() => {
    if (isOpen && audition) {
      const prefSlots = audition.requestedSlots || [];
      const matchingSlot = prefSlots.find((s) => savedSlots.includes(s));

      if (matchingSlot) {
        setSchedSlot(matchingSlot);
        setSchedCustom('');
      } else if (audition.scheduledTimeSlot) {
        const isPredefined = savedSlots.includes(audition.scheduledTimeSlot);
        if (isPredefined) {
          setSchedSlot(audition.scheduledTimeSlot);
          setSchedCustom('');
        } else {
          setSchedSlot('__custom__');
          setSchedCustom(audition.scheduledTimeSlot);
        }
      } else if (savedSlots.length > 0) {
        setSchedSlot(savedSlots[0]);
        setSchedCustom('');
      } else {
        setSchedSlot('__custom__');
        setSchedCustom('');
      }
    } else if (!isOpen) {
      setSchedSlot('');
      setSchedCustom('');
    }
  }, [isOpen, audition, savedSlots]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const finalSlot = schedSlot === '__custom__' ? schedCustom.trim() : schedSlot.trim();
    if (!finalSlot) return;
    onConfirm(finalSlot);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Audition"
      maxWidth="500px"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()} className="w-full sm:w-auto">
            Confirm & Send Email
          </Button>
        </div>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-text-muted m-0 text-sm">
          Confirm the time slot for <strong>{audition?.name}</strong>. An email will be sent to them
          with their scheduled time and an "Add to Calendar" link.
        </p>

        {audition?.requestedSlots && audition.requestedSlots.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-label">Applicant's Preferred Times</label>
            <div className="flex flex-row flex-wrap gap-2">
              {audition.requestedSlots.map((slot) => {
                const isSlotPredefined = savedSlots.includes(slot);
                const isSelected =
                  schedSlot === slot || (schedSlot === '__custom__' && schedCustom === slot);
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => {
                      if (isSlotPredefined) {
                        setSchedSlot(slot);
                        setSchedCustom('');
                      } else {
                        setSchedSlot('__custom__');
                        setSchedCustom(slot);
                      }
                    }}
                    className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary-light text-primary-deep shadow-sm'
                        : 'border-border bg-surface text-text hover:border-primary/50 hover:bg-primary-light'
                    }`}
                  >
                    {formatInTimezone(slot, timezone, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-text text-sm font-semibold">Select Confirmed Time Slot</label>
          <Select value={schedSlot} onChange={(e) => setSchedSlot(e.target.value)}>
            {savedSlots.map((slot) => (
              <option key={slot} value={slot}>
                {formatInTimezone(slot, timezone, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </option>
            ))}
            <option value="__custom__">Custom / Other</option>
          </Select>
        </div>
        {schedSlot === '__custom__' && (
          <div className="flex flex-col gap-1">
            <label className="text-text text-sm font-semibold">Custom Time Slot</label>
            <Input
              type="datetime-local"
              value={schedCustom ? utcToZonedInputValue(schedCustom, timezone) : ''}
              onChange={(e) => setSchedCustom(zonedInputValueToUtc(e.target.value, timezone))}
              required
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
