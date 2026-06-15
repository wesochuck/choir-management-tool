import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Select, Input, Textarea } from '../ui';
import { useDialog } from '../../contexts/DialogContext';
import type { Audition, AuditionInput } from '../../services/auditionService';
import { type Event } from '../../services/eventService';
import { type AuditionSettings } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { formatInTimezone } from '../../lib/timezone';
import { auditionToFormData, isAuditionFormDirty, defaultAuditionInput } from '../../lib/auditionForm';

interface AuditionModalProps {
  audition: Audition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, data: Partial<Audition>) => Promise<void>;
  settings: AuditionSettings | null;
  performances: Event[];
}

export const AuditionModal: React.FC<AuditionModalProps> = ({ 
  audition, 
  isOpen, 
  onClose, 
  onSave,
  settings,
  performances
}) => {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { timezone } = useChoirSettings();
  const [activeTab, setActiveTab] = useState<'info' | 'slots'>('info');
  const [formData, setFormData] = useState<AuditionInput>({ ...defaultAuditionInput });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { labels: voicePartLabels } = useVoiceParts();

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('info');
    setFormData(auditionToFormData(audition, settings?.defaultPerformanceId));
  }, [audition, settings, isOpen]);

  const isDirty = useMemo(() => {
    return isAuditionFormDirty(formData, audition);
  }, [formData, audition]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: audition 
          ? 'You have unsaved changes to this audition. Do you want to discard them?' 
          : 'You are filling a new audition sheet with unsaved details. Do you want to discard this audition?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning'
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.contact.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(audition ? audition.id : null, {
        ...formData,
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        experience: formData.experience?.trim(),
        notes: formData.notes?.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={audition ? `Edit ${audition.name}` : 'Add Audition Manually'}
      maxWidth="640px"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="audition-form" variant="primary" disabled={isSubmitting} loading={isSubmitting}>
            {audition ? 'Save Audition' : 'Add Audition'}
          </Button>
        </div>
      }
    >
      <form id="audition-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {audition && (
          <div className="flex flex-row items-center justify-between gap-4 rounded bg-primary-light px-4 py-2">
            <span className="text-label text-primary-deep">Quick Contact:</span>
            {formData.contact.includes('@') ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigate('/admin/communications', {
                    state: {
                      initialRecipients: [{
                        id: `audition-${formData.contact}`,
                        name: formData.name,
                        email: formData.contact,
                        phone: '',
                        voicePart: formData.voicePart || '',
                        globalStatus: 'Auditionee'
                      }],
                      initialSubject: 'Audition Inquiry',
                      initialContent: `Dear ${formData.name},\n\n`
                    }
                  });
                  onClose();
                }}
                className="!h-auto !min-h-0 !p-0 font-semibold text-primary underline hover:text-primary-deep"
              >
                {formData.contact}
              </Button>
            ) : (
              <a
                href={`tel:${formData.contact}`}
                className="font-semibold text-text underline"
              >
                {formData.contact}
              </a>
            )}
          </div>
        )}

        <div className="mb-1 flex flex-row gap-4 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`cursor-pointer border-none bg-none px-4 py-2 text-[15px] transition-all duration-200 ${
              activeTab === 'info'
                ? 'border-b-2 border-primary font-semibold text-primary'
                : 'border-b-2 border-transparent font-medium text-text-muted'
            }`}
          >
            Applicant Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className={`cursor-pointer border-none bg-none px-4 py-2 text-[15px] transition-all duration-200 ${
              activeTab === 'slots'
                ? 'border-b-2 border-primary font-semibold text-primary'
                : 'border-b-2 border-transparent font-medium text-text-muted'
            }`}
          >
            Time Slots
          </button>
        </div>

        {/* Tab 1: Information Form Fields */}
        // @allow-inline-style - dynamic display for tab visibility
        <div className="flex flex-col gap-4" style={{
          display: activeTab === 'info' ? 'flex' : 'none' 
        }}>
          <div className="flex flex-col gap-1">
            <label className="text-label">Name</label>
            <Input
              className="h-[44px] rounded-md border border-border bg-surface px-3 transition-colors outline-none focus:border-primary"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Applicant's Full Name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Email or Phone</label>
            <Input
              className="h-[44px] rounded-md border border-border bg-surface px-3 transition-colors outline-none focus:border-primary"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
              placeholder="e.g. test@example.com or 555-0199"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-label">Voice Part</label>
              <Select
                value={formData.voicePart || ''}
                onChange={(event) => setFormData({ ...formData, voicePart: event.target.value as Audition['voicePart'] })}
              >
                <option value="">Not sure yet</option>
                {voicePartLabels.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label">Tied to Performance</label>
              <Select
                value={formData.performance || ''}
                onChange={(event) => setFormData({ ...formData, performance: event.target.value })}
              >
                <option value="">-- No performance assigned --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Status</label>
            <div className="flex h-[44px] items-center text-lg font-bold text-text">
              {formData.status}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Experience / Musical Background</label>
            <Textarea
              className="min-h-[80px]"
              value={formData.experience}
              onChange={(event) => setFormData({ ...formData, experience: event.target.value })}
              placeholder="Describe background..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Internal Notes</label>
            <Textarea
              className="min-h-[80px]"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Add internal notes..."
            />
          </div>
        </div>

        {/* Tab 2: Time Slots & Scheduling */}
        {activeTab === 'slots' && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-label">Confirmed Scheduled Time</label>
              <Select
                value={formData.scheduledTimeSlot || ''}
                onChange={(event) => setFormData({ ...formData, scheduledTimeSlot: event.target.value })}
              >
                <option value="">-- Not Scheduled --</option>
                {settings?.slots?.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </option>
                ))}
                {formData.scheduledTimeSlot && !settings?.slots?.includes(formData.scheduledTimeSlot) && (
                  <option value={formData.scheduledTimeSlot}>
                    {formatInTimezone(formData.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} (Custom)
                  </option>
                )}
              </Select>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <label className="text-label">Requested Slots ({formData.requestedSlots?.length || 0})</label>
              <p className="text-muted m-0 text-sm">
                Select the potential time slots this applicant requested or is available for:
              </p>
              <div className="max-h-[250px] flex flex-col gap-[10px] overflow-y-auto pr-1">
                {(settings?.slots || []).map((slot) => {
                  const isChecked = formData.requestedSlots?.includes(slot);
                  return (
                    <label 
                      key={slot} 
                      className="m-0 cursor-pointer flex flex-row items-center gap-3 rounded-xl p-3 shadow-none"
                      // @allow-inline-style - checkbox checked state
                      style={{
                        border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: isChecked ? 'var(--color-primary-light)' : 'var(--color-bg)',
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {
                          const current = formData.requestedSlots || [];
                          if (isChecked) {
                            setFormData({ ...formData, requestedSlots: current.filter(s => s !== slot) });
                          } else {
                            setFormData({ ...formData, requestedSlots: [...current, slot].sort() });
                          }
                        }}
                        className="size-4 cursor-pointer accent-primary"
                      />
                      <span className={`text-sm text-text ${isChecked ? 'font-semibold' : 'font-normal'}`}>
                        {formatInTimezone(slot, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </label>
                  );
                })}
                {(!settings?.slots || settings.slots.length === 0) && (
                  <p className="text-muted py-5 text-center">
                    No potential audition times configured in settings.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
