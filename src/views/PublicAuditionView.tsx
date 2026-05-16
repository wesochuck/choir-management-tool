import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { auditionService, type Audition } from '../services/auditionService';
import { DEFAULT_AUDITION_SETTINGS, settingsService, type AuditionSettings } from '../services/settingsService';

export default function PublicAuditionView() {
  const [settings, setSettings] = useState<AuditionSettings>(DEFAULT_AUDITION_SETTINGS);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [timeSlot, setTimeSlot] = useState(DEFAULT_AUDITION_SETTINGS.slots[0] || '');
  const [voicePart, setVoicePart] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    settingsService.getAuditionSettings()
      .then((loaded) => {
        setSettings(loaded);
        setTimeSlot(loaded.slots[0] || '');
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (contact.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) {
        setError('Enter a valid email address or use a phone number.');
        return;
      }

      await auditionService.createAudition({
        name,
        contact,
        timeSlot,
        ...(voicePart ? { voicePart: voicePart as Audition['voicePart'] } : {}),
        experience,
      });
      setSubmitted(true);
    } catch {
      setError('We could not submit your audition request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(720px, calc(100vw - 32px))' }}>
        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          <Link to="/login" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>Admin Login</Link>
          <h1 className="text-display" style={{ margin: 0 }}>Choir Auditions</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            Choose an audition time and share the best way to reach you.
          </p>
        </div>

        {!settings.enabled ? (
          <p className="text-body" style={{ margin: 0 }}>
            Audition requests are closed right now. Please check back later.
          </p>
        ) : submitted ? (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="badge badge-success" style={{ alignSelf: 'flex-start' }}>Request Sent</div>
            <p className="text-body" style={{ margin: 0 }}>
              {settings.confirmationMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Name</label>
              <input className="card" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '0 12px' }} />
            </div>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Email or Phone</label>
              <input className="card" value={contact} onChange={(e) => setContact(e.target.value)} required style={{ padding: '0 12px' }} />
            </div>
            <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                <label className="text-label">Voice Part</label>
                <select className="card" value={voicePart} onChange={(e) => setVoicePart(e.target.value)} style={{ padding: '0 12px' }}>
                  <option value="">Not sure yet</option>
                  {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                <label className="text-label">Audition Time</label>
                <select className="card" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required style={{ padding: '0 12px' }}>
                  {settings.slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>
            </div>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Experience / Musical Background</label>
              <textarea
                className="card"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                style={{ minHeight: '120px', padding: '12px', resize: 'vertical' }}
              />
            </div>
            {error && <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Request Audition'}
            </button>
          </form>
        )}
      </AppCard>
    </div>
  );
}
