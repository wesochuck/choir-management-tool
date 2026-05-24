import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import type { Audition } from '../../services/auditionService';
import { eventService, type Event } from '../../services/eventService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { formatInTimezone } from '../../lib/timezone';



interface AuditionModalProps {
  audition: Audition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, data: Partial<Audition>) => Promise<void>;
}

export const AuditionModal: React.FC<AuditionModalProps> = ({ audition, isOpen, onClose, onSave }) => {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { timezone } = useChoirSettings();
  const [activeTab, setActiveTab] = useState<'info' | 'slots'>('info');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Audition['status']>('New');
  const [voicePart, setVoicePart] = useState<Audition['voicePart'] | ''>('');
  const [performance, setPerformance] = useState('');
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');
  
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState('');
  const [customTimeVal, setCustomTimeVal] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(false);

  const [requestedSlots, setRequestedSlots] = useState<string[]>([]);
  const [performances, setPerformances] = useState<Event[]>([]);
  const [settings, setSettings] = useState<AuditionSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { labels: voicePartLabels } = useVoiceParts();

  useEffect(() => {
    eventService.getEvents().then(events => {
      setPerformances(events.filter(e => e.type === 'Performance'));
    });
    settingsService.getAuditionSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;

    setActiveTab('info');

    if (audition) {
      setName(audition.name);
      setContact(audition.contact);
      setStatus(audition.status);
      setVoicePart(audition.voicePart || '');
      setPerformance(audition.performance || '');
      setExperience(audition.experience || '');
      setNotes(audition.notes || '');
      setRequestedSlots(audition.requestedSlots || []);

      const currentSlot = audition.scheduledTimeSlot || '';
      const isSlotPredefined = currentSlot ? settings.slots?.includes(currentSlot) : false;
      if (isSlotPredefined) {
        setScheduledTimeSlot(currentSlot);
        setIsCustomTime(false);
        setCustomTimeVal('');
      } else if (currentSlot) {
        setScheduledTimeSlot('__custom__');
        setCustomTimeVal(currentSlot);
        setIsCustomTime(true);
      } else {
        // Unscheduled / New applicant request - do not prefill scheduled time slot
        setScheduledTimeSlot('');
        setIsCustomTime(false);
        setCustomTimeVal('');
      }
    } else {
      setName('');
      setContact('');
      setStatus('New');
      setVoicePart('');
      setPerformance(settings.defaultPerformanceId || '');
      setExperience('');
      setNotes('');
      setRequestedSlots([]);
      // Unscheduled / Manual add - do not prefill scheduled time slot
      setScheduledTimeSlot('');
      setIsCustomTime(false);
      setCustomTimeVal('');
    }
  }, [audition, settings]);

  const isDirty = useMemo(() => {
    if (audition) {
      const nameChanged = name !== audition.name;
      const contactChanged = contact !== audition.contact;
      const voicePartChanged = (voicePart || '') !== (audition.voicePart || '');
      const performanceChanged = (performance || '') !== (audition.performance || '');
      const experienceChanged = experience !== (audition.experience || '');
      const notesChanged = notes !== (audition.notes || '');
      const requestedSlotsChanged = JSON.stringify(requestedSlots) !== JSON.stringify(audition.requestedSlots || []);
      return nameChanged || contactChanged || voicePartChanged || performanceChanged || experienceChanged || notesChanged || requestedSlotsChanged;
    } else {
      const hasName = Boolean(name.trim());
      const hasContact = Boolean(contact.trim());
      const hasVoicePart = Boolean(voicePart);
      const hasExperience = Boolean(experience.trim());
      const hasNotes = Boolean(notes.trim());
      const hasSlots = requestedSlots.length > 0;
      return hasName || hasContact || hasVoicePart || hasExperience || hasNotes || hasSlots;
    }
  }, [audition, name, contact, voicePart, performance, experience, notes, requestedSlots]);

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

    const finalTimeSlot = isCustomTime ? customTimeVal.trim() : scheduledTimeSlot.trim();
    if (!name.trim() || !contact.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(audition ? audition.id : null, {
        name: name.trim(),
        contact: contact.trim(),
        scheduledTimeSlot: finalTimeSlot || undefined,
        status,
        performance: performance || undefined,
        voicePart: voicePart || undefined,
        experience: experience.trim(),
        notes: notes.trim(),
        requestedSlots: requestedSlots,
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
      <form id="audition-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {audition && (
          <div className="flex-row" style={{ gap: 'var(--space-md)', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--primary-light)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)' }}>
            <span className="text-label" style={{ color: 'var(--primary-deep)' }}>Quick Contact:</span>
            {contact.includes('@') ? (
              <button
                type="button"
                onClick={() => {
                  navigate('/admin/communications', {
                    state: {
                      initialRecipients: [{
                        id: `audition-${contact}`,
                        name: name,
                        email: contact,
                        phone: '',
                        voicePart: voicePart || '',
                        globalStatus: 'Auditionee'
                      }],
                      initialSubject: 'Audition Inquiry',
                      initialContent: `Dear ${name},\n\n`
                    }
                  });
                  onClose();
                }}
                className="btn btn-link"
                style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
              >
                {contact}
              </button>
            ) : (
              <a
                href={`tel:${contact}`}
                style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--text)' }}
              >
                {contact}
              </a>
            )}
          </div>
        )}

        <div className="flex-row" style={{ 
          borderBottom: '1px solid var(--border)', 
          marginBottom: 'var(--space-xs)',
          gap: 'var(--space-md)' 
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'info' ? 700 : 500,
              color: activeTab === 'info' ? 'var(--primary-deep)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            📋 Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            style={{
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'slots' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'slots' ? 700 : 500,
              color: activeTab === 'slots' ? 'var(--primary-deep)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            📅 Requested Slots ({requestedSlots.length})
          </button>
        </div>

        {/* Tab 1: Information Form Fields */}
        <div style={{ display: activeTab === 'info' ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Name</label>
            <input
              className="card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Applicant's Full Name"
              style={{ padding: '0 12px', height: '44px' }}
            />
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Email or Phone</label>
            <input
              className="card"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder="e.g. test@example.com or 555-0199"
              style={{ padding: '0 12px', height: '44px' }}
            />
          </div>

          <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Confirmed Scheduled Time</label>
              <div 
                className="card flex-row" 
                style={{ 
                  height: '44px', 
                  padding: '0 8px', 
                  alignItems: 'center', 
                  backgroundColor: 'var(--bg)', 
                  border: '1px solid var(--border)',
                  color: audition?.scheduledTimeSlot ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: audition?.scheduledTimeSlot ? 700 : 400,
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={audition?.scheduledTimeSlot ? formatInTimezone(audition.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled yet'}
              >
                {audition?.scheduledTimeSlot ? (
                  formatInTimezone(audition.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                ) : (
                  'Not scheduled yet'
                )}
              </div>
            </div>

            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Voice Part</label>
              <select
                className="card"
                value={voicePart || ''}
                onChange={(event) => setVoicePart(event.target.value as Audition['voicePart'])}
                style={{ height: '44px', padding: '0 12px' }}
              >
                <option value="">Not sure yet</option>
                {voicePartLabels.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Status</label>
              <div 
                style={{ 
                  height: '44px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '1.05rem',
                  color: 'var(--text)'
                }}
              >
                {status}
              </div>
            </div>

            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Tied to Performance</label>
              <select
                className="card"
                value={performance}
                onChange={(event) => setPerformance(event.target.value)}
                style={{ height: '44px', padding: '0 12px' }}
              >
                <option value="">-- No performance assigned --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Experience / Musical Background</label>
            <textarea
              className="card"
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              placeholder="Describe background..."
              style={{ minHeight: '80px', padding: '12px', resize: 'vertical' }}
            />
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Internal Notes</label>
            <textarea
              className="card"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add internal notes..."
              style={{ minHeight: '80px', padding: '12px', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Tab 2: Requested Timeslots Selection */}
        {activeTab === 'slots' && (
          <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Select the potential time slots this applicant requested or is available for:
            </p>
            <div className="flex-col" style={{ gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {(settings?.slots || []).map((slot) => {
                const isChecked = requestedSlots.includes(slot);
                return (
                  <label 
                    key={slot} 
                    className="card flex-row" 
                    style={{ 
                      padding: '12px var(--space-md)', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: isChecked ? 'var(--primary-light)' : 'var(--bg)',
                      boxShadow: 'none',
                      margin: 0
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {
                        if (isChecked) {
                          setRequestedSlots(requestedSlots.filter(s => s !== slot));
                        } else {
                          setRequestedSlots([...requestedSlots, slot].sort());
                        }
                      }}
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400, fontSize: '0.88rem', color: 'var(--text)' }}>
                      {formatInTimezone(slot, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </label>
                );
              })}
              {(!settings?.slots || settings.slots.length === 0) && (
                <p className="text-muted text-center" style={{ padding: '20px 0' }}>
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
