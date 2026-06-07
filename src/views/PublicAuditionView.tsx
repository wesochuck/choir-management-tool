import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { auditionService, type Audition } from '../services/auditionService';
import { DEFAULT_AUDITION_SETTINGS, settingsService, type AuditionSettings } from '../services/settingsService';
import { eventService, type Event } from '../services/eventService';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useVoiceParts } from '../hooks/useVoiceParts';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import './PublicForms.css';

export default function PublicAuditionView() {
  useDocumentTitle('Auditions');
  const [settings, setSettings] = useState<AuditionSettings>(DEFAULT_AUDITION_SETTINGS);
  const [timezone, setTimezone] = useState('America/New_York');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [targetPerformance, setTargetPerformance] = useState<Event | null>(null);
  const [rehearsals, setRehearsals] = useState<Event[]>([]);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(window.innerWidth > 640);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [requestedSlots, setRequestedSlots] = useState<string[]>([]);
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
        const [loaded, tz, loadedHomepage] = await Promise.all([
          settingsService.getAuditionSettings(),
          fetchChoirTimezone().catch(() => 'America/New_York'),
          settingsService.getHomepageUrl().catch(() => ''),
        ]);
        setSettings(loaded);
        setTimezone(tz);
        setHomepageUrl(loadedHomepage);

        if (loaded.defaultPerformanceId) {
          try {
            const performance = await eventService.getPublicEventById(loaded.defaultPerformanceId);
            setTargetPerformance(performance);

            const rehearsalList = await eventService.getPublicRehearsalsForPerformance(performance.id);
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

    if (requestedSlots.length === 0) {
      setError('Please select at least one available audition time slot.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (contact.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) {
        setError('Enter a valid email address or use a phone number.');
        setIsSubmitting(false);
        return;
      }

      await auditionService.createAudition({
        name,
        contact,
        requestedSlots,
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
      <div className="flex-col pub-style-1">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-col pub-style-2">
      <AppCard className="pub-style-3">
        <div className="flex-col pub-style-4">
          <Link to="/login" className="btn btn-ghost btn-sm pub-style-5">Admin Login</Link>
          <h1 className="text-display pub-style-6">Choir Auditions</h1>
          {!submitted && (
            <p className="text-muted pub-style-6">
              Choose an audition time and share the best way to reach you.
            </p>
          )}
        </div>

        {!isFormActive ? (
          <div className="flex-col pub-style-7">
            <div className="pub-style-8">📅</div>
            <p className="text-body pub-style-9">
              {settings.enabled 
                ? "Auditions are not currently scheduled for an upcoming performance."
                : "Audition requests are closed right now. Please check back later."}
            </p>
            <p className="text-muted text-sm">Please check our social media or website for the next audition announcement.</p>
          </div>
        ) : submitted ? (
          <div className="flex-col pub-style-10">
            <div className="badge badge-success pub-style-5">Request Sent</div>
            <p className="text-body pub-style-6">
              {settings.confirmationMessage}
            </p>
            {homepageUrl && (
              <a 
                href={homepageUrl} 
                className="btn btn-primary pub-style-11"
              >
                🏠 Visit our Homepage
              </a>
            )}
          </div>
        ) : (
          <div className="flex-col pub-style-12">
            {/* Concert Details & Schedule */}
            <div className="card pub-style-13">
              <button 
                onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                className="flex-row pub-accordion-button" 
              >
                <div className="flex-col pub-style-14">
                  <span className="text-label pub-style-15">CONCERT DETAILS & SCHEDULE</span>
                  <span className="text-xs text-muted">Please review the commitment for this concert series</span>
                </div>
                // @allow-inline-style - dynamic transform based on expansion state
                <span style={{ fontSize: '1.2rem', transform: isScheduleExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </button>

              {isScheduleExpanded && (
                <div className="pub-style-16">
                  <div className="flex-col pub-style-17">
                    <div>
                      <h3 className="pub-style-18">{targetPerformance.title}</h3>
                      <p className="text-sm pub-style-6">
                        Performance: <strong>{formatInTimezone(targetPerformance.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
                      </p>
                    </div>

                    <div className="flex-col pub-style-19">
                      <span className="text-xs text-muted pub-style-20">Rehearsal Schedule</span>
                      <div className="flex-col pub-style-19">
                        {rehearsals.length > 0 ? rehearsals.map((rehearsal) => (
                          <div key={rehearsal.id} className="flex-responsive pub-style-21">
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

            <form onSubmit={handleSubmit} className="flex-col pub-style-22">
              <div className="flex-col pub-style-19">
                <label className="text-label">Name</label>
                <input className="card pub-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex-col pub-style-19">
                <label className="text-label">Email or Phone</label>
                <input className="card pub-input" value={contact} onChange={(e) => setContact(e.target.value)} required />
              </div>
              <div className="flex-responsive pub-style-23">
                <div className="flex-col pub-style-24">
                  <label className="text-label">Voice Part</label>
                  <select className="card pub-select" value={voicePart} onChange={(e) => setVoicePart(e.target.value)}>
                    <option value="">Not sure yet</option>
                    {voicePartLabels.map((part) => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-col pub-style-19">
                <label className="text-label">Available Audition Times (Select all that apply)</label>
                <div className="pub-style-25">
                  {(settings.slots || []).map((slot) => {
                    const isChecked = requestedSlots.includes(slot);
                    return (
                      <label 
                        key={slot} 
                        className={`interactive-row pub-slot-label ${isChecked ? 'pub-slot-label-checked' : ''}`}
                      >
                        <input 
                          type="checkbox" 
                          className="pub-checkbox-accent"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRequestedSlots([...requestedSlots, slot]);
                            } else {
                              setRequestedSlots(requestedSlots.filter(s => s !== slot));
                            }
                          }}
                        />
                        // @allow-inline-style - dynamic font weight based on check state
                        <span style={{ fontSize: '0.875rem', fontWeight: isChecked ? 600 : 400 }}>
                          {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </label>
                    );
                  })}
                  {(!settings.slots || settings.slots.length === 0) && (
                    <span className="text-muted text-sm pub-style-26">
                      No time slots are currently configured. Please contact the administrator.
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-col pub-style-19">
                <label className="text-label">Experience / Musical Background</label>
                <textarea
                  className="card pub-textarea"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
              {error && <p className="pub-style-27">{error}</p>}
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
