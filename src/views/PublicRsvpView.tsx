import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { pb } from '../lib/pocketbase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { calendarUtils } from '../lib/calendar';
import { formatInTimezone } from '../lib/timezone';
import { useDialog } from '../contexts/DialogContext';

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
      <div className="flex flex-col gap-2 bg-neutral-bg border border-border p-4 sm:p-5 rounded-xl">
        <span className={`inline-flex items-center self-start text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${event.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary-light text-primary-deep'}`}>
          {event.type}
        </span>
        <h2 className={`text-headline m-0 text-lg font-bold ${titleClass || ''}`}>
          {event.title || `${event.type} at ${event.expand?.venue?.name || 'Venue'}`}
        </h2>
        
        <div className="flex flex-col gap-1.5 text-sm text-text-muted mt-1">
          <div className="flex gap-2 items-center">
            <span>📅</span>
            <strong>{formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
          <div className="flex gap-2 items-center">
            <span>⏰</span>
            <span>{formatInTimezone(event.date, timezone, { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div className="flex gap-2 items-start">
            <span>📍</span>
            <span>
              <strong>{event.expand?.venue?.name || event.location}</strong>
              {event.expand?.venue?.address && <span className="block text-xs text-text-muted mt-0.5">{event.expand?.venue?.address}</span>}
            </span>
          </div>
        </div>

        {event.details && (
          <div className="border-t border-border pt-2.5 mt-2.5 text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
            {event.details}
          </div>
        )}
      </div>
    );
  };

  const renderRehearsalsList = () => {
    if (rehearsals.length === 0) return null;

    return (
      <div className="border border-border rounded-xl overflow-hidden mt-1">
        <button 
          onClick={() => setShowRehearsals(!showRehearsals)}
          className="w-full px-4 py-3 flex justify-between items-center bg-neutral-bg border-none cursor-pointer text-left"
        >
          <h3 className="text-label font-extrabold uppercase text-primary-deep text-xs tracking-wider m-0">
            📅 Rehearsal Schedule ({rehearsals.length})
          </h3>
          <span className={`text-xs text-text-muted transition-transform ${showRehearsals ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showRehearsals && (
          <div className="flex flex-col gap-2 p-3 bg-surface border-t border-border">
            {rehearsals.map((reh) => {
              return (
                <div key={reh.id} className="flex justify-between items-center bg-bg border border-border p-2 px-3 rounded-lg text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">
                      {formatInTimezone(reh.date, timezone, { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <span className="text-text-muted text-[0.7rem]">
                      📍 {reh.expand?.venue?.name || 'Rehearsal Venue'}
                    </span>
                  </div>
                  <span className="text-text-muted font-medium">
                    {formatInTimezone(reh.date, timezone, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <p className="text-text-muted text-xs text-center mt-1 m-0">
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
      <div className="flex flex-col gap-2 mb-2 text-left">
        <label className="text-sm font-bold text-text-muted">
          Why are you unable to attend?
        </label>
        <textarea
          value={rsvpNote}
          onChange={(e) => setRsvpNote(e.target.value)}
          placeholder="Briefly let the admins know why you cannot make this rehearsal."
          className={`w-full min-h-[100px] p-3 rounded-lg border border-border text-sm font-inherit resize-y box-border ${textareaClass?.replace('rsvp-textarea--short', 'min-h-[80px]') || ''}`}
          maxLength={1000}
        />
        <p className="text-xs text-text-muted m-0">
          This note is visible to choir admins.
        </p>
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col min-h-screen w-screen bg-primary-light items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-spin">🔄</div>
          <h2 className="text-primary-deep font-extrabold m-0">Loading Secure RSVP Details...</h2>
          <p className="text-text-muted m-0">Preparing event context, please wait.</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !event || !profile) {
    return (
      <div className="flex flex-col min-h-screen w-screen bg-[#fef2f2] items-center justify-center">
        <AppCard className="w-full max-w-[min(440px,calc(100vw-32px))] p-6 text-center border border-red-100">
          <div className="flex flex-col gap-4 items-center">
            <div className="text-5xl">⚠️</div>
            <h2 className="m-0 text-red-800 font-extrabold">RSVP Request Failed</h2>
            <p className="text-text-muted leading-relaxed mt-1 m-0">
              {errorMessage}
            </p>
            <div className="mt-4 w-full flex flex-col gap-2">
              <a
                href="/login"
                className="btn btn-primary inline-flex w-full justify-center items-center no-underline h-11 font-bold"
              >
                Sign In to Member Portal
              </a>
              <a
                href="mailto:admin@choir.org"
                className="btn btn-ghost inline-flex w-full justify-center items-center no-underline h-11 font-bold border border-border"
              >
                📧 Contact Choir Admins
              </a>
            </div>
          </div>
        </AppCard>
      </div>
    );
  }

  const isAttending = selectedRsvp === 'Yes';

  return (
    <div className="flex flex-col min-h-screen w-screen bg-primary-light items-center justify-start px-4 sm:px-6 py-6 lg:py-8">
      <div className="m-auto w-full max-w-[540px]">
        <AppCard className="w-full p-6 flex flex-col gap-6 border box-border">
          
          {rsvpWindow.isReadOnly && (
            <div className="card p-4 border border-border rounded-lg bg-neutral-bg">
              <p className="text-text-muted m-0">
                {rsvpWindow.reason}
              </p>
              {event?.type === 'Performance' && (
                <p className="text-text-muted text-xs mt-1 m-0">
                  You can still report future rehearsal absences from your singer dashboard.
                </p>
              )}
            </div>
          )}

          {!rsvpWindow.canSubmit ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center text-center gap-1 pb-4 border-b border-border">
                <div className="text-5xl mb-2">📅</div>
                <h1 className="text-2xl font-extrabold m-0 text-primary-deep">
                  RSVP Details
                </h1>
                <p className="m-0 text-sm text-text-muted">
                  Hello <strong>{profile.name}</strong>, the details for this event are shown below.
                </p>
              </div>

              {renderEventCard()}

              {renderRehearsalsList()}

              <div className="card p-4 border border-border rounded-lg bg-surface text-center">
                <div className="font-bold text-xs text-text-muted uppercase tracking-wider">Your response</div>
                {/* @allow-inline-style - dynamic color based on RSVP status */}
                <div className="text-xl font-extrabold mt-2" style={{ color: dbRsvp === 'Yes' ? 'var(--primary-deep)' : dbRsvp === 'No' ? '#ef4444' : '#6b7280' }}>
                  {dbRsvp === 'Yes'
                    ? 'Attending'
                    : dbRsvp === 'No'
                    ? 'Declining'
                    : 'No response recorded'}
                </div>
                {dbRsvp === 'No' && rsvpNote && (
                  <div className="mt-3 text-sm text-text-muted border-t border-border pt-2 text-left">
                    <strong>Note:</strong> {rsvpNote}
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full border-t border-border pt-4">
                {dbRsvp === 'Yes' && (
                  <button 
                    onClick={handleDownloadCalendar}
                    className="btn btn-secondary flex-1 h-11 font-bold justify-center gap-1.5"
                  >
                    📅 Add to Calendar (.ics)
                  </button>
                )}
                <a 
                  href="/login" 
                  className="btn btn-ghost flex-1 h-11 font-bold justify-center no-underline inline-flex items-center border border-border"
                >
                  Sign In to Portal
                </a>
              </div>
            </div>
          ) : !isConfirmed ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center text-center gap-1 pb-4 border-b border-border">
                <div className="text-5xl mb-2">✉️</div>
                <h1 className="text-2xl font-extrabold m-0 text-primary-deep">
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
                <p className="text-xs text-text-muted text-center m-0">
                  Are you planning to attend?
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleConfirmRsvp('Yes')}
                    disabled={isUpdating}
                    className="btn btn-primary flex-1 h-12 font-bold justify-center"
                    // @allow-inline-style - dynamic opacity/border based on RSVP selection
                    style={{
                      opacity: selectedRsvp === 'Yes' ? 1 : 0.6,
                      border: selectedRsvp === 'Yes' ? '2px solid var(--primary-deep)' : '1px solid var(--border)'
                    }}
                  >
                    {isUpdating && selectedRsvp === 'Yes' ? 'Confirming...' : 'Yes, I Will Attend'}
                  </button>
                  <button
                    onClick={() => {
                      if (event.type === 'Rehearsal' && selectedRsvp !== 'No') {
                        setSelectedRsvp('No');
                      } else {
                        handleConfirmRsvp('No');
                      }
                    }}
                    disabled={isUpdating}
                    className="btn btn-danger flex-1 h-12 font-bold justify-center"
                    // @allow-inline-style - dynamic opacity/color/border based on RSVP selection
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      opacity: selectedRsvp === 'No' ? 1 : 0.6,
                      border: selectedRsvp === 'No' ? '2px solid #991b1b' : '1px solid var(--border)'
                    }}
                  >
                    {isUpdating && selectedRsvp === 'No' ? 'Confirming...' : (event.type === 'Rehearsal' && selectedRsvp === 'No' ? 'Confirm RSVP Decline' : 'No, I Cannot Attend')}
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-4 text-center text-xs text-text-muted">
                <span>Not <strong>{profile.name}</strong>? </span>
                <a href="/login" className="text-primary font-semibold underline">Sign in as yourself</a>
                <span> or </span>
                <a href="mailto:admin@choir.org" className="text-primary font-semibold underline">Contact Admins</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center text-center gap-1 pb-4 border-b border-border">
                <div 
                  className="text-5xl w-20 h-20 rounded-full flex items-center justify-center mb-1 transition-all duration-300"
                  // @allow-inline-style - dynamic attendance state background/color
                  style={{ 
                    backgroundColor: isAttending ? '#e6f4ea' : '#fce8e6', 
                    color: isAttending ? 'var(--primary)' : '#c5221f',
                  }}
                >
                  {isAttending ? '✓' : '✗'}
                </div>
                <h1 className="text-2xl font-extrabold m-0 text-primary-deep">
                  {isAttending ? 'Confirmed: Attending' : 'Confirmed: Not Attending'}
                </h1>
                <p className="m-0 text-sm text-text-muted">
                  Thank you, <strong>{profile.name}</strong>. Your response has been securely recorded.
                </p>
              </div>

              {renderEventCard('text-xl font-bold')}

              {renderRehearsalsList()}

              <div className="flex flex-col gap-4 pt-4 border-t border-border">
                {renderNoteSection('min-h-[80px]')}
                {event.type === 'Rehearsal' && selectedRsvp === 'No' && (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-text-muted m-0">
                      This note is visible to choir admins.
                    </p>
                    <button 
                      onClick={() => handleConfirmRsvp('No')}
                      disabled={isUpdating}
                      className="btn btn-primary h-9 font-bold px-4 text-xs"
                    >
                      {isUpdating ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-xs font-bold text-text-muted">
                    Need to change your response?
                  </label>
                  
                  <div className="flex bg-[var(--primary-light,#f1f5f9)] p-1 rounded-xl border border-border w-full h-12 max-sm:flex-col max-sm:h-auto max-sm:gap-2 max-sm:bg-transparent max-sm:border-none max-sm:p-0">
                    <button
                      onClick={() => handleConfirmRsvp('Yes')}
                      disabled={isUpdating}
                      className={`btn flex-1 h-full border-none rounded-lg cursor-pointer text-sm font-bold transition-all ${!isAttending ? 'bg-transparent text-text-muted shadow-none max-sm:bg-[var(--border-light,#f8fafc)] max-sm:text-text-muted max-sm:border max-sm:border-border max-sm:rounded-lg max-sm:h-12' : ''}`}
                      style={isAttending ? {
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(74, 117, 89, 0.2)'
                      } : undefined}
                    >
                      {isUpdating && isAttending ? 'Updating...' : 'I Will Attend'}
                    </button>
                    <button
                      onClick={() => {
                        if (event.type === 'Rehearsal' && selectedRsvp !== 'No') {
                          setSelectedRsvp('No');
                        } else {
                          handleConfirmRsvp('No');
                        }
                      }}
                      disabled={isUpdating}
                      className={`btn flex-1 h-full border-none rounded-lg cursor-pointer text-sm font-bold transition-all ${isAttending ? 'bg-transparent text-text-muted shadow-none max-sm:bg-[var(--border-light,#f8fafc)] max-sm:text-text-muted max-sm:border max-sm:border-border max-sm:rounded-lg max-sm:h-12' : ''}`}
                      style={!isAttending ? {
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                      } : undefined}
                    >
                      {isUpdating && !isAttending ? 'Updating...' : 'I Cannot Attend'}
                    </button>
                  </div>
                </div>

                <div className="text-center text-xs text-text-muted mb-2">
                  <span>Not <strong>{profile.name}</strong>? </span>
                  <a href="/login" className="text-primary font-semibold underline">Sign in as yourself</a>
                </div>

                <div className="flex gap-2 w-full border-t border-border pt-4 max-sm:flex-col max-sm:items-stretch">
                  {isAttending && (
                    <button 
                      onClick={handleDownloadCalendar}
                      className="btn btn-secondary flex-1 h-11 font-bold justify-center gap-1.5"
                    >
                      📅 Add to Calendar (.ics)
                    </button>
                  )}
                  <a 
                    href="/login" 
                    className="btn btn-ghost flex-1 h-11 font-bold justify-center no-underline inline-flex items-center border border-border"
                  >
                    Sign In to Portal
                  </a>
                </div>
              </div>
            </div>
          )}

        </AppCard>
      </div>
    </div>
  );
}
