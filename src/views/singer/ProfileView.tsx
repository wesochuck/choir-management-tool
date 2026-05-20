import { useState, useEffect } from 'react';
import { pb, formatPocketBaseError } from '../../lib/pocketbase';
import { profileService, type Profile } from '../../services/profileService';
import { PhotoUploader } from '../../components/common/PhotoUploader';
import { PageLayout } from '../../components/common/PageLayout';

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const p = await profileService.getMyProfile();
      setProfile(p);
      setName(p.name || '');
      setPhone(p.phone || '');
      // Get email from auth store
      setEmail(pb.authStore.record?.email || '');
    } catch (err) {
      setError('Could not load your profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // Update profile fields
      await pb.collection('profiles').update(profile.id, { name, phone });
      // Update user email if changed
      const currentEmail = pb.authStore.record?.email;
      if (email && email !== currentEmail && pb.authStore.record?.id) {
        await pb.collection('users').update(pb.authStore.record.id, { email });
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

        {/* Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <PhotoUploader
            profileId={profile.id}
            profileName={profile.name}
            currentPhotoUrl={profile.photo ? pb.files.getUrl(profile, profile.photo) : undefined}
            size="lg"
            onSuccess={handlePhotoSuccess}
          />
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
      </div>
    </PageLayout>
  );
}
