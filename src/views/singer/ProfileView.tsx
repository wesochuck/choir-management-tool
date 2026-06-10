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

  const handlePreferenceChange = async (key: 'rosterSort' | 'attendanceSort' | 'rsvpSort', value: 'lastName' | 'voicePart' | 'section') => {
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
  const [receiveAdminNotifications, setReceiveAdminNotifications] = useState(true);

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
          setReceiveAdminNotifications(p.receiveAdminNotifications !== false);
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
          setReceiveAdminNotifications(true);
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
          await pb.collection('profiles').update(profile.id, { name, receiveAttendanceReports, receiveRsvpDeclineNotices, receiveAdminNotifications });
        } else {
          await pb.collection('profiles').create({
            user: currentUser.id,
            name: name || currentUser.name || email,
            receiveAttendanceReports,
            receiveRsvpDeclineNotices,
            receiveAdminNotifications,
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

  if (isLoading) return <div className="container text-center pt-8">Loading profile...</div>;
  if (!profile) return <div className="container p-5 text-red-600">{error || 'Profile not found'}</div>;

  return (
    <PageLayout title="My Profile" backTo="/" maxWidth="500px">
      <div className="flex-col gap-8 py-8 items-center">

        {/* Photo / Avatar */}
        <div className="flex flex-col items-center gap-2">
          {profile.id ? (
            <PhotoUploader
              profileId={profile.id}
              profileName={profile.name}
              currentPhotoUrl={profile.photo ? pb.files.getURL(profile, profile.photo) : undefined}
              size="lg"
              onSuccess={handlePhotoSuccess}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary-light text-primary flex items-center justify-center text-5xl border-2 border-border">
              👤
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-col gap-4 w-full">
          <div className="flex-col gap-1">
            <label className="text-label">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="card w-full px-3 h-11 border border-border"
            />
          </div>

          <div className="flex-col gap-1">
            <label className="text-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="card w-full px-3 h-11 border border-border"
            />
          </div>

          {user?.role === 'admin' && (
            <>
              <label className="flex-row items-center gap-2 cursor-pointer my-1">
                <input
                  type="checkbox"
                  checked={receiveAttendanceReports}
                  onChange={(e) => setReceiveAttendanceReports(e.target.checked)}
                  className="accent-primary w-[18px] h-[18px] cursor-pointer shrink-0"
                />
                <div className="flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive attendance reports</span>
                  <span className="text-xs text-muted">Receive automated after-event reports for all events.</span>
                </div>
              </label>

              <label className="flex-row items-center gap-2 cursor-pointer my-1">
                <input
                  type="checkbox"
                  checked={receiveRsvpDeclineNotices}
                  onChange={(e) => setReceiveRsvpDeclineNotices(e.target.checked)}
                  className="accent-primary w-[18px] h-[18px] cursor-pointer shrink-0"
                />
                <div className="flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive RSVP decline notifications</span>
                  <span className="text-xs text-muted">Receive automated email alerts when a singer declines a rehearsal or performance.</span>
                </div>
              </label>

              <label className="flex-row items-center gap-2 cursor-pointer my-1">
                <input
                  type="checkbox"
                  checked={receiveAdminNotifications}
                  onChange={(e) => setReceiveAdminNotifications(e.target.checked)}
                  className="accent-primary w-[18px] h-[18px] cursor-pointer shrink-0"
                />
                <div className="flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive general admin notifications</span>
                  <span className="text-xs text-muted">Receive automated general admin alerts and system notifications.</span>
                </div>
              </label>
            </>
          )}

          {profile.id ? (
            <>
              <div className="flex-col gap-1">
                <label className="text-label">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="card w-full px-3 h-11 border border-border"
                />
              </div>

              {/* Voice Part — read-only */}
              <div className="flex-col gap-1">
                <label className="text-label">Voice Part</label>
                <div className="card w-full px-3 h-11 border border-border flex items-center text-text-muted bg-bg">
                  {profile.voicePart}
                </div>
                <span className="text-xs text-muted">Contact your director to change voice part</span>
              </div>
            </>
          ) : (
            <div className="flex-col gap-1">
              <label className="text-label">Role</label>
              <div className="card w-full px-3 h-11 border border-border flex items-center text-text-muted bg-bg">
                Administrator
              </div>
            </div>
          )}

          {error && (
            <div className="text-danger-text bg-danger-bg p-2 px-4 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="text-success-text bg-success-bg p-2 px-4 rounded-md text-sm">
              Profile updated!
            </div>
          )}

          <button type="submit" disabled={isSaving} className="btn btn-primary w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {profile.id && (
          <AppCard title="📅 Calendar Sync" className="w-full">
            <p className="text-xs text-muted m-0 mb-4">
              Subscribe to your personalized choir calendar to sync performances, rehearsals, call times, and set lists directly to your personal Google, Apple, or Outlook calendar.
            </p>

            <div className="flex-col gap-4">
              {isCalendarLoading ? (
                <div className="text-xs text-muted py-2">Loading feed links...</div>
              ) : calendarFeedUrls ? (
                <div className="flex-col gap-4">
                  {/* Action 1: Subscribe in Calendar App (webcalUrl) */}
                  <div className="flex-col gap-1">
                    <label className="text-label">Subscribe Directly</label>
                    <a
                      href={calendarFeedUrls.webcalUrl}
                      className="btn btn-primary h-10 flex items-center justify-center no-underline text-center w-full"
                    >
                      Subscribe in Calendar App
                    </a>
                  </div>

                  {/* Action 2: Copy Google Calendar URL (httpsUrl) */}
                  <div className="flex-col gap-1">
                    <label className="text-label">Google Calendar Setup</label>
                    <div className="flex-row gap-1 items-center w-full">
                      <input
                        readOnly
                        value={calendarFeedUrls.httpsUrl}
                        className="card flex-1 px-3 h-10 border border-border text-sm truncate"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={handleCopyGoogleLink}
                        className={`btn h-10 px-4 min-w-[180px] flex items-center justify-center ${isCopied ? 'btn-success' : 'btn-primary'}`}
                      >
                        {isCopied ? 'Copied! ✓' : 'Copy Google Calendar URL'}
                      </button>
                    </div>
                    <span className="text-xs text-muted">
                      For Google Calendar, copy the HTTPS URL and add it with Other calendars → From URL.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted">Failed to load calendar link.</div>
              )}

              <div className="flex-row justify-start mt-1">
                <button
                  type="button"
                  onClick={handleResetLink}
                  className="btn btn-ghost text-danger-text border border-danger-text text-sm px-1 px-4 rounded-md bg-transparent cursor-pointer"
                  disabled={isCalendarLoading}
                >
                  Reset Calendar Link...
                </button>
              </div>
              <p className="text-xs text-muted m-0 italic">
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
          <AppCard title="View Preferences" className="w-full">
            <p className="text-xs text-muted m-0">
              These settings customize how directories and rosters are ordered for your account across all your devices.
            </p>

            <div className="flex-col gap-4">
              <div className="flex-col gap-1">
                <label className="text-label">Directory Sort</label>
                <select
                  value={user?.preferences?.rosterSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('rosterSort', e.target.value as 'lastName' | 'voicePart')}
                  className="card w-full px-3 h-11 border border-border"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part</option>
                </select>
              </div>

              <div className="flex-col gap-1">
                <label className="text-label">Attendance Sort</label>
                <select
                  value={user?.preferences?.attendanceSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('attendanceSort', e.target.value as 'lastName' | 'voicePart' | 'section')}
                  className="card w-full px-3 h-11 border border-border"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                  <option value="section">Section + Last Name</option>
                </select>
              </div>

              <div className="flex-col gap-1">
                <label className="text-label">Event RSVP Sort</label>
                <select
                  value={user?.preferences?.rsvpSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('rsvpSort', e.target.value as 'lastName' | 'voicePart')}
                  className="card w-full px-3 h-11 border border-border"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                </select>
              </div>

              {prefSuccess && (
                <div className="text-success-text bg-success-bg p-2 px-4 rounded-md text-sm text-center">
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
