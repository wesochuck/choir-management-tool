import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { pb } from '../lib/pocketbase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { calendarUtils } from '../lib/calendar';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';

interface EventDetails {
  id: string;
  title?: string;
  type: string;
  date: string;
  details?: string;
  location?: string;
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
  
  // RSVP Interactive State
  const [currentRsvp, setCurrentRsvp] = useState<'Yes' | 'No' | null>(initialRsvp);
  const [isUpdating, setIsUpdating] = useState(false);

  // Loaded Details
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [rehearsals, setRehearsals] = useState<EventDetails[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');

  const rsvpTitle = event?.title ? `RSVP for ${event.title}` : 'RSVP';
  useDocumentTitle(rsvpTitle);

  useEffect(() => {
    if (!token || !initialRsvp) {
      setStatus('error');
      setErrorMessage('Invalid RSVP link. Missing secure verification token or RSVP response.');
      return;
    }

    // Decode event and profile IDs from token (format: e=eventId&p=profileId&s=signature)
    const tokenParams = new URLSearchParams(token);
    const eventId = tokenParams.get('e');
    const profileId = tokenParams.get('p');

    if (!eventId || !profileId) {
      setStatus('error');
      setErrorMessage('Invalid RSVP token format. Please check the link from your email/SMS.');
      return;
    }

    const loadAndProcess = async () => {
      try {
        // 1. Submit initial RSVP to verify signature and set database record
        await pb.send('/api/quick-rsvp', {
          method: 'POST',
          body: { token, rsvp: initialRsvp }
        });

        // 2. Fetch Event, Profile, and Timezone Details for rich display
        const [eventData, profileData, tz] = await Promise.all([
          pb.collection('events').getOne<EventDetails>(eventId, { expand: 'venue' }),
          pb.collection('profiles').getOne<ProfileDetails>(profileId),
          fetchChoirTimezone()
        ]);

        setEvent(eventData);
        setProfile(profileData);
        setTimezone(tz);
        setCurrentRsvp(initialRsvp);

        // 3. If Performance, fetch linked Rehearsals
        if (eventData.type === 'Performance') {
          const rehearsalList = await pb.collection('events').getFullList<EventDetails>({
            filter: pb.filter('parentPerformanceId = {:eventId}', { eventId }),
            sort: 'date',
            expand: 'venue'
          });
          setRehearsals(rehearsalList);
        }

        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        const errObj = err as { data?: { error?: string } } | null;
        setErrorMessage(
          errObj?.data?.error || 
          'Failed to record your RSVP securely. The event might be closed or the secure link has expired.'
        );
      }
    };

    loadAndProcess();
  }, [token, initialRsvp]);

  const handleChangeRsvp = async (newRsvp: 'Yes' | 'No') => {
    if (newRsvp === currentRsvp || !token || isUpdating) return;

    setIsUpdating(true);
    try {
      await pb.send('/api/quick-rsvp', {
        method: 'POST',
        body: { token, rsvp: newRsvp }
      });
      setCurrentRsvp(newRsvp);
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: string } } | null;
      alert(errObj?.data?.error || 'Failed to update RSVP. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadCalendar = () => {
    if (event) {
      calendarUtils.generateICS(event);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', backgroundColor: 'var(--primary-light)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <h2 style={{ color: 'var(--primary-deep)', fontWeight: 800, margin: 0 }}>Verifying Secure RSVP...</h2>
          <p className="text-muted" style={{ margin: 0 }}>Please wait while we record your attendance status.</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'error' || !event || !profile) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', backgroundColor: '#fef2f2', padding: 'var(--space-md)' }}>
        <AppCard style={{ width: '100%', maxWidth: '440px', padding: 'var(--space-xl)', textAlign: 'center', border: '1px solid #fee2e2' }}>
          <div className="flex-col" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
            <div style={{ fontSize: '3.5rem' }}>⚠️</div>
            <h2 style={{ margin: 0, color: '#991b1b', fontWeight: 800 }}>RSVP Request Failed</h2>
            <p className="text-body" style={{ color: 'var(--neutral-text)', lineHeight: 1.6, margin: 'var(--space-xs) 0 0 0' }}>
              {errorMessage}
            </p>
            <div style={{ marginTop: 'var(--space-md)', width: '100%' }}>
              <a 
                href="/login" 
                className="btn btn-primary" 
                style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', height: '44px', fontWeight: 700 }}
              >
                Sign In to Member Portal
              </a>
            </div>
          </div>
        </AppCard>
      </div>
    );
  }

  const isAttending = currentRsvp === 'Yes';

