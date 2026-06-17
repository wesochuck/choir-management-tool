import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppCard } from '../components/common/AppCard';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { Button, Select, Input, Textarea } from '../components/ui';
import { auditionService, type Audition } from '../services/auditionService';
import { DEFAULT_AUDITION_SETTINGS, settingsService } from '../services/settingsService';
import { eventService } from '../services/eventService';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useVoiceParts } from '../hooks/useVoiceParts';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { queryKeys } from '../lib/queryKeys';

export default function PublicAuditionView() {
  useDocumentTitle('Auditions');
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(window.innerWidth > 640);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [requestedSlots, setRequestedSlots] = useState<string[]>([]);
  const [voicePart, setVoicePart] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { labels: voicePartLabels } = useVoiceParts();
 
  const settingsQuery = useQuery({
    queryKey: queryKeys.auditions.settings,
    queryFn: async () => {
      const [loaded, tz, loadedHomepage] = await Promise.all([
        settingsService.getAuditionSettings(),
        fetchChoirTimezone().catch(() => 'America/New_York'),
        settingsService.getHomepageUrl().catch(() => ''),
      ]);
      return { settings: loaded, timezone: tz, homepageUrl: loadedHomepage };
    },
  });

  const performanceId = settingsQuery.data?.settings.defaultPerformanceId;
  const performanceQuery = useQuery({
    queryKey: performanceId ? queryKeys.auditions.performance(performanceId) : queryKeys.auditions.list,
    queryFn: async () => {
      const performance = await eventService.getPublicEventById(performanceId!);
      const rehearsalList = await eventService.getPublicRehearsalsForPerformance(performance.id);
      return { performance, rehearsals: rehearsalList };
    },
    enabled: !!performanceId,
  });

  const settings = settingsQuery.data?.settings ?? DEFAULT_AUDITION_SETTINGS;
  const timezone = settingsQuery.data?.timezone ?? 'America/New_York';
  const homepageUrl = settingsQuery.data?.homepageUrl ?? '';
  const targetPerformance = performanceQuery.data?.performance ?? null;
  const rehearsals = performanceQuery.data?.rehearsals ?? [];
  const isLoading = settingsQuery.isLoading;

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
    <PublicBrandingWrapper>
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
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
              <Button 
                as="a"
                href={homepageUrl} 
                className="mt-4 inline-flex items-center gap-1.5 self-start no-underline"
                variant="primary"
              >
                🏠 Visit our Homepage
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="overflow-hidden rounded-xl border border-border bg-primary-light p-0 shadow-sm transition-all duration-200 hover:shadow-md">
              <button 
                onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                className="flex w-full cursor-pointer flex-row justify-between border-none bg-none px-6 py-4 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-label text-primary-deep">CONCERT DETAILS & SCHEDULE</span>
                  <span className="text-xs text-text-muted">Please review the commitment for this concert series</span>
                </div>
                <span className={`text-[1.2rem] transition-transform duration-200 ${isScheduleExpanded ? 'rotate-180' : 'rotate-0'}`}>
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
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label">Email or Phone</label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-label">Voice Part</label>
                  <Select className="h-11" value={voicePart} onChange={(e) => setVoicePart(e.target.value)}>
                    <option value="">Not sure yet</option>
                    {voicePartLabels.map((part) => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </Select>
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
                        <span className={`text-sm ${isChecked ? 'font-semibold' : 'font-normal'}`}>
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
                <Textarea
                  className="min-h-[120px]"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
              {error && <p className="m-0 text-danger-text">{error}</p>}
              <Button type="submit" disabled={isSubmitting} variant="primary">
                {isSubmitting ? 'Submitting...' : 'Request Audition'}
              </Button>
            </form>
          </div>
        )}
      </AppCard>
    </PublicBrandingWrapper>
  );
}
