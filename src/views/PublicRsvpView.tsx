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
  
  // RSVP State
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

  // Loaded Details
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
        // Fetch Event, Profile, and Timezone Details securely without auth
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

        // Resolve local tz if available
        let tz = 'America/New_York';
        try {
          const setting = await pb.collection('appSettings').getFirstListItem<{ value: { timezone?: string } }>('key = "timezone"');
          if (setting?.value?.timezone) tz = setting.value.timezone;
        } catch {
          // Fallback to default America/New_York
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

        // Determine default selection and whether we skip confirmation
        if (initialRsvp) {
          setSelectedRsvp(initialRsvp);
        } else if (res.currentRsvp !== 'Pending') {
          setSelectedRsvp(res.currentRsvp);
        }

        // If the user has already recorded a response, skip initial confirmation
        if (res.currentRsvp !== 'Pending') {
          setIsConfirmed(true);
        } else if (initialRsvp) {
          // If they came from a specific button in email but haven't saved yet, show confirmation
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

    // Client-side validation
    if (event.type === 'Rehearsal' && rsvpVal === 'No' && !note.trim()) {
      await dialog.showMessage({
        title: 'Note Required',
        message: 'Please include a note explaining why you cannot attend this rehearsal.',
        variant: 'danger',
      });
      setSelectedRsvp('No'); // Ensure the note field is shown
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
      <div className="rsvp-event-card">
        <span className={`badge ${event.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'} rsvp-event-badge`}>
          {event.type}
        </span>
        <h2 className={`text-headline rsvp-event-title ${titleClass || ''}`}>
          {event.title || `${event.type} at ${event.expand?.venue?.name || 'Venue'}`}
        </h2>
        
        <div className="rsvp-event-meta">
          <div className="rsvp-event-meta-row">
            <span>📅</span>
            <strong>{formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
          <div className="rsvp-event-meta-row">
            <span>⏰</span>
            <span>{formatInTimezone(event.date, timezone, { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div className="rsvp-event-meta-row rsvp-event-meta-row--top">
            <span>📍</span>
            <span>
              <strong>{event.expand?.venue?.name || event.location}</strong>
              {event.expand?.venue?.address && <span className="rsvp-event-address">{event.expand?.venue?.address}</span>}
            </span>
          </div>
        </div>

        {event.details && (
          <div className="rsvp-event-details">
            {event.details}
          </div>
        )}
      </div>
    );
  };

  const renderRehearsalsList = () => {
    if (rehearsals.length === 0) return null;

    return (
      <div className="rsvp-rehearsals-container">
        <button 
          onClick={() => setShowRehearsals(!showRehearsals)}
          className="rsvp-rehearsals-toggle"
        >
          <h3 className="text-label rsvp-rehearsals-heading">
            📅 Rehearsal Schedule ({rehearsals.length})
          </h3>
          <span className={`rsvp-rehearsals-arrow ${showRehearsals ? 'rsvp-rehearsals-arrow--open' : ''}`}>
            ▼
          </span>
        </button>

        {showRehearsals && (
          <div className="rsvp-rehearsals-list">
            {rehearsals.map((reh) => {
              return (
                <div key={reh.id} className="rsvp-rehearsal-item">
                  <div className="rsvp-rehearsal-info">
                    <span className="rsvp-rehearsal-date">
                      {formatInTimezone(reh.date, timezone, { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <span className="text-muted rsvp-rehearsal-venue">
                      📍 {reh.expand?.venue?.name || 'Rehearsal Venue'}
                    </span>
                  </div>
                  <span className="text-muted rsvp-rehearsal-time">
                    {formatInTimezone(reh.date, timezone, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <p className="text-muted rsvp-rehearsal-hint">
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
      <div className="rsvp-note-section">
        <label className="rsvp-note-label">
          Why are you unable to attend?
        </label>
        <textarea
          value={rsvpNote}
          onChange={(e) => setRsvpNote(e.target.value)}
          placeholder="Briefly let the admins know why you cannot make this rehearsal."
          className={`rsvp-textarea ${textareaClass || ''}`}
          maxLength={1000}
        />
        <p className="rsvp-note-hint">
          This note is visible to choir admins.
        </p>
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="public-page public-page--primary">
        <div className="public-loading-container">
          <div className="public-loading-icon">🔄</div>
          <h2 className="public-loading-title">Loading Secure RSVP Details...</h2>
          <p className="text-muted public-loading-subtitle">Preparing event context, please wait.</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !event || !profile) {
    return (
      <div className="public-page public-page--error">
        <AppCard className="public-content-sm public-error-card">
          <div className="public-error-body">
            <div className="public-error-icon">⚠️</div>
            <h2 className="public-error-heading">RSVP Request Failed</h2>
            <p className="public-error-text">
              {errorMessage}
            </p>
            <div className="public-error-actions">
              <a
                href="/login"
                className="btn btn-primary public-error-link"
              >
                Sign In to Member Portal
              </a>
              <a
                href="mailto:admin@choir.org"
                className="btn btn-ghost public-error-link public-error-link--ghost"
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
    <div className="public-page public-page--primary public-page--top">
      <div className="public-content-lg">
        <AppCard className="public-main-card">
          
          {rsvpWindow.isReadOnly && (
            <div className="card rsvp-readonly-banner">
              <p className="text-muted">
                {rsvpWindow.reason}
              </p>
              {event?.type === 'Performance' && (
                <p className="text-muted rsvp-readonly-hint">
                  You can still report future rehearsal absences from your singer dashboard.
                </p>
              )}
            </div>
          )}

          {!rsvpWindow.canSubmit ? (
            /* Read-Only Screen */
            <div className="public-section">
              <div className="public-header">
                <div className="public-header-icon">📅</div>
                <h1 className="public-header-title">
                  RSVP Details
                </h1>
                <p className="public-header-subtitle text-muted">
                  Hello <strong>{profile.name}</strong>, the details for this event are shown below.
                </p>
              </div>

              {/* Event Details Summary */}
              {renderEventCard()}

              {renderRehearsalsList()}

              {/* Show the singer's current response as read-only */}
              <div className="card rsvp-response-card">
                <div className="rsvp-response-label">Your response</div>
                {/* @allow-inline-style - dynamic color based on dbRsvp state */}
                <div className="text-headline rsvp-response-value" style={{ color: dbRsvp === 'Yes' ? 'var(--primary-deep)' : dbRsvp === 'No' ? '#ef4444' : 'var(--neutral-text)' }}>
                  {dbRsvp === 'Yes'
                    ? 'Attending'
                    : dbRsvp === 'No'
                    ? 'Declining'
                    : 'No response recorded'}
                </div>
                {dbRsvp === 'No' && rsvpNote && (
                  <div className="rsvp-response-note">
                    <strong>Note:</strong> {rsvpNote}
                  </div>
                )}
              </div>

              <div className="rsvp-actions-row">
                {dbRsvp === 'Yes' && (
                  <button 
                    onClick={handleDownloadCalendar}
                    className="btn btn-secondary rsvp-action-btn"
                  >
                    📅 Add to Calendar (.ics)
                  </button>
                )}
                <a 
                  href="/login" 
                  className="btn btn-ghost rsvp-action-link"
                >
                  Sign In to Portal
                </a>
              </div>
            </div>
          ) : !isConfirmed ? (
            /* Confirmation Screen (Prevents pre-clicks, verifies human action) */
            <div className="public-section">
              <div className="public-header">
                <div className="public-header-icon">✉️</div>
                <h1 className="public-header-title">
                  Confirm Your RSVP
                </h1>
                <p className="public-header-subtitle text-muted">
                  Hello <strong>{profile.name}</strong>, please confirm your attendance status below.
                </p>
              </div>

              {/* Event Details Summary */}
              {renderEventCard()}

              {renderRehearsalsList()}

              {/* Interactive Buttons */}
              <div className="public-section-gap-12">
                {renderNoteSection()}
                <p className="text-muted rsvp-prompt">
                  Are you planning to attend?
                </p>
                <div className="rsvp-button-group">
                  <button
                    onClick={() => handleConfirmRsvp('Yes')}
                    disabled={isUpdating}
                    className="btn btn-primary rsvp-confirm-btn"
                    // @allow-inline-style - dynamic opacity and border based on selectedRsvp state
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
                    className="btn btn-danger rsvp-confirm-btn"
                    // @allow-inline-style - dynamic opacity and border based on selectedRsvp state
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

              {/* Escape hatch for wrong person / forwarded links */}
              <div className="public-footer rsvp-identity-row">
                <span>Not <strong>{profile.name}</strong>? </span>
                <a href="/login" className="rsvp-identity-link">Sign in as yourself</a>
                <span> or </span>
                <a href="mailto:admin@choir.org" className="rsvp-identity-link">Contact Admins</a>
              </div>
            </div>
          ) : (
            /* Success Screen (Shown once response confirmed or loaded from previous RSVP) */
            <div className="public-section">
              {/* Header Status Visual */}
              <div className="public-header">
                <div 
                  className="rsvp-status-icon"
                  // @allow-inline-style - dynamic background/color based on isAttending state
                  style={{ 
                    backgroundColor: isAttending ? '#e6f4ea' : '#fce8e6', 
                    color: isAttending ? 'var(--primary)' : '#c5221f',
                  }}
                >
                  {isAttending ? '✓' : '✗'}
                </div>
                <h1 className="public-header-title">
                  {isAttending ? 'Confirmed: Attending' : 'Confirmed: Not Attending'}
                </h1>
                <p className="public-header-subtitle text-muted">
                  Thank you, <strong>{profile.name}</strong>. Your response has been securely recorded.
                </p>
              </div>

              {/* Event Details Card */}
              {renderEventCard('rsvp-event-title--lg')}

              {renderRehearsalsList()}

              {/* Modify State & Actions */}
              <div className="rsvp-change-section">
                {renderNoteSection('rsvp-textarea--short')}
                {event.type === 'Rehearsal' && selectedRsvp === 'No' && (
                  <div className="rsvp-note-footer">
                    <p className="rsvp-note-hint">
                      This note is visible to choir admins.
                    </p>
                    <button 
                      onClick={() => handleConfirmRsvp('No')}
                      disabled={isUpdating}
                      className="btn btn-primary rsvp-save-note-btn"
                    >
                      {isUpdating ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                )}
                <div className="rsvp-change-toggle-section">
                  <label className="text-label rsvp-change-label">
                    Need to change your response?
                  </label>
                  
                  <div className="rsvp-button-group-segment">
                    <button
                      onClick={() => handleConfirmRsvp('Yes')}
                      disabled={isUpdating}
                      className={`btn rsvp-segment-btn ${!isAttending ? 'rsvp-segment-btn--inactive' : ''}`}
                      // @allow-inline-style - dynamic active state colors based on isAttending
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
                      className={`btn rsvp-segment-btn ${isAttending ? 'rsvp-segment-btn--inactive' : ''}`}
                      // @allow-inline-style - dynamic active state colors based on isAttending
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

                {/* Escape hatch for wrong person on success screen */}
                <div className="rsvp-identity-row rsvp-identity-row--mb">
                  <span>Not <strong>{profile.name}</strong>? </span>
                  <a href="/login" className="rsvp-identity-link">Sign in as yourself</a>
                </div>

                {/* Helper Action Buttons */}
                <div className="rsvp-actions-row">
                  {isAttending && (
                    <button 
                      onClick={handleDownloadCalendar}
                      className="btn btn-secondary rsvp-action-btn"
                    >
                      📅 Add to Calendar (.ics)
                    </button>
                  )}
                  <a 
                    href="/login" 
                    className="btn btn-ghost rsvp-action-link"
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
