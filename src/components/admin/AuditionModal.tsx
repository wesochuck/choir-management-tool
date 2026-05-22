import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../common/BaseModal';
import type { Audition } from '../../services/auditionService';
import { eventService, type Event } from '../../services/eventService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { formatInTimezone } from '../../lib/timezone';

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
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Audition['status']>('New');
  const [voicePart, setVoicePart] = useState<Audition['voicePart'] | ''>('');
  const [performance, setPerformance] = useState('');
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');
  
  const [timeSlot, setTimeSlot] = useState('');
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

    if (audition) {
      setName(audition.name);
      setContact(audition.contact);
      setStatus(audition.status);
      setVoicePart(audition.voicePart || '');
      setPerformance(audition.performance || '');
      setExperience(audition.experience || '');
      setNotes(audition.notes || '');

      const isSlotPredefined = settings.slots?.includes(audition.timeSlot);
      if (isSlotPredefined) {
        setTimeSlot(audition.timeSlot);
        setIsCustomTime(false);
        setCustomTimeVal('');
      } else {
        setTimeSlot('__custom__');
        setCustomTimeVal(audition.timeSlot);
        setIsCustomTime(true);
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
        setTimeSlot(settings.slots[0]);
        setIsCustomTime(false);
        setCustomTimeVal('');
      } else {
        setTimeSlot('__custom__');
        setIsCustomTime(true);
        setCustomTimeVal('');
      }
    }
  }, [audition, settings]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const finalTimeSlot = isCustomTime ? customTimeVal.trim() : timeSlot.trim();
    if (!name.trim() || !contact.trim() || !finalTimeSlot) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(audition ? audition.id : null, {
        name: name.trim(),
        contact: contact.trim(),
        timeSlot: finalTimeSlot,
        status,
        performance: performance || undefined,
        voicePart: voicePart || undefined,
        experience: experience.trim(),
        notes: notes.trim(),
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
            <label className="text-label">Audition Time</label>
            <select
              className="card"
              value={timeSlot}
              onChange={(e) => {
                const val = e.target.value;
                setTimeSlot(val);
                setIsCustomTime(val === '__custom__');
              }}
              style={{ height: '44px', padding: '0 12px' }}
            >
              {(settings?.slots || []).map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
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
            <label className="text-label">Custom Time Slot</label>
            <input
              className="card"
              value={customTimeVal}
              onChange={(e) => setCustomTimeVal(e.target.value)}
              required
              placeholder="e.g. Monday 5:30 PM"
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
      </form>
    </BaseModal>
  );
};
