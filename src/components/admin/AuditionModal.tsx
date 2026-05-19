import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../common/BaseModal';
import type { Audition } from '../../services/auditionService';
import { eventService, type Event } from '../../services/eventService';

const statusOptions: Audition['status'][] = ['New', 'Contacted', 'Scheduled', 'Closed'];

interface AuditionModalProps {
  audition: Audition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Audition>) => Promise<void>;
}

export const AuditionModal: React.FC<AuditionModalProps> = ({ audition, isOpen, onClose, onSave }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Audition['status']>('New');
  const [voicePart, setVoicePart] = useState<Audition['voicePart'] | ''>('');
  const [performance, setPerformance] = useState('');
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');
  const [performances, setPerformances] = useState<Event[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    eventService.getEvents().then(events => {
      setPerformances(events.filter(e => e.type === 'Performance'));
    });
  }, []);

  useEffect(() => {
    if (!audition) return;
    setStatus(audition.status);
    setVoicePart(audition.voicePart || '');
    setPerformance(audition.performance || '');
    setExperience(audition.experience || '');
    setNotes(audition.notes || '');
  }, [audition]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!audition) return;

    setIsSubmitting(true);
    try {
      await onSave(audition.id, {
        status,
        performance: performance || undefined,
        ...(voicePart ? { voicePart } : {}),
        experience,
        notes,
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
      title={audition ? `Edit ${audition.name}` : 'Edit Audition'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="audition-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Audition'}
          </button>
        </>
      }
    >
      <form id="audition-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {audition && (
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <div className="text-label">{audition.timeSlot}</div>
            {audition.contact.includes('@') ? (
              <button
                type="button"
                onClick={() => {
                  navigate('/admin/communications', {
                    state: {
                      initialRecipients: [{
                        id: `audition-${audition.contact}`,
                        name: audition.name,
                        email: audition.contact,
                        phone: '',
                        voicePart: audition.voicePart || '',
                        globalStatus: 'Auditionee'
                      }],
                      initialSubject: 'Audition Inquiry',
                      initialContent: `Dear ${audition.name},\n\n`
                    }
                  });
                  onClose();
                }}
                className="btn btn-link text-muted"
                style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' }}
              >
                {audition.contact}
              </button>
            ) : (
              <a
                href={`tel:${audition.contact}`}
                className="text-muted"
              >
                {audition.contact}
              </a>
            )}
          </div>
        )}

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
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

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Tied to Performance</label>
          <select
            className="card"
            value={performance}
            onChange={(event) => setPerformance(event.target.value)}
            style={{ height: '44px', padding: '0 12px' }}
          >
            <option value="">-- No performance assigned --</option>
            {performances.map(p => (
              <option key={p.id} value={p.id}>{new Date(p.date).toLocaleDateString()} - {p.title}</option>
            ))}
          </select>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Voice Part</label>
          <select
            className="card"
            value={voicePart || ''}
            onChange={(event) => setVoicePart(event.target.value as Audition['voicePart'])}
            style={{ height: '44px', padding: '0 12px' }}
          >
            <option value="">Not sure yet</option>
            {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Experience / Musical Background</label>
          <textarea
            className="card"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            style={{ minHeight: '100px', padding: '12px', resize: 'vertical' }}
          />
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Internal Notes</label>
          <textarea
            className="card"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            style={{ minHeight: '120px', padding: '12px', resize: 'vertical' }}
          />
        </div>
      </form>
    </BaseModal>
  );
};
