import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { auditionService, type Audition } from '../services/auditionService';
import { DEFAULT_AUDITION_SETTINGS, settingsService, type AuditionSettings } from '../services/settingsService';
import { eventService, type Event } from '../services/eventService';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useVoiceParts } from '../hooks/useVoiceParts';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';

export default function PublicAuditionView() {
  useDocumentTitle('Auditions');
  const [settings, setSettings] = useState<AuditionSettings>(DEFAULT_AUDITION_SETTINGS);
  const [timezone, setTimezone] = useState('America/New_York');
  const [targetPerformance, setTargetPerformance] = useState<Event | null>(null);
  const [rehearsals, setRehearsals] = useState<Event[]>([]);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(window.innerWidth > 640);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [timeSlot, setTimeSlot] = useState(DEFAULT_AUDITION_SETTINGS.slots[0] || '');
  const [voicePart, setVoicePart] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { labels: voicePartLabels } = useVoiceParts();

  useEffect(() => {
    const init = async () => {
      try {
        const [loaded, tz] = await Promise.all([
          settingsService.getAuditionSettings(),
          fetchChoirTimezone().catch(() => 'America/New_York'),
        ]);
        setSettings(loaded);
        setTimezone(tz);
        setTimeSlot(loaded.slots[0] || '');

        if (loaded.defaultPerformanceId) {
          try {
            const performance = await eventService.getEventById(loaded.defaultPerformanceId);
            setTargetPerformance(performance);

            const rehearsalList = await eventService.getRehearsalsForPerformance(performance.id);
            setRehearsals(rehearsalList);
          } catch (e) {
            console.error('Failed to load performance details', e);
          }
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
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
        performance: settings.defaultPerformanceId || undefined,
      });
      setSubmitted(true);
    } catch {
      setError('We could not submit your audition request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormActive = settings.enabled && targetPerformance;

  if (isLoading) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

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

        {!isFormActive ? (
          <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-xl) 0', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>📅</div>
            <p className="text-body" style={{ margin: 0, fontWeight: 500 }}>
              {settings.enabled 
                ? "Auditions are not currently scheduled for an upcoming performance."
                : "Audition requests are closed right now. Please check back later."}
            </p>
            <p className="text-muted text-sm">Please check our social media or website for the next audition announcement.</p>
          </div>
        ) : submitted ? (
          <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
            <div className="badge badge-success" style={{ alignSelf: 'flex-start' }}>Request Sent</div>
            <p className="text-body" style={{ margin: 0 }}>
              {settings.confirmationMessage}
            </p>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
            {/* Concert Details & Schedule */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--primary-light)' }}>
              <button 
                onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                className="flex-row" 
                style={{ 
                  width: '100%', 
                  padding: 'var(--space-md) var(--space-lg)', 
                  justifyContent: 'space-between',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div className="flex-col" style={{ gap: 2 }}>
                  <span className="text-label" style={{ color: 'var(--primary-deep)' }}>CONCERT DETAILS & SCHEDULE</span>
                  <span className="text-xs text-muted">Please review the commitment for this concert series</span>
                </div>
                <span style={{ fontSize: '1.2rem', transform: isScheduleExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
              </button>

              {isScheduleExpanded && (
                <div style={{ padding: '0 var(--space-lg) var(--space-lg) var(--space-lg)' }}>
                  <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--primary-deep)' }}>{targetPerformance.title}</h3>
                      <p className="text-sm" style={{ margin: 0 }}>
                        Performance: <strong>{formatInTimezone(targetPerformance.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                      </p>
                    </div>

                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                      <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Rehearsal Schedule</span>
                      <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                        {rehearsals.length > 0 ? rehearsals.map((rehearsal) => (
                          <div key={rehearsal.id} className="flex-responsive" style={{ fontSize: '0.8125rem', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                            <span>{formatInTimezone(rehearsal.date, timezone, { month: 'short', day: 'numeric', weekday: 'short' })} - {formatInTimezone(rehearsal.date, timezone, { hour: 'numeric', minute: '2-digit' })}</span>
                            <span className="text-muted">{rehearsal.title}</span>
                          </div>
                        )) : (
                          <p className="text-xs text-muted">Detailed schedule pending.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                    {voicePartLabels.map((part) => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                  <label className="text-label">Audition Time</label>
                  <select className="card" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required style={{ padding: '0 12px' }}>
                    {(settings.slots || []).map((slot) => (
                      <option key={slot} value={slot}>
                        {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </option>
                    ))}
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
          </div>
        )}
      </AppCard>
    </div>
  );
}
