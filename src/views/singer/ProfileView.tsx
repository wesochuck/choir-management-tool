import { useState, useEffect, useCallback } from 'react';
import { pb, formatPocketBaseError } from '../../lib/pocketbase';
import { profileService, type Profile } from '../../services/profileService';
import { PhotoUploader } from '../../components/common/PhotoUploader';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileView() {
  const { user, updatePreferences } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

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
        }
        setEmail(currentUser.email || '');
      } else {
        const p = await profileService.getMyProfile();
        setProfile(p);
        setName(p.name || '');
        setPhone(p.phone || '');
        setEmail(pb.authStore.record?.email || '');
      }
    } catch {
      setError('Could not load your profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        
        // If there's an associated profile, update it too
        if (profile.id) {
          await pb.collection('profiles').update(profile.id, { name });
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
