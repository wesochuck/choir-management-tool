import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import PublicLogo from '../components/common/PublicLogo';
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
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-start p-4">
      <PublicLogo />
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <Link to="/login" className="btn btn-ghost btn-sm self-start">Admin Login</Link>
          <h1 className="text-display m-0">Choir Auditions</h1>
          {!submitted && (
            <p className="m-0 text-text-muted">
              Choose an audition time and share the best way to reach you.
            </p>
          )}
        </div>

        {!isFormActive ? (
          <div className="flex flex-col gap-4 py-8 text-center">
            <div className="text-5xl">📅</div>
            <p className="text-body m-0 font-medium">
              {settings.enabled 
                ? "Auditions are not currently scheduled for an upcoming performance."
                : "Audition requests are closed right now. Please check back later."}
            </p>
            <p className="text-sm text-text-muted">Please check our social media or website for the next audition announcement.</p>
          </div>
        ) : submitted ? (
          <div className="flex flex-col gap-4 py-4">
            <div className="inline-flex items-center self-start rounded bg-success-bg px-2 py-0.5 text-xs font-semibold tracking-wider text-success-text uppercase">Request Sent</div>
            <p className="text-body m-0">
              {settings.confirmationMessage}
            </p>
            {homepageUrl && (
              <a 
                href={homepageUrl} 
                className="btn btn-primary mt-4 inline-flex items-center gap-1.5 self-start no-underline"
              >
                🏠 Visit our Homepage
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden bg-primary-light p-0">
              <button 
                onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                className="flex w-full cursor-pointer flex-row justify-between border-none bg-none px-6 py-4 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-label text-primary-deep">CONCERT DETAILS & SCHEDULE</span>
                  <span className="text-xs text-text-muted">Please review the commitment for this concert series</span>
                </div>
                {/* @allow-inline-style - dynamic transform based on expansion state */}
                <span style={{ fontSize: '1.2rem', transform: isScheduleExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </button>

              {isScheduleExpanded && (
                <div className="px-6 pb-6">
                  <div className="flex flex-col gap-4 rounded-lg bg-surface p-4">
                    <div>
                      <h3 className="m-0 text-primary-deep">{targetPerformance.title}</h3>
                      <p className="m-0 text-sm">
                        Performance: <strong>{formatInTimezone(targetPerformance.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-text-muted uppercase">Rehearsal Schedule</span>
                      <div className="flex flex-col gap-1">
                        {rehearsals.length > 0 ? rehearsals.map((rehearsal) => (
                          <div key={rehearsal.id} className="flex flex-col justify-between border-b border-border py-1 text-xs md:flex-row">
                            <span>{formatInTimezone(rehearsal.date, timezone, { month: 'short', day: 'numeric', weekday: 'short' })} - {formatInTimezone(rehearsal.date, timezone, { hour: 'numeric', minute: '2-digit' })}</span>
                            <span className="text-text-muted">{rehearsal.title}</span>
                          </div>
                        )) : (
                          <p className="text-xs text-text-muted">Detailed schedule pending.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-label">Name</label>
                <input className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 px-3" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label">Email or Phone</label>
                <input className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 px-3" value={contact} onChange={(e) => setContact(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-label">Voice Part</label>
                  <select className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 px-3" value={voicePart} onChange={(e) => setVoicePart(e.target.value)}>
                    <option value="">Not sure yet</option>
                    {voicePartLabels.map((part) => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label">Available Audition Times (Select all that apply)</label>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 rounded-lg border border-border bg-neutral-100 p-4">
                  {(settings.slots || []).map((slot) => {
                    const isChecked = requestedSlots.includes(slot);
                    return (
                      <label 
                        key={slot} 
                        className={`flex cursor-pointer items-center gap-2.5 rounded-sm border p-3 transition-all select-none ${isChecked ? 'border-primary bg-[rgba(74,117,89,0.05)]' : 'border-border bg-surface'}`}
                      >
                        <input 
                          type="checkbox" 
                          className="size-[18px] cursor-pointer accent-primary"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRequestedSlots([...requestedSlots, slot]);
                            } else {
                              setRequestedSlots(requestedSlots.filter(s => s !== slot));
                            }
                          }}
                        />
                        {/* @allow-inline-style - dynamic font weight based on check state */}
                        <span style={{ fontSize: '0.875rem', fontWeight: isChecked ? 600 : 400 }}>
                          {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </label>
                    );
                  })}
                  {(!settings.slots || settings.slots.length === 0) && (
                    <span className="col-span-full py-3 text-center text-sm text-text-muted">
                      No time slots are currently configured. Please contact the administrator.
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label">Experience / Musical Background</label>
                <textarea
                  className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary min-h-[120px] resize-y p-3"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
              {error && <p className="m-0 text-danger-text">{error}</p>}
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
