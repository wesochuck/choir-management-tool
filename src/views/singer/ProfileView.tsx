import { useState, useEffect, useCallback } from 'react';
import { pb, formatPocketBaseError } from '../../lib/pocketbase';
import { profileService, type Profile, type CalendarFeedUrls } from '../../services/profileService';
import { PhotoUploader } from '../../components/common/PhotoUploader';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';

export default function ProfileView() {
  const { user, updatePreferences } = useAuth();
  const dialog = useDialog();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Calendar sync states
  const [calendarFeedUrls, setCalendarFeedUrls] = useState<CalendarFeedUrls | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const loadCalendarFeed = useCallback(async (profileId: string) => {
    if (!profileId) return;
    setIsCalendarLoading(true);
    try {
      const urls = await profileService.getCalendarFeedUrls();
      setCalendarFeedUrls(urls);
    } catch {
      // ignore silently
    } finally {
      setIsCalendarLoading(false);
    }
  }, []);

  const handleCopyGoogleLink = async () => {
    if (!calendarFeedUrls) return;
    try {
      await navigator.clipboard.writeText(calendarFeedUrls.httpsUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleResetLink = async () => {
    const confirmReset = await dialog.confirm({
      title: 'Reset Calendar Link',
      message: 'Are you sure you want to reset your calendar subscription link? This will instantly invalidate your existing feed link on all your devices, and you will need to resubscribe using the new link.',
      confirmLabel: 'Reset Link',
      variant: 'danger',
    });
    if (!confirmReset) return;

    setIsCalendarLoading(true);
    try {
      const urls = await profileService.resetCalendarFeedUrls();
      setCalendarFeedUrls(urls);
      await dialog.showMessage({
        title: 'Link Reset',
        message: 'Your calendar subscription link has been successfully reset. Please update the link in your calendar applications.',
        variant: 'info',
      });
    } catch {
      await dialog.showMessage({
        title: 'Reset Failed',
        message: 'Failed to reset calendar link. Please try again.',
        variant: 'danger',
      });
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const handlePreferenceChange = async (key: 'rosterSort' | 'attendanceSort' | 'rsvpSort', value: 'lastName' | 'voicePart') => {
    try {
      setError(null);
      await updatePreferences({ [key]: value });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch {
      setError('Failed to save preferences.');
    }
  };

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [receiveAttendanceReports, setReceiveAttendanceReports] = useState(true);
  const [receiveRsvpDeclineNotices, setReceiveRsvpDeclineNotices] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = pb.authStore.record;
      if (currentUser?.role === 'admin') {
        let p: Profile | null = null;
        try {
          p = await profileService.getMyProfile();
        } catch {
          // Admins don't always have a row in profiles
        }

        if (p) {
          setProfile(p);
          setName(p.name || currentUser.name || '');
          setPhone(p.phone || '');
          setReceiveAttendanceReports(p.receiveAttendanceReports !== false);
          setReceiveRsvpDeclineNotices(Boolean(p.receiveRsvpDeclineNotices));
          loadCalendarFeed(p.id);
        } else {
          setProfile({
            id: '',
            user: currentUser.id,
            name: currentUser.name || '',
            phone: '',
            photo: '',
            voicePart: 'Administrator',
            globalStatus: 'Active',
            notes: '',
            collectionId: '',
            collectionName: 'profiles',
            created: '',
            updated: ''
          });
          setName(currentUser.name || '');
          setPhone('');
          setReceiveRsvpDeclineNotices(false);
        }
        setEmail(currentUser.email || '');
      } else {
        const p = await profileService.getMyProfile();
        setProfile(p);
        setName(p.name || '');
        setPhone(p.phone || '');
        setEmail(pb.authStore.record?.email || '');
        loadCalendarFeed(p.id);
      }
    } catch {
      setError('Could not load your profile.');
    } finally {
      setIsLoading(false);
    }
  }, [loadCalendarFeed]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const currentUser = pb.authStore.record;
      if (currentUser?.role === 'admin') {
        // Update user record directly
        await pb.collection('users').update(currentUser.id, { name, email });
        
        // If there's an associated profile, update it; otherwise create one.
        if (profile.id) {
          await pb.collection('profiles').update(profile.id, { name, receiveAttendanceReports, receiveRsvpDeclineNotices });
        } else {
          await pb.collection('profiles').create({
            user: currentUser.id,
            name: name || currentUser.name || email,
            receiveAttendanceReports,
            receiveRsvpDeclineNotices,
            voicePart: '',
            globalStatus: 'Active',
          });
        }
      } else {
        // Update profile fields
        await pb.collection('profiles').update(profile.id, { name, phone });
        // Update user email if changed
        const currentEmail = pb.authStore.record?.email;
        if (email && email !== currentEmail && pb.authStore.record?.id) {
          await pb.collection('users').update(pb.authStore.record.id, { email });
        }
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadProfile();
    } catch (err) {
      setError(formatPocketBaseError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSuccess = () => {
    loadProfile();
  };

  if (isLoading) return <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading profile...</div>;
  if (!profile) return <div className="container" style={{ padding: '20px', color: 'red' }}>{error || 'Profile not found'}</div>;

  return (
    <PageLayout title="My Profile" backTo="/" maxWidth="500px">
      <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0', alignItems: 'center' }}>

        {/* Photo / Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {profile.id ? (
            <PhotoUploader
              profileId={profile.id}
              profileName={profile.name}
              currentPhotoUrl={profile.photo ? pb.files.getURL(profile, profile.photo) : undefined}
              size="lg"
              onSuccess={handlePhotoSuccess}
            />
          ) : (
            <div style={{ 
              width: '96px', 
              height: '96px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '3rem',
              border: '2px solid var(--border)'
            }}>
              👤
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-col" style={{ gap: 'var(--space-md)', width: '100%' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>

          {user?.role === 'admin' && (
            <>
              <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', margin: 'var(--space-xs) 0' }}>
                <input
                  type="checkbox"
                  checked={receiveAttendanceReports}
                  onChange={(e) => setReceiveAttendanceReports(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div className="flex-col" style={{ gap: '2px' }}>
                  <span className="text-label" style={{ fontWeight: 600 }}>Receive attendance reports</span>
                  <span className="text-xs text-muted">Receive automated after-event reports for all events.</span>
                </div>
              </label>

              <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', margin: 'var(--space-xs) 0' }}>
                <input
                  type="checkbox"
                  checked={receiveRsvpDeclineNotices}
                  onChange={(e) => setReceiveRsvpDeclineNotices(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div className="flex-col" style={{ gap: '2px' }}>
                  <span className="text-label" style={{ fontWeight: 600 }}>Receive RSVP decline notifications</span>
                  <span className="text-xs text-muted">Receive automated email alerts when a singer declines a rehearsal or performance.</span>
                </div>
              </label>
            </>
          )}

          {profile.id ? (
            <>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                />
              </div>

              {/* Voice Part — read-only */}
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Voice Part</label>
                <div
                  className="card"
                  style={{
                    width: '100%', padding: '0 12px', height: '44px',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center',
                    color: 'var(--text-muted)', backgroundColor: 'var(--bg)',
                  }}
                >
                  {profile.voicePart}
                </div>
                <span className="text-xs text-muted">Contact your director to change voice part</span>
              </div>
            </>
          ) : (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Role</label>
              <div
                className="card"
                style={{
                  width: '100%', padding: '0 12px', height: '44px',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center',
                  color: 'var(--text-muted)', backgroundColor: 'var(--bg)',
                }}
              >
                Administrator
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ color: 'var(--color-success-text)', backgroundColor: 'var(--color-success-bg)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
              Profile updated!
            </div>
          )}

          <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ width: '100%' }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {profile.id && (
          <AppCard title="📅 Calendar Sync" style={{ width: '100%' }}>
            <p className="text-xs text-muted" style={{ margin: 0, marginBottom: 'var(--space-md)' }}>
              Subscribe to your personalized choir calendar to sync performances, rehearsals, call times, and set lists directly to your personal Google, Apple, or Outlook calendar.
            </p>

            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              {isCalendarLoading ? (
                <div className="text-xs text-muted" style={{ padding: 'var(--space-sm) 0' }}>Loading feed links...</div>
              ) : calendarFeedUrls ? (
                <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                  {/* Action 1: Subscribe in Calendar App (webcalUrl) */}
                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Subscribe Directly</label>
                    <a
                      href={calendarFeedUrls.webcalUrl}
                      className="btn btn-primary"
                      style={{
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        textAlign: 'center',
                        width: '100%'
                      }}
                    >
                      Subscribe in Calendar App
                    </a>
                  </div>

                  {/* Action 2: Copy Google Calendar URL (httpsUrl) */}
                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Google Calendar Setup</label>
                    <div className="flex-row" style={{ gap: 'var(--space-xs)', alignItems: 'center', width: '100%' }}>
                      <input
                        readOnly
                        value={calendarFeedUrls.httpsUrl}
                        className="card"
                        style={{
                          flex: 1,
                          padding: '0 12px',
                          height: '40px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-muted)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.85rem',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={handleCopyGoogleLink}
                        className={`btn ${isCopied ? 'btn-success' : 'btn-primary'}`}
                        style={{ height: '40px', padding: '0 var(--space-md)', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isCopied ? 'Copied! ✓' : 'Copy Google Calendar URL'}
                      </button>
                    </div>
                    <span className="text-xs text-muted" style={{ fontSize: '0.75rem' }}>
                      For Google Calendar, copy the HTTPS URL and add it with Other calendars → From URL.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted" style={{ color: 'var(--color-danger-text)' }}>Failed to load calendar link.</div>
              )}

              <div className="flex-row" style={{ justifyContent: 'flex-start', marginTop: 'var(--space-xs)' }}>
                <button
                  type="button"
                  onClick={handleResetLink}
                  className="btn btn-ghost"
                  style={{
                    color: 'var(--color-danger-text)',
                    border: '1px solid var(--color-danger-border)',
                    fontSize: '0.85rem',
                    padding: 'var(--space-xs) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
                  disabled={isCalendarLoading}
                >
                  Reset Calendar Link...
                </button>
              </div>
              <p className="text-xs text-muted" style={{ margin: 0, fontSize: '0.75rem', fontStyle: 'italic' }}>
                Note: Resetting will invalidate any previous link you've set up on your devices.
                {user?.role === 'admin' && !profile?.voicePart ? (
                  <> Because you are an administrative-only account, this link provides a <strong>master schedule</strong> of all choir rehearsals and performances.</>
                ) : (
                  <> Only active rehearsals and concerts you haven't declined will sync.</>
                )}
              </p>
            </div>
          </AppCard>
        )}

        {user?.role === 'admin' && (
          <AppCard title="View Preferences" style={{ width: '100%' }}>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              These settings customize how directories and rosters are ordered for your account across all your devices.
            </p>

            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Directory Sort</label>
                <select
                  value={user?.preferences?.rosterSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('rosterSort', e.target.value as 'lastName' | 'voicePart')}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part</option>
                </select>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Attendance Sort</label>
                <select
                  value={user?.preferences?.attendanceSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('attendanceSort', e.target.value as 'lastName' | 'voicePart')}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                </select>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Event RSVP Sort</label>
                <select
                  value={user?.preferences?.rsvpSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('rsvpSort', e.target.value as 'lastName' | 'voicePart')}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                </select>
              </div>

              {prefSuccess && (
                <div style={{ color: 'var(--color-success-text)', backgroundColor: 'var(--color-success-bg)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                  Preferences updated!
                </div>
              )}
            </div>
          </AppCard>
        )}
      </div>
    </PageLayout>
  );
}