  return (
    <div className="flex-col" style={{ minHeight: '100vh', width: '100vw', backgroundColor: 'var(--primary-light)', padding: 'var(--space-lg) var(--space-md)' }}>
      <div style={{ margin: 'auto', width: '100%', maxWidth: '540px' }}>
        <AppCard style={{ width: '100%', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', border: '1px solid rgba(74, 117, 89, 0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          
          {/* Header Status Visual */}
          <div className="flex-col" style={{ alignItems: 'center', textAlign: 'center', gap: 'var(--space-xs)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
            <div 
              style={{ 
                fontSize: '3.5rem', 
                backgroundColor: isAttending ? '#e6f4ea' : '#fce8e6', 
                color: isAttending ? 'var(--primary)' : '#c5221f',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-xs)',
                transition: 'all 0.3s ease'
              }}
            >
              {isAttending ? '✓' : '✗'}
            </div>
            <h1 className="text-display" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--primary-deep)' }}>
              {isAttending ? 'Confirmed: Attending' : 'Confirmed: Not Attending'}
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Thank you, <strong style={{ color: 'var(--neutral-text)' }}>{profile.name}</strong> ({profile.voicePart}). Your response has been securely recorded.
            </p>
          </div>

          {/* Event Details Card */}
          <div className="flex-col" style={{ gap: 'var(--space-sm)', backgroundColor: 'var(--neutral-bg)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 'var(--radius-lg)' }}>
            <span className={`badge ${event.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`} style={{ alignSelf: 'flex-start', fontSize: '10px', padding: '3px 8px' }}>
              {event.type}
            </span>
            <h2 className="text-headline" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              {event.title || `${event.type} at ${event.expand?.venue?.name || 'Venue'}`}
            </h2>
            
            <div className="flex-col" style={{ gap: '6px', fontSize: '0.9rem', color: 'var(--neutral-text)', marginTop: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>📅</span>
                <strong>{formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>⏰</span>
                <span>{formatInTimezone(event.date, timezone, { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span>📍</span>
                <span>
                  <strong>{event.expand?.venue?.name || event.location}</strong>
                  {event.expand?.venue?.address && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-muted)', marginTop: '2px' }}>{event.expand?.venue?.address}</span>}
                </span>
              </div>
            </div>

            {event.details && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px', fontSize: '0.85rem', color: 'var(--neutral-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {event.details}
              </div>
            )}
          </div>

          {/* Connected Rehearsals List */}
          {isAttending && rehearsals.length > 0 && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <h3 className="text-label" style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-deep)', fontSize: '0.75rem', letterSpacing: '0.05em', margin: 0 }}>
                📅 Expected Rehearsal Schedule
              </h3>
              <div className="flex-col" style={{ gap: '8px', marginTop: '4px' }}>
                {rehearsals.map((reh) => {
                  return (
                    <div key={reh.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <div className="flex-col" style={{ gap: '2px' }}>
                        <span style={{ fontWeight: 700 }}>
                          {formatInTimezone(reh.date, timezone, { month: 'short', day: 'numeric', weekday: 'short' })}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          📍 {reh.expand?.venue?.name || 'Rehearsal Venue'}
                        </span>
                      </div>
                      <span className="text-muted" style={{ fontWeight: 500 }}>
                        {formatInTimezone(reh.date, timezone, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Response Modifier & Actions */}
          <div className="flex-col" style={{ gap: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
            
            <div className="flex-col" style={{ gap: '6px' }}>
              <label className="text-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--neutral-text)' }}>
                Need to change your response?
              </label>
              
              <div 
                style={{ 
                  display: 'flex', 
                  backgroundColor: '#f1f5f9', 
                  padding: '4px', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border)', 
                  width: '100%',
                  height: '48px'
                }}
              >
                <button
                  onClick={() => handleChangeRsvp('Yes')}
                  disabled={isUpdating}
                  className="btn"
                  style={{
                    flex: 1,
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    backgroundColor: isAttending ? 'var(--primary)' : 'transparent',
                    color: isAttending ? '#ffffff' : 'var(--neutral-muted)',
                    boxShadow: isAttending ? '0 2px 8px rgba(74, 117, 89, 0.2)' : 'none'
                  }}
                >
                  {isUpdating && isAttending ? 'Updating...' : 'I Will Attend'}
                </button>
                <button
                  onClick={() => handleChangeRsvp('No')}
                  disabled={isUpdating}
                  className="btn"
                  style={{
                    flex: 1,
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    backgroundColor: !isAttending ? '#ef4444' : 'transparent',
                    color: !isAttending ? '#ffffff' : 'var(--neutral-muted)',
                    boxShadow: !isAttending ? '0 2px 8px rgba(239, 68, 68, 0.2)' : 'none'
                  }}
                >
                  {isUpdating && !isAttending ? 'Updating...' : 'I Cannot Attend'}
                </button>
              </div>
            </div>

            {/* Helper Action Buttons */}
            <div className="flex-responsive" style={{ gap: 'var(--space-sm)', width: '100%' }}>
              {isAttending && (
                <button 
                  onClick={handleDownloadCalendar}
                  className="btn btn-secondary" 
                  style={{ flex: 1, height: '44px', fontWeight: 700, justifyContent: 'center', gap: '6px' }}
                >
                  📅 Add to Calendar (.ics)
                </button>
              )}
              <a 
                href="/login" 
                className="btn btn-ghost" 
                style={{ 
                  flex: 1, 
                  height: '44px', 
                  fontWeight: 700, 
                  justifyContent: 'center', 
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--border)'
                }}
              >
                Sign In to Portal
              </a>
            </div>

          </div>

        </AppCard>
      </div>
    </div>
  );
}

