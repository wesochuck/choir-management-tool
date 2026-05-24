import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../common/BaseModal';
import type { Audition } from '../../services/auditionService';
import { eventService, type Event } from '../../services/eventService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { formatInTimezone, zonedInputValueToUtc, utcToZonedInputValue } from '../../lib/timezone';

const statusOptions: Audition['status'][] = ['New', 'Contacted', 'Scheduled', 'Closed'];

interface AuditionModalProps {
  audition: Audition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, data: Partial<Audition>) => Promise<void>;
}

export const AuditionModal: React.FC<AuditionModalProps> = ({ audition, isOpen, onClose, onSave }) => {
  const navigate = useNavigate();
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
        // Unscheduled / New applicant request
        if (settings.slots && settings.slots.length > 0) {
          setScheduledTimeSlot(settings.slots[0]);
          setIsCustomTime(false);
          setCustomTimeVal('');
        } else {
          setScheduledTimeSlot('__custom__');
          setIsCustomTime(true);
          setCustomTimeVal('');
        }
      }
    } else {
      setName('');
      setContact('');
      setStatus('New');
      setVoicePart('');
      setPerformance(settings.defaultPerformanceId || '');
      setExperience('');
      setNotes('');
      if (settings.slots && settings.slots.length > 0) {
        setScheduledTimeSlot(settings.slots[0]);
        setIsCustomTime(false);
        setCustomTimeVal('');
      } else {
        setScheduledTimeSlot('__custom__');
        setIsCustomTime(true);
        setCustomTimeVal('');
      }
    }
  }, [audition, settings]);

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
        // Keep existing requestedSlots on manual edits
        requestedSlots: audition ? audition.requestedSlots : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={audition ? `Edit ${audition.name}` : 'Add Audition Manually'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
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

        {audition?.requestedSlots && audition.requestedSlots.length > 0 && (
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
              📅 Requested Slots ({audition.requestedSlots.length})
            </button>
          </div>
        )}

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
              <select
                className="card"
                value={scheduledTimeSlot}
                onChange={(e) => {
                  const val = e.target.value;
                  setScheduledTimeSlot(val);
                  setIsCustomTime(val === '__custom__');
                }}
                style={{ height: '44px', padding: '0 12px' }}
              >
                <option value="">-- Not scheduled yet --</option>
                {(settings?.slots || []).map((slot) => (
                  <option key={slot} value={slot}>
                    {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </option>
                ))}
                <option value="__custom__">Custom time slot...</option>
              </select>
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

          {isCustomTime && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Custom Confirmed Time Slot</label>
              <input
                type="datetime-local"
                className="card"
                value={customTimeVal ? utcToZonedInputValue(customTimeVal, timezone) : ''}
                onChange={(e) => setCustomTimeVal(zonedInputValueToUtc(e.target.value, timezone))}
                required
                style={{ padding: '0 12px', height: '44px' }}
              />
            </div>
          )}

          <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Status</label>
              <select
                className="card"
                value={status}
                onChange={(event) => setStatus(event.target.value as Audition['status'])}
                style={{ height: '44px', padding: '0 12px' }}
              >
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
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

        {/* Tab 2: Requested Timeslots Details */}
        {activeTab === 'slots' && audition?.requestedSlots && (
          <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              The applicant indicated availability for the following time slots:
            </p>
            <div className="flex-col" style={{ gap: '8px' }}>
              {audition.requestedSlots.map((slot, index) => (
                <div 
                  key={slot} 
                  className="card"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px var(--space-md)',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--primary-light)', 
                    color: 'var(--primary-deep)', 
                    fontWeight: 700,
                    fontSize: '0.8rem' 
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatInTimezone(slot, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
};
