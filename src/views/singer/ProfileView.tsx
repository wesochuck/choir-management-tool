import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { pb, formatPocketBaseError } from '../../lib/pocketbase';
import { profileService, type Profile, type CalendarFeedUrls } from '../../services/profileService';
import { PhotoUploader } from '../../components/common/PhotoUploader';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { Button, Select, Input, CopyButton } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';

export default function ProfileView() {
  const queryClient = useQueryClient();
  const { user, updatePreferences } = useAuth();
  const dialog = useDialog();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Calendar sync states
  const [calendarFeedUrls, setCalendarFeedUrls] = useState<CalendarFeedUrls | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [receiveAttendanceReports, setReceiveAttendanceReports] = useState(true);
  const [receiveRsvpDeclineNotices, setReceiveRsvpDeclineNotices] = useState(false);
  const [receiveAdminNotifications, setReceiveAdminNotifications] = useState(true);
  const [receiveFinancialAlerts, setReceiveFinancialAlerts] = useState(false);
  const [showInDirectory, setShowInDirectory] = useState(true);

  const profileQuery = useQuery({
    queryKey: queryKeys.myProfile.all,
    queryFn: async () => {
      const currentUser = user;
      if (currentUser?.role === 'admin') {
        let p: Profile | null = null;
        try {
          p = await profileService.getMyProfile(currentUser?.id ?? '');
        } catch {
          // Admins don't always have a row in profiles
        }
        if (p) return p;
        return {
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
          updated: '',
        } as Profile;
      }
      return await profileService.getMyProfile(user?.id ?? '');
    },
  });

  const profile = profileQuery.data ?? null;
  const isLoading = profileQuery.isLoading;

  // Sync form state when profile data loads
  useEffect(() => {
    if (!profileQuery.data) return;
    const p = profileQuery.data;
    const currentUser = user;
    if (currentUser?.role === 'admin') {
      setName(p.name || currentUser.name || '');
      setPhone(p.phone || '');
      setReceiveAttendanceReports(p.receiveAttendanceReports !== false);
      setReceiveRsvpDeclineNotices(Boolean(p.receiveRsvpDeclineNotices));
      setReceiveAdminNotifications(p.receiveAdminNotifications !== false);
      setReceiveFinancialAlerts(Boolean(p.receiveFinancialAlerts));
      setEmail(currentUser.email || '');
      setShowInDirectory(p.showInDirectory !== false);
    } else {
      setName(p.name || '');
      setPhone(p.phone || '');
      setEmail(user?.email || '');
      setShowInDirectory(p.showInDirectory !== false);
    }
  }, [profileQuery.data, user]);

  const calendarQuery = useQuery({
    queryKey: queryKeys.myProfile.calendarFeed(),
    queryFn: () => profileService.getCalendarFeedUrls(),
    enabled: !!profileQuery.data?.id,
  });

  useEffect(() => {
    if (calendarQuery.data) {
      setCalendarFeedUrls(calendarQuery.data);
    }
  }, [calendarQuery.data]);

  const handleResetLink = async () => {
    const confirmReset = await dialog.confirm({
      title: 'Reset Calendar Link',
      message:
        'Are you sure you want to reset your calendar subscription link? This will instantly invalidate your existing feed link on all your devices, and you will need to resubscribe using the new link.',
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
        message:
          'Your calendar subscription link has been successfully reset. Please update the link in your calendar applications.',
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

  const handlePreferenceChange = async (
    key: 'rosterSort' | 'attendanceSort' | 'rsvpSort',
    value: 'lastName' | 'voicePart' | 'section'
  ) => {
    try {
      setError(null);
      await updatePreferences({ [key]: value });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch {
      setError('Failed to save preferences.');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const currentUser = user;
      if (currentUser?.role === 'admin') {
        await profileService.ensureProfileForAdmin(currentUser.id, profileId || null, {
          name,
          email,
          receiveAttendanceReports,
          receiveRsvpDeclineNotices,
          receiveAdminNotifications,
          receiveFinancialAlerts,
          showInDirectory,
        });
      } else {
        await profileService.updateProfile(profileId, { name, phone, email, showInDirectory });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.directory() });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      setError(formatPocketBaseError(err));
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveMutation.mutateAsync(profile.id);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSuccess = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.myProfile.all });
  };

  if (isLoading) return <div className="container pt-8 text-center">Loading profile...</div>;
  if (!profile)
    return <div className="container p-5 text-red-600">{error || 'Profile not found'}</div>;

  return (
    <PageLayout title="My Profile" backTo="/dashboard" maxWidth="500px">
      <div className="flex flex-col items-center gap-8 py-8">
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
            <div className="border-border bg-primary-light text-primary flex size-24 items-center justify-center rounded-full border-2 text-5xl">
              👤
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-label">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {user?.role === 'admin' && (
            <>
              <label className="my-1 flex cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveAttendanceReports}
                  onChange={(e) => setReceiveAttendanceReports(e.target.checked)}
                  className="accent-primary size-[18px] shrink-0 cursor-pointer"
                />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-label font-semibold">Receive attendance reports</span>
                  <span className="text-muted text-xs">
                    Receive automated after-event reports for all events.
                  </span>
                </div>
              </label>

              <label className="my-1 flex cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveRsvpDeclineNotices}
                  onChange={(e) => setReceiveRsvpDeclineNotices(e.target.checked)}
                  className="accent-primary size-[18px] shrink-0 cursor-pointer"
                />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-label font-semibold">
                    Receive RSVP decline notifications
                  </span>
                  <span className="text-muted text-xs">
                    Receive automated email alerts when a singer declines a rehearsal or
                    performance.
                  </span>
                </div>
              </label>

              <label className="my-1 flex cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveAdminNotifications}
                  onChange={(e) => setReceiveAdminNotifications(e.target.checked)}
                  className="accent-primary size-[18px] shrink-0 cursor-pointer"
                />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-label font-semibold">
                    Receive general admin notifications
                  </span>
                  <span className="text-muted text-xs">
                    Receive automated general admin alerts and system notifications.
                  </span>
                </div>
              </label>

              <label className="my-1 flex cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={receiveFinancialAlerts}
                  onChange={(e) => setReceiveFinancialAlerts(e.target.checked)}
                  className="accent-primary size-[18px] shrink-0 cursor-pointer"
                />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-label font-semibold">
                    Receive financial transaction alerts
                  </span>
                  <span className="text-muted text-xs">
                    Receive automated email alerts for ticket sales, donations, and refunds.
                  </span>
                </div>
              </label>
            </>
          )}

          {profile.id ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-label">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <label className="my-1 flex cursor-pointer flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={showInDirectory}
                  onChange={(e) => setShowInDirectory(e.target.checked)}
                  className="accent-primary size-[18px] shrink-0 cursor-pointer"
                />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-label font-semibold">Show me in the singer directory</span>
                  <span className="text-muted text-xs">
                    Other logged-in singers can see your name, photo, voice part, email, and phone
                    number.
                  </span>
                </div>
              </label>

              {/* Voice Part — read-only */}
              <div className="flex flex-col gap-1">
                <label className="text-label">Voice Part</label>
                <div className="border-border bg-bg text-text-muted flex h-11 w-full items-center rounded-xl border px-3">
                  {profile.voicePart}
                </div>
                <span className="text-muted text-xs">
                  Contact your director to change voice part
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-label">Role</label>
              <div className="border-border bg-bg text-text-muted flex h-11 w-full items-center rounded-xl border px-3">
                Administrator
              </div>
            </div>
          )}

          {error && (
            <div className="bg-danger-bg text-danger-text rounded-md p-2 px-4 text-sm">{error}</div>
          )}

          {success && (
            <div className="bg-success-bg text-success-text rounded-md p-2 px-4 text-sm">
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
              Subscribe to your personalized choir calendar to sync performances, rehearsals, call
              times, and set lists directly to your personal Google, Apple, or Outlook calendar.
            </p>

            <div className="flex flex-col gap-4">
              {isCalendarLoading ? (
                <div className="text-muted py-2 text-xs">Loading feed links...</div>
              ) : calendarFeedUrls ? (
                <div className="flex flex-col gap-4">
                  {/* Action 1: Subscribe in Calendar App (webcalUrl) */}
                  <div className="flex flex-col gap-1">
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
                  <div className="flex flex-col gap-1">
                    <label className="text-label">Google Calendar Setup</label>
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
                      <Input
                        readOnly
                        value={calendarFeedUrls.httpsUrl}
                        className="sm:flex-1"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <span className="inline-flex h-10 w-full min-w-[180px] items-center justify-center gap-1 sm:w-auto">
                        <CopyButton value={calendarFeedUrls.httpsUrl} />
                        <span className="hidden text-sm font-medium md:inline">
                          Copy Google Calendar URL
                        </span>
                      </span>
                    </div>
                    <span className="text-muted text-xs">
                      For Google Calendar, copy the HTTPS URL and add it with Other calendars → From
                      URL.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-muted text-xs">Failed to load calendar link.</div>
              )}

              <div className="mt-1 flex flex-row justify-start">
                <Button
                  type="button"
                  onClick={handleResetLink}
                  className="border-danger-text !text-danger-text cursor-pointer border bg-transparent text-sm"
                  variant="outline"
                  disabled={isCalendarLoading}
                >
                  Reset Calendar Link...
                </Button>
              </div>
              <p className="text-muted m-0 text-xs italic">
                Note: Resetting will invalidate any previous link you've set up on your devices.
                {user?.role === 'admin' && !profile?.voicePart ? (
                  <>
                    {' '}
                    Because you are an administrative-only account, this link provides a{' '}
                    <strong>master schedule</strong> of all choir rehearsals and performances.
                  </>
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
              These settings customize how directories and rosters are ordered for your account
              across all your devices.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label">Directory Sort</label>
                <Select
                  value={user?.preferences?.rosterSort || 'lastName'}
                  onChange={(e) =>
                    handlePreferenceChange('rosterSort', e.target.value as 'lastName' | 'voicePart')
                  }
                  className="w-full"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label">Attendance Sort</label>
                <Select
                  value={user?.preferences?.attendanceSort || 'lastName'}
                  onChange={(e) =>
                    handlePreferenceChange(
                      'attendanceSort',
                      e.target.value as 'lastName' | 'voicePart' | 'section'
                    )
                  }
                  className="w-full"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                  <option value="section">Section + Last Name</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label">Event RSVP Sort</label>
                <Select
                  value={user?.preferences?.rsvpSort || 'lastName'}
                  onChange={(e) =>
                    handlePreferenceChange('rsvpSort', e.target.value as 'lastName' | 'voicePart')
                  }
                  className="w-full"
                >
                  <option value="lastName">Last Name</option>
                  <option value="voicePart">Voice Part + Last Name</option>
                </Select>
              </div>

              {prefSuccess && (
                <div className="bg-success-bg text-success-text rounded-md p-2 px-4 text-center text-sm">
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
