import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../common/BaseModal';
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
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={audition ? `Edit ${audition.name}` : 'Add Audition Manually'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          <button type="submit" form="audition-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : audition ? 'Save Audition' : 'Add Audition'}
          </button>
        </>
      }
    >
      <form id="audition-form" onSubmit={handleSubmit} className="flex-col gap-4">
        {audition && (
          <div className="flex-row gap-4 justify-between items-center bg-primary-light px-4 py-2 rounded">
            <span className="text-label text-primary-deep">Quick Contact:</span>
            {formData.contact.includes('@') ? (
              <button
                type="button"
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
                className="btn btn-link underline font-semibold"
              >
                {formData.contact}
              </button>
            ) : (
              <a
                href={`tel:${formData.contact}`}
                className="underline font-semibold text-text"
              >
                {formData.contact}
              </a>
            )}
          </div>
        )}

        <div className="flex-row border-b border-border mb-1 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className="px-4 py-2 bg-none border-none cursor-pointer text-[15px] transition-all duration-200"
            style={{ /* @allow-inline-style */
              // @allow-inline-style - tab active state indicator
              borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'info' ? 600 : 500,
              color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Applicant Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className="px-4 py-2 bg-none border-none cursor-pointer text-[15px] transition-all duration-200"
            style={{ /* @allow-inline-style */
              // @allow-inline-style - tab active state indicator
              borderBottom: activeTab === 'slots' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'slots' ? 600 : 500,
              color: activeTab === 'slots' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Requested Slots ({formData.requestedSlots?.length || 0})
          </button>
        </div>

        {/* Tab 1: Information Form Fields */}
        <div className="flex-col gap-4" style={{ /* @allow-inline-style */ 
          // @allow-inline-style - Dynamic display based on active tab state
          display: activeTab === 'info' ? 'flex' : 'none' 
        }}>
          <div className="flex-col gap-1">
            <label className="text-label">Name</label>
            <input
              className="card px-3 h-[44px]"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Applicant's Full Name"
            />
          </div>

          <div className="flex-col gap-1">
            <label className="text-label">Email or Phone</label>
            <input
              className="card px-3 h-[44px]"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
              placeholder="e.g. test@example.com or 555-0199"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-col flex-1 gap-1">
              <label className="text-label">Confirmed Scheduled Time</label>
              <div 
                className="card flex-row h-[44px] px-2 items-center bg-bg border border-border text-sm whitespace-nowrap overflow-hidden text-ellipsis" 
                style={{ /* @allow-inline-style */ 
                  // @allow-inline-style - dynamic based on scheduled time slot
                  color: formData.scheduledTimeSlot ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: formData.scheduledTimeSlot ? 700 : 400,
                }}
                title={formData.scheduledTimeSlot ? formatInTimezone(formData.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled yet'}
              >
                {formData.scheduledTimeSlot ? (
                  formatInTimezone(formData.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                ) : (
                  'Not scheduled yet'
                )}
              </div>
            </div>

            <div className="flex-col flex-1 gap-1">
              <label className="text-label">Voice Part</label>
              <select
                className="card px-3 h-[44px]"
                value={formData.voicePart || ''}
                onChange={(event) => setFormData({ ...formData, voicePart: event.target.value as Audition['voicePart'] })}
              >
                <option value="">Not sure yet</option>
                {voicePartLabels.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-col flex-1 gap-1">
              <label className="text-label">Status</label>
              <div className="h-[44px] flex items-center font-bold text-lg text-text">
                {formData.status}
              </div>
            </div>

            <div className="flex-col flex-1 gap-1">
              <label className="text-label">Tied to Performance</label>
              <select
                className="card px-3 h-[44px]"
                value={formData.performance || ''}
                onChange={(event) => setFormData({ ...formData, performance: event.target.value })}
              >
                <option value="">-- No performance assigned --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-col gap-1">
            <label className="text-label">Experience / Musical Background</label>
            <textarea
              className="card min-h-20 p-3 resize-y"
              value={formData.experience}
              onChange={(event) => setFormData({ ...formData, experience: event.target.value })}
              placeholder="Describe background..."
            />
          </div>

          <div className="flex-col gap-1">
            <label className="text-label">Internal Notes</label>
            <textarea
              className="card min-h-20 p-3 resize-y"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Add internal notes..."
            />
          </div>
        </div>

        {/* Tab 2: Requested Timeslots Selection */}
        {activeTab === 'slots' && (
          <div className="flex-col gap-4 py-2">
            <p className="text-muted text-sm m-0">
              Select the potential time slots this applicant requested or is available for:
            </p>
            <div className="flex-col gap-[10px] max-h-[300px] overflow-y-auto pr-1">
              {(settings?.slots || []).map((slot) => {
                const isChecked = formData.requestedSlots?.includes(slot);
                return (
                  <label 
                    key={slot} 
                    className="card flex-row p-3 items-center gap-3 cursor-pointer shadow-none m-0" 
                    style={{ /* @allow-inline-style */ 
                      // @allow-inline-style - checkbox checked state
                      border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: isChecked ? 'var(--primary-light)' : 'var(--bg)',
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
                      className="accent-[var(--primary)] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-text" style={{ /* @allow-inline-style */ 
                      // @allow-inline-style - Dynamic fontWeight based on isChecked state
                      fontWeight: isChecked ? 600 : 400 
                    }}>
                      {formatInTimezone(slot, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </label>
                );
              })}
              {(!settings?.slots || settings.slots.length === 0) && (
                <p className="text-muted text-center py-5">
                  No potential audition times configured in settings.
                </p>
              )}
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
};
