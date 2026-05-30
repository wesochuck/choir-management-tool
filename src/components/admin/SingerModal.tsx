import React, { useState, useEffect, useMemo } from 'react';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { PhotoUploader } from '../common/PhotoUploader';
import { formatPocketBaseError, pb } from '../../lib/pocketbase';
import { defaultProfileInput, isProfileFormDirty, profileToFormData } from '../../lib/profileForm';
import { SingerRsvpHistoryTab } from './SingerRsvpHistoryTab';

interface SingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileInput) => Promise<void>;
  onDelete?: (profile: Profile) => Promise<void>;
  initialData?: Profile | null;
}

import { useVoiceParts } from '../../hooks/useVoiceParts';

export const SingerModal: React.FC<SingerModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const dialog = useDialog();
  const { voiceParts } = useVoiceParts();
  const [formData, setFormData] = useState<ProfileInput>({ ...defaultProfileInput });
  const [isSubmitting, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password reset state
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const isSelf = initialData?.user && pb.authStore.model && initialData.user === pb.authStore.model.id;

  const handleResetPassword = async () => {
    const email = formData.email?.trim();
    if (!email) return;
    setIsResettingPassword(true);
    setResetFeedback(null);
    try {
      await profileService.requestPasswordReset(email);
      setResetFeedback('✓ Password reset email sent successfully!');
      setTimeout(() => setResetFeedback(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResetFeedback(`Error: ${msg}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Tabs state
  const [activeTab, setActiveTab] = useState<'profile' | 'rsvps'>('profile');

  useEffect(() => {
    setFormData(profileToFormData(initialData));
  }, [initialData, isOpen]);

  // Reset tab when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
    }
  }, [isOpen]);

  const isDirty = useMemo(() => {
    return isProfileFormDirty(formData, initialData);
  }, [formData, initialData]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: initialData 
          ? 'You have unsaved changes to this singer\'s profile. Do you want to discard them?' 
          : 'You are adding a new singer with unsaved details. Do you want to discard this singer?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning'
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Save Singer',
        message: formatPocketBaseError(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    const shouldDelete = await dialog.confirm({
      title: 'Delete Singer',
      message: `Delete ${initialData.name} from the roster and remove their login?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(initialData);
      onClose();
    } catch {
      await dialog.showMessage({
        title: 'Could Not Delete Singer',
        message: 'Error deleting singer',
        variant: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };



  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? 'Edit Singer' : 'Add Singer'}
      maxWidth="640px"
      minHeight={initialData ? '680px' : undefined}
      footer={
        <>
          {activeTab === 'profile' ? (
            <>
              {initialData && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="btn btn-danger"
                  style={{ marginRight: 'auto' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Singer'}
                </button>
              )}
              <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
              <button 
                type="submit" 
                form="singer-form"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button type="button" onClick={handleClose} className="btn btn-primary">Close</button>
          )}
        </>
      }
    >
      {initialData && (
        <div className="flex-row" style={{ borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-md)', gap: 'var(--space-md)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: activeTab === 'profile' ? 600 : 500,
              transition: 'all 0.2s',
            }}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rsvps')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'rsvps' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'rsvps' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: activeTab === 'rsvps' ? 600 : 500,
              transition: 'all 0.2s',
            }}
          >
            Performance RSVPs
          </button>
        </div>
      )}

      {activeTab === 'profile' ? (
        <form id="singer-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {initialData ? (
              <>
                <PhotoUploader
                  profileId={initialData.id}
                  profileName={initialData.name}
                  currentPhotoUrl={initialData.photo ? pb.files.getURL(initialData, initialData.photo) : undefined}
                  size="md"
                  onSuccess={(updated) => {
                    setFormData(prev => ({
                      ...prev,
                      photo: updated.photo
                    }));
                  }}
                />
              </>
            ) : (
              <>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  backgroundColor: 'var(--bg)', border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontSize: '36px',
                }}>
                  ?
                </div>
                <span className="text-xs text-muted">Save first to add a photo</span>
              </>
            )}
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Name</label>
            <input 
              value={formData.name || ''} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'flex-start' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Login Email (Optional)</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="card"
                placeholder="e.g. singer@example.com"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              />
              <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                {initialData?.user 
                  ? "Clearing this removes their login account." 
                  : "Provides portal access via password reset email."}
              </p>
              {initialData?.user && formData.email && (
                <div className="flex-col" style={{ gap: '4px', marginTop: '6px', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                    className="btn btn-xs btn-secondary"
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {isResettingPassword ? 'Sending Link...' : '🔑 Reset Password'}
                  </button>
                  {resetFeedback && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: resetFeedback.startsWith('Error') ? 'var(--color-danger-text, #ef4444)' : 'var(--color-success-text, #22c55e)'
                    }}>
                      {resetFeedback}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Phone (Optional)</label>
              <input 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                className="card"
                placeholder="e.g. 555-123-4567"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              />
            </div>
          </div>
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Voice Part</label>
              <select 
                value={formData.voicePart} 
                onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as Profile['voicePart'] })}
                required
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              >
                <option value="" disabled>-- Please Select --</option>
                {voiceParts.map(v => (
                  <option key={v.label} value={v.label}>
                    {v.label} {v.fullName ? `(${v.fullName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Status</label>
              <select 
                value={formData.globalStatus} 
                onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as Profile['globalStatus'] })}
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              >
                <option value="Active">Active</option>
                <option value="Idle">Idle</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="flex-row" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.doNotEmail}
                onChange={(e) => setFormData({ ...formData, doNotEmail: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span className="text-label">Do Not Email</span>
            </label>
            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.statusIsManual}
                onChange={(e) => setFormData({ ...formData, statusIsManual: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span className="text-label">Lock Status (Disable Automation)</span>
            </label>
            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(formData.isSectionLeader)}
                onChange={(e) => setFormData({ ...formData, isSectionLeader: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span className="text-label">Section Leader</span>
            </label>
            {formData.email?.trim() && (
              <label
                className="flex-row"
                style={{
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  cursor: isSelf ? 'not-allowed' : 'pointer',
                  opacity: isSelf ? 0.6 : 1
                }}
                title={isSelf ? "You cannot remove your own administrator permissions to prevent accidental lockout." : undefined}
              >
                <input
                  type="checkbox"
                  checked={formData.role === 'admin'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.checked ? 'admin' : 'singer' })}
                  disabled={Boolean(isSelf)}
                  style={{
                    accentColor: 'var(--primary)',
                    width: '16px',
                    height: '16px',
                    cursor: isSelf ? 'not-allowed' : 'pointer'
                  }}
                />
                <span className="text-label">Administrator</span>
              </label>
            )}
          </div>

          {initialData?.statusLastChangedAt && (
            <div className="card" style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--bg)', boxShadow: 'none', border: '1px solid var(--border)' }}>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                <strong>Status Last Changed:</strong> {new Date(initialData.statusLastChangedAt).toLocaleString()}
              </div>
              <div className="text-xs text-muted">
                <strong>Reason:</strong> {initialData.statusChangeReason || 'Manual update'}
              </div>
            </div>
          )}

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Notes</label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              className="card"
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', height: '100px', resize: 'vertical' }}
            />
          </div>
        </form>
      ) : (
        initialData && (
          <SingerRsvpHistoryTab singerId={initialData.id} isOpen={isOpen} isActive={activeTab === 'rsvps'} />
        )
      )}
    </BaseModal>
  );
};
