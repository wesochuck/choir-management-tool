import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { pb } from '../lib/pocketbase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { calendarUtils } from '../lib/calendar';
import { formatInTimezone } from '../lib/timezone';
import { useDialog } from '../contexts/DialogContext';
import { Button } from '../components/ui';

interface EventDetails {
  id: string;
  title?: string;
  type: string;
  date: string;
  details?: string;
  location?: string;
  isOpenForRSVP?: boolean;
  expand?: {
    venue?: {
      name: string;
      address?: string;
    };
  };
}

interface ProfileDetails {
  id: string;
  name: string;
  voicePart: string;
}

export default function PublicRsvpView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  let token = searchParams.get('token') || '';
  const pParam = searchParams.get('p');
  const sParam = searchParams.get('s');
  if (token && pParam && sParam && !token.includes('p=')) {
    token = `${token}&p=${pParam}&s=${sParam}`;
  }
  const initialRsvp = searchParams.get('rsvp') as 'Yes' | 'No' | null;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [selectedRsvp, setSelectedRsvp] = useState<'Yes' | 'No'>('Yes');
  const [dbRsvp, setDbRsvp] = useState<'Yes' | 'No' | 'Pending'>('Pending');
  const [rsvpNote, setRsvpNote] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRehearsals, setShowRehearsals] = useState(false);
  const [rsvpWindow, setRsvpWindow] = useState<{
    canSubmit: boolean;
    isReadOnly: boolean;
    reason: string;
  }>({
    canSubmit: true,
    isReadOnly: false,
    reason: '',
  });

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [rehearsals, setRehearsals] = useState<EventDetails[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');

  const rsvpTitle = event?.title ? `RSVP for ${event.title}` : 'RSVP';
  useDocumentTitle(rsvpTitle);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid RSVP link. Missing secure verification token.');
      return;
    }

    const loadDetails = async () => {
      try {
        const res = await pb.send<{
          event: EventDetails;
          profile: ProfileDetails;
          currentRsvp: 'Yes' | 'No' | 'Pending';
          currentRsvpNote: string;
          rehearsals: EventDetails[];
          rsvpWindow?: {
            canSubmit: boolean;
            isReadOnly: boolean;
            reason: string;
          };
        }>('/api/rsvp-details', {
          method: 'POST',
          body: { token }
        });

        let tz = 'America/New_York';
        try {
          const setting = await pb.collection('appSettings').getFirstListItem<{ value: { timezone?: string } }>('key = "timezone"');
          if (setting?.value?.timezone) tz = setting.value.timezone;
        } catch {
          // ignore error and fallback to default timezone
          void 0;
        }

        setEvent(res.event);
        setProfile(res.profile);
        setTimezone(tz);
        setRehearsals(res.rehearsals);
        setRsvpNote(res.currentRsvpNote || "");
        setDbRsvp(res.currentRsvp || "Pending");
        setRsvpWindow(res.rsvpWindow || {
          canSubmit: true,
          isReadOnly: false,
          reason: '',
        });

        if (initialRsvp) {
          setSelectedRsvp(initialRsvp);
        } else if (res.currentRsvp !== 'Pending') {
          setSelectedRsvp(res.currentRsvp);
        }

        if (res.currentRsvp !== 'Pending') {
          setIsConfirmed(true);
        } else if (initialRsvp) {
          setIsConfirmed(false);
        }

        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        const errObj = err as { data?: { error?: string } } | null;
        setErrorMessage(errObj?.data?.error || 'This link is invalid or has expired. Please contact a choir administrator for a new link.');
      }
    };

    void loadDetails();
  }, [token, initialRsvp]);

  const handleConfirmRsvp = async (rsvpVal: 'Yes' | 'No', note: string = rsvpNote) => {
    if (!token || isUpdating || !event) return;

    if (event.type === 'Rehearsal' && rsvpVal === 'No' && !note.trim()) {
      await dialog.showMessage({
        title: 'Note Required',
        message: 'Please include a note explaining why you cannot attend this rehearsal.',
        variant: 'danger',
      });
      setSelectedRsvp('No');
      return;
    }

    if (note.trim().length > 1000) {
      await dialog.showMessage({
        title: 'Note Too Long',
        message: 'Your note cannot exceed 1000 characters.',
        variant: 'danger',
      });
      return;
    }

    setIsUpdating(true);
    try {
      await pb.send('/api/quick-rsvp', {
        method: 'POST',
        body: { 
          token, 
          rsvp: rsvpVal,
          rsvpNote: rsvpVal === 'No' ? note.trim() : ''
        }
      });
      setSelectedRsvp(rsvpVal);
      setDbRsvp(rsvpVal);
      setRsvpNote(rsvpVal === 'No' ? note.trim() : '');
      setIsConfirmed(true);
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: string } } | null;
      await dialog.showMessage({
        title: 'Could not record RSVP',
        message: errObj?.data?.error || 'Failed to record RSVP. Please try again.',
        variant: 'danger',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadCalendar = () => {
    if (event) {
      calendarUtils.generateICS(event);
    }
  };

  const renderEventCard = (titleClass?: string) => {
    if (!event) return null;
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-neutral-100 p-4 sm:p-5">
        <span className={`inline-flex items-center self-start rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${event.type === 'Performance' ? 'bg-danger-bg text-danger-text' : 'bg-primary-light text-primary-deep'}`}>
          {event.type}
        </span>
        <h2 className={`text-headline m-0 text-lg font-bold ${titleClass || ''}`}>
          {event.title || `${event.type} at ${event.expand?.venue?.name || 'Venue'}`}
        </h2>
        
        <div className="mt-1 flex flex-col gap-1.5 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <strong>{formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span>⏰</span>
            <span>{formatInTimezone(event.date, timezone, { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-start gap-2">
            <span>📍</span>
            <span>
              <strong>{event.expand?.venue?.name || event.location}</strong>
              {event.expand?.venue?.address && <span className="mt-0.5 block text-xs text-text-muted">{event.expand?.venue?.address}</span>}
            </span>
          </div>
        </div>

        {event.details && (
          <div className="mt-2.5 border-t border-border pt-2.5 text-xs leading-relaxed whitespace-pre-wrap text-text-muted">
            {event.details}
          </div>
        )}
      </div>
    );
  };

  const renderRehearsalsList = () => {
    if (rehearsals.length === 0) return null;

    return (
      <div className="mt-1 overflow-hidden rounded-xl border border-border">
        <button 
          onClick={() => setShowRehearsals(!showRehearsals)}
          className="flex w-full cursor-pointer items-center justify-between border-none bg-neutral-100 px-4 py-3 text-left"
        >
          <h3 className="text-label m-0 text-xs font-extrabold tracking-wider text-primary-deep uppercase">
            📅 Rehearsal Schedule ({rehearsals.length})
          </h3>
          <span className={`text-xs text-text-muted transition-transform ${showRehearsals ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showRehearsals && (
          <div className="flex flex-col gap-2 border-t border-border bg-surface p-3">
            {rehearsals.map((reh) => {
              return (
                <div key={reh.id} className="flex items-center justify-between rounded-lg border border-border bg-bg p-2 px-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">
                      {formatInTimezone(reh.date, timezone, { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <span className="text-[0.7rem] text-text-muted">
                      📍 {reh.expand?.venue?.name || 'Rehearsal Venue'}
                    </span>
                  </div>
                  <span className="font-medium text-text-muted">
                    {formatInTimezone(reh.date, timezone, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <p className="m-0 mt-1 text-center text-xs text-text-muted">
              Need to report a rehearsal absence? Please use your singer dashboard.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderNoteSection = (textareaClass?: string) => {
    if (event?.type !== 'Rehearsal' || selectedRsvp !== 'No') return null;
    return (
      <div className="mb-2 flex flex-col gap-2 text-left">
        <label className="text-sm font-bold text-text-muted">
          Why are you unable to attend?
        </label>
        <textarea
          value={rsvpNote}
          onChange={(e) => setRsvpNote(e.target.value)}
          placeholder="Briefly let the admins know why you cannot make this rehearsal."
          className={`box-border min-h-[100px] w-full resize-y rounded-lg border border-border p-3 font-[inherit] text-sm ${textareaClass?.replace('rsvp-textarea--short', 'min-h-[80px]') || ''}`}
          maxLength={1000}
        />
        <p className="m-0 text-xs text-text-muted">
          This note is visible to choir admins.
        </p>
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-primary-light">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin text-4xl">🔄</div>
          <h2 className="m-0 font-extrabold text-primary-deep">Loading Secure RSVP Details...</h2>
          <p className="m-0 text-text-muted">Preparing event context, please wait.</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !event || !profile) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-[#fef2f2]">
        <AppCard className="w-full max-w-[min(440px,calc(100vw-32px))] border border-red-100 p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl">⚠️</div>
            <h2 className="m-0 font-extrabold text-red-800">RSVP Request Failed</h2>
            <p className="m-0 mt-1 leading-relaxed text-text-muted">
              {errorMessage}
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                as="a"
                href="/login"
                variant="primary"
                className="w-full font-bold no-underline"
              >
                Sign In to Member Portal
              </Button>
              <Button
                as="a"
                href="mailto:admin@choir.org"
                variant="outline"
                className="w-full font-bold no-underline"
              >
                📧 Contact Choir Admins
              </Button>
            </div>
          </div>
        </AppCard>
      </div>
    );
  }

  const isAttending = selectedRsvp === 'Yes';

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-start bg-primary-light px-4 py-6 sm:px-6 lg:py-8">
      <div className="m-auto w-full max-w-[540px]">
        <AppCard className="box-border flex w-full flex-col gap-6 border p-6">
          
          {rsvpWindow.isReadOnly && (
            <div className="border border-border bg-neutral-100 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md p-4">
              <p className="m-0 text-text-muted">
                {rsvpWindow.reason}
              </p>
              {event?.type === 'Performance' && (
                <p className="m-0 mt-1 text-xs text-text-muted">
                  You can still report future rehearsal absences from your singer dashboard.
                </p>
              )}
            </div>
          )}

          {!rsvpWindow.canSubmit ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-1 border-b border-border pb-4 text-center">
                <div className="mb-2 text-5xl">📅</div>
                <h1 className="m-0 text-2xl font-extrabold text-primary-deep">
                  RSVP Details
                </h1>
                <p className="m-0 text-sm text-text-muted">
                  Hello <strong>{profile.name}</strong>, the details for this event are shown below.
                </p>
              </div>

              {renderEventCard()}

              {renderRehearsalsList()}

              <div className="bg-surface border border-border rounded-lg shadow-sm transition-all duration-200 hover:shadow-md p-4 text-center">
                <div className="text-xs font-bold tracking-wider text-text-muted uppercase">Your response</div>
                <div className={`mt-2 text-xl font-extrabold ${dbRsvp === 'Yes' ? 'text-primary-deep' : dbRsvp === 'No' ? 'text-[#ef4444]' : 'text-gray-500'}`}>
                  {dbRsvp === 'Yes'
                    ? 'Attending'
                    : dbRsvp === 'No'
                    ? 'Declining'
                    : 'No response recorded'}
                </div>
                {dbRsvp === 'No' && rsvpNote && (
                  <div className="mt-3 border-t border-border pt-2 text-left text-sm text-text-muted">
                    <strong>Note:</strong> {rsvpNote}
                  </div>
                )}
              </div>

              <div className="flex w-full gap-2 border-t border-border pt-4">
                {dbRsvp === 'Yes' && (
                  <Button 
                    onClick={handleDownloadCalendar}
                    variant="secondary"
                    className="flex-1 font-bold"
                  >
                    📅 Add to Calendar (.ics)
                  </Button>
                )}
                <Button 
                  as="a"
                  href="/login" 
                  variant="outline"
                  className="flex-1 font-bold no-underline"
                >
                  Sign In to Portal
                </Button>
              </div>
            </div>
          ) : !isConfirmed ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-1 border-b border-border pb-4 text-center">
                <div className="mb-2 text-5xl">✉️</div>
                <h1 className="m-0 text-2xl font-extrabold text-primary-deep">
                  Confirm Your RSVP
                </h1>
                <p className="m-0 text-sm text-text-muted">
                  Hello <strong>{profile.name}</strong>, please confirm your attendance status below.
                </p>
              </div>

              {renderEventCard()}

              {renderRehearsalsList()}

              <div className="flex flex-col gap-3">
                {renderNoteSection()}
                <p className="m-0 text-center text-xs text-text-muted">
                  Are you planning to attend?
                </p>
                <div className="flex w-full gap-2">
                  <Button
                    onClick={() => handleConfirmRsvp('Yes')}
                    disabled={isUpdating}
                    variant="primary"
                    className={`h-12 flex-1 font-bold ${selectedRsvp === 'Yes' ? 'opacity-100 border-2 border-primary-deep' : 'opacity-60 border border-border'}`}
                  >
                    {isUpdating && selectedRsvp === 'Yes' ? 'Confirming...' : 'Yes, I Will Attend'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (event.type === 'Rehearsal' && selectedRsvp !== 'No') {
                        setSelectedRsvp('No');
                      } else {
                        handleConfirmRsvp('No');
                      }
                    }}
                    disabled={isUpdating}
                    variant="danger"
                    className={`h-12 flex-1 font-bold ${selectedRsvp === 'No' ? 'opacity-100 border-2 border-[#991b1b]' : 'opacity-60 border border-border'}`}
                  >
                    {isUpdating && selectedRsvp === 'No' ? 'Confirming...' : (event.type === 'Rehearsal' && selectedRsvp === 'No' ? 'Confirm RSVP Decline' : 'No, I Cannot Attend')}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 text-center text-xs text-text-muted">
                <span>Not <strong>{profile.name}</strong>? </span>
                <a href="/login" className="font-semibold text-primary underline">Sign in as yourself</a>
                <span> or </span>
                <a href="mailto:admin@choir.org" className="font-semibold text-primary underline">Contact Admins</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-1 border-b border-border pb-4 text-center">
                <div 
                  className={`mb-1 flex size-20 items-center justify-center rounded-full text-5xl transition-all duration-300 ${isAttending ? 'bg-[#e6f4ea] text-primary' : 'bg-[#fce8e6] text-[#c5221f]'}`}
                >
                  {isAttending ? '✓' : '✗'}
                </div>
                <h1 className="m-0 text-2xl font-extrabold text-primary-deep">
                  {isAttending ? 'Confirmed: Attending' : 'Confirmed: Not Attending'}
                </h1>
                <p className="m-0 text-sm text-text-muted">
                  Thank you, <strong>{profile.name}</strong>. Your response has been securely recorded.
                </p>
              </div>

              {renderEventCard('text-xl font-bold')}

              {renderRehearsalsList()}

              <div className="flex flex-col gap-4 border-t border-border pt-4">
                {renderNoteSection('min-h-[80px]')}
                {event.type === 'Rehearsal' && selectedRsvp === 'No' && (
                  <div className="flex items-center justify-between">
                    <p className="m-0 text-xs text-text-muted">
                      This note is visible to choir admins.
                    </p>
                    <Button 
                      onClick={() => handleConfirmRsvp('No')}
                      disabled={isUpdating}
                      variant="primary"
                      size="small"
                      className="font-bold"
                    >
                      {isUpdating ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-xs font-bold text-text-muted">
                    Need to change your response?
                  </label>
                  
                  <div className="flex h-12 w-full rounded-xl border border-border bg-[var(--primary-light,#f1f5f9)] p-1 max-sm:h-auto max-sm:flex-col max-sm:gap-2 max-sm:border-none max-sm:bg-transparent max-sm:p-0">
                    <Button
                      onClick={() => handleConfirmRsvp('Yes')}
                      disabled={isUpdating}
                      variant={isAttending ? 'primary' : 'outline'}
                      className={`h-full flex-1 text-sm font-bold transition-all ${
                        isAttending
                          ? 'shadow-[0_2px_8px_rgba(74,117,89,0.2)]'
                          : 'shadow-none max-sm:h-12 max-sm:rounded-lg max-sm:border max-sm:border-border max-sm:bg-[var(--border-light,#f8fafc)]'
                      }`}
                    >
                      {isUpdating && isAttending ? 'Updating...' : 'I Will Attend'}
                    </Button>
                    <Button
                      onClick={() => {
                        if (event.type === 'Rehearsal' && selectedRsvp !== 'No') {
                          setSelectedRsvp('No');
                        } else {
                          handleConfirmRsvp('No');
                        }
                      }}
                      disabled={isUpdating}
                      variant={!isAttending ? 'danger' : 'outline'}
                      className={`h-full flex-1 text-sm font-bold transition-all ${
                        !isAttending
                          ? 'shadow-[0_2px_8px_rgba(239,68,68,0.2)]'
                          : 'shadow-none max-sm:h-12 max-sm:rounded-lg max-sm:border max-sm:border-border max-sm:bg-[var(--border-light,#f8fafc)]'
                      }`}
                    >
                      {isUpdating && !isAttending ? 'Updating...' : 'I Cannot Attend'}
                    </Button>
                  </div>
                </div>

                <div className="mb-2 text-center text-xs text-text-muted">
                  <span>Not <strong>{profile.name}</strong>? </span>
                  <a href="/login" className="font-semibold text-primary underline">Sign in as yourself</a>
                </div>

                <div className="flex w-full gap-2 border-t border-border pt-4 max-sm:flex-col max-sm:items-stretch">
                  {isAttending && (
                    <Button 
                      onClick={handleDownloadCalendar}
                      variant="secondary"
                      className="flex-1 font-bold"
                    >
                      📅 Add to Calendar (.ics)
                    </Button>
                  )}
                  <Button 
                    as="a"
                    href="/login" 
                    variant="outline"
                    className="flex-1 font-bold no-underline"
                  >
                    Sign In to Portal
                  </Button>
                </div>
              </div>
            </div>
          )}

        </AppCard>
      </div>
    </div>
  );
}
