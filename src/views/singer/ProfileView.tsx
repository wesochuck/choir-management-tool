import { useState, useEffect, useCallback } from 'react';
import { pb, formatPocketBaseError } from '../../lib/pocketbase';
import { profileService, type Profile, type CalendarFeedUrls } from '../../services/profileService';
import { PhotoUploader } from '../../components/common/PhotoUploader';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { Button } from '../../components/ui';
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

  if (isLoading) return <div className="container pt-8 text-center">Loading profile...</div>;
  if (!profile) return <div className="container p-5 text-red-600">{error || 'Profile not found'}</div>;

  return (
    <PageLayout title="My Profile" backTo="/" maxWidth="500px">
      <div className="flex-col items-center gap-8 py-8">

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
            <div className="flex size-24 items-center justify-center rounded-full border-2 border-border bg-primary-light text-5xl text-primary">
              👤
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="w-full flex-col gap-4">
          <div className="flex-col gap-1">
            <label className="text-label">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 w-full px-3"
            />
          </div>

          <div className="flex-col gap-1">
            <label className="text-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 w-full px-3"
            />
          </div>

          {user?.role === 'admin' && (
            <>
              <label className="my-1 cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveAttendanceReports}
                  onChange={(e) => setReceiveAttendanceReports(e.target.checked)}
                  className="size-[18px] shrink-0 cursor-pointer accent-primary"
                />
                <div className="flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive attendance reports</span>
                  <span className="text-muted text-xs">Receive automated after-event reports for all events.</span>
                </div>
              </label>

              <label className="my-1 cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveRsvpDeclineNotices}
                  onChange={(e) => setReceiveRsvpDeclineNotices(e.target.checked)}
                  className="size-[18px] shrink-0 cursor-pointer accent-primary"
                />
                <div className="flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive RSVP decline notifications</span>
                  <span className="text-muted text-xs">Receive automated email alerts when a singer declines a rehearsal or performance.</span>
                </div>
              </label>

              <label className="my-1 cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveAdminNotifications}
                  onChange={(e) => setReceiveAdminNotifications(e.target.checked)}
                  className="size-[18px] shrink-0 cursor-pointer accent-primary"
                />
                <div className="flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive general admin notifications</span>
                  <span className="text-muted text-xs">Receive automated general admin alerts and system notifications.</span>
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
                  className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 w-full px-3"
                />
              </div>

              {/* Voice Part — read-only */}
              <div className="flex-col gap-1">
                <label className="text-label">Voice Part</label>
                <div className="rounded-xl flex h-11 w-full items-center border border-border bg-bg px-3 text-text-muted">
                  {profile.voicePart}
                </div>
                <span className="text-muted text-xs">Contact your director to change voice part</span>
              </div>
            </>
          ) : (
            <div className="flex-col gap-1">
              <label className="text-label">Role</label>
              <div className="rounded-xl flex h-11 w-full items-center border border-border bg-bg px-3 text-text-muted">
                Administrator
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-danger-bg p-2 px-4 text-sm text-danger-text">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-success-bg p-2 px-4 text-sm text-success-text">
              Profile updated!
            </div>
          )}

          <Button type="submit" disabled={isSaving} className="w-full" variant="primary">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>

        {profile.id && (
          <AppCard title="📅 Calendar Sync" className="w-full">
            <p className="text-muted m-0 mb-4 text-xs">
              Subscribe to your personalized choir calendar to sync performances, rehearsals, call times, and set lists directly to your personal Google, Apple, or Outlook calendar.
            </p>

            <div className="flex-col gap-4">
              {isCalendarLoading ? (
                <div className="text-muted py-2 text-xs">Loading feed links...</div>
              ) : calendarFeedUrls ? (
                <div className="flex-col gap-4">
                  {/* Action 1: Subscribe in Calendar App (webcalUrl) */}
                  <div className="flex-col gap-1">
                    <label className="text-label">Subscribe Directly</label>
                    <Button
                      as="a"
                      href={calendarFeedUrls.webcalUrl}
                      variant="primary"
                      className="flex h-10 w-full items-center justify-center text-center no-underline"
                    >
                      Subscribe in Calendar App
                    </Button>
                  </div>

                  {/* Action 2: Copy Google Calendar URL (httpsUrl) */}
                  <div className="flex-col gap-1">
                    <label className="text-label">Google Calendar Setup</label>
                    <div className="w-full flex-row items-center gap-1">
                      <input
                        readOnly
                        value={calendarFeedUrls.httpsUrl}
                        className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-10 flex-1 px-3 text-sm"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        type="button"
                        onClick={handleCopyGoogleLink}
                        variant="primary"
                        className={`flex h-10 min-w-[180px] items-center justify-center px-4 ${isCopied ? '!bg-success-bg !text-success-text !border-transparent' : ''}`}
                      >
                        {isCopied ? 'Copied! ✓' : 'Copy Google Calendar URL'}
                      </Button>
                    </div>
                    <span className="text-muted text-xs">
                      For Google Calendar, copy the HTTPS URL and add it with Other calendars → From URL.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-muted text-xs">Failed to load calendar link.</div>
              )}

              <div className="mt-1 flex-row justify-start">
                <Button
                  type="button"
                  onClick={handleResetLink}
                  className="cursor-pointer border border-danger-text !text-danger-text bg-transparent text-sm"
                  variant="outline"
                  disabled={isCalendarLoading}
                >
                  Reset Calendar Link...
                </Button>
              </div>
              <p className="text-muted m-0 text-xs italic">
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
            <p className="text-muted m-0 text-xs">
              These settings customize how directories and rosters are ordered for your account across all your devices.
            </p>

            <div className="flex-col gap-4">
              <div className="flex-col gap-1">
                <label className="text-label">Directory Sort</label>
                <select
                  value={user?.preferences?.rosterSort || 'lastName'}
                  onChange={(e) => handlePreferenceChange('rosterSort', e.target.value as 'lastName' | 'voicePart')}
                  className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 w-full px-3"
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
                  className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 w-full px-3"
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
                  className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 w-full px-3"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                </select>
              </div>

              {prefSuccess && (
                <div className="rounded-md bg-success-bg p-2 px-4 text-center text-sm text-success-text">
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
