import React, { useState, useEffect, useMemo } from 'react';
import { profileService, getProfileEmail, type Profile, type ProfileInput } from '../../services/profileService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { PhotoUploader } from '../common/PhotoUploader';
import { formatPocketBaseError, pb } from '../../lib/pocketbase';
import { defaultProfileInput, isProfileFormDirty, profileToFormData } from '../../lib/profileForm';
import { SingerRsvpHistoryTab } from './SingerRsvpHistoryTab';
import { SingerPatronageHistoryTab } from './SingerPatronageHistoryTab';
import { useVoiceParts } from '../../hooks/useVoiceParts';

interface SingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileInput) => Promise<void>;
  onDelete?: (profile: Profile) => Promise<void>;
  initialData?: Profile | null;
}

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
  const isAdmin = pb.authStore.model?.role === 'admin';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'rsvps' | 'patronage'>('profile');

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

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const email = formData.email || '';
    if (email.trim() && !isValidEmail(email.trim())) {
      await dialog.showMessage({
        title: 'Invalid Email Format',
        message: 'Please enter a valid email address.',
        variant: 'danger',
      });
      setIsLoading(false);
      return;
    }

    const hasExistingAccount = Boolean(initialData?.user);
    const existingEmail = initialData ? getProfileEmail(initialData) : '';
    const nextEmail = formData.email || '';
    const willRemoveEmail = Boolean(existingEmail.trim()) && !nextEmail.trim();

    if (hasExistingAccount && willRemoveEmail) {
      const confirmed = await dialog.confirm({
        title: 'Delete Member User Account?',
        message: 'Clearing this email address completely deletes this user portal account. They will lose all login access. Proceed?',
        confirmLabel: 'Delete Account',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (!confirmed) {
        setIsLoading(false);
        return;
      }
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      let customMessage = formatPocketBaseError(err);
      if (willRemoveEmail) {
        customMessage = `Could not remove the login account. The singer profile was not changed. (${customMessage})`;
      }
      await dialog.showMessage({
        title: 'Could Not Save Singer',
        message: customMessage,
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
      minHeight={initialData ? '540px' : undefined}
      footer={
        <>
          {activeTab === 'profile' ? (
            <>
              {initialData && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="btn btn-danger mr-auto"
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
        <div className="mb-4 flex-row gap-4 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`cursor-pointer border-none bg-none px-4 py-2 text-[15px] transition-all duration-200 ${activeTab === 'profile' ? 'border-b-2 border-primary font-semibold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rsvps')}
            className={`cursor-pointer border-none bg-none px-4 py-2 text-[15px] transition-all duration-200 ${activeTab === 'rsvps' ? 'border-b-2 border-primary font-semibold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
          >
            Performance RSVPs
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('patronage')}
              className={`cursor-pointer border-none bg-none px-4 py-2 text-[15px] transition-all duration-200 ${activeTab === 'patronage' ? 'border-b-2 border-primary font-semibold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
            >
              Patronage
            </button>
          )}
        </div>
      )}

      {activeTab === 'profile' ? (
        <form id="singer-form" onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="flex flex-col items-center gap-1">
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
                <div className="flex size-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-bg text-4xl text-text-muted">
                  ?
                </div>
                <span className="text-muted text-xs">Save first to add a photo</span>
              </>
            )}
          </div>

          <div className="flex flex-col items-start gap-1">
            <label className="text-label">Name</label>
            <input 
              value={formData.name || ''} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              required
              className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[38px] min-h-[38px] w-full px-3"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col items-start gap-1">
              <label className="text-label">Login Email (Optional)</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[38px] min-h-[38px] w-full px-3"
                placeholder="e.g. singer@example.com"
              />
              <p className="text-muted m-0 text-xs">
                {initialData?.user 
                  ? "Clearing this removes their login account." 
                  : "Provides portal access via password reset email."}
              </p>
              {initialData?.user && formData.email && (
                <div className="mt-[6px] flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                    className="btn btn-xs btn-secondary flex h-6 cursor-pointer items-center gap-1 px-2 text-[11px] font-semibold"
                  >
                    {isResettingPassword ? 'Sending Link...' : '🔑 Reset Password'}
                  </button>
                  {resetFeedback && (
                    <span 
                      className="text-[11px] font-semibold"
                      // @allow-inline-style - dynamic feedback color
                      style={{
                        color: resetFeedback.startsWith('Error') ? 'var(--color-danger-text, #ef4444)' : 'var(--color-success-text, #22c55e)'
                      }}
                    >
                      {resetFeedback}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start gap-1">
              <label className="text-label">Phone (Optional)</label>
              <input 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[38px] min-h-[38px] w-full px-3"
                placeholder="e.g. 555-123-4567"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col items-start gap-1">
              <label className="text-label">Voice Part</label>
              <select 
                value={formData.voicePart} 
                onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as Profile['voicePart'] })}
                required={formData.role !== 'admin'}
                className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[38px] min-h-[38px] w-full px-3"
              >
                {formData.role === 'admin' ? (
                  <option value="">-- Not Applicable (Admin) --</option>
                ) : (
                  <option value="" disabled>-- Please Select --</option>
                )}
                {voiceParts.map(v => (
                  <option key={v.label} value={v.label}>
                    {v.label} {v.fullName ? `(${v.fullName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-start gap-1">
              <label className="text-label">Status</label>
              <select 
                value={formData.globalStatus} 
                onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as Profile['globalStatus'] })}
                className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[38px] min-h-[38px] w-full px-3"
              >
                <option value="Active">Active</option>
                <option value="Idle">Idle</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 gap-x-4">
            <label className="min-h-auto cursor-pointer flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={formData.doNotEmail}
                onChange={(e) => setFormData({ ...formData, doNotEmail: e.target.checked })}
                className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-label">Do Not Email</span>
            </label>
            <label className="min-h-auto cursor-pointer flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={formData.statusIsManual}
                onChange={(e) => setFormData({ ...formData, statusIsManual: e.target.checked })}
                className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-label">Lock Status (Disable Automation)</span>
            </label>
            <label className="min-h-auto cursor-pointer flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(formData.isSectionLeader)}
                onChange={(e) => setFormData({ ...formData, isSectionLeader: e.target.checked })}
                className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-label">Section Leader</span>
            </label>
            {formData.role === 'admin' && (
              <>
                <label className="min-h-auto cursor-pointer flex-row items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.receiveAttendanceReports !== false}
                    onChange={(e) => setFormData({ ...formData, receiveAttendanceReports: e.target.checked })}
                    className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
                  />
                  <span className="text-label">Receive Attendance Reports</span>
                </label>
                <label className="min-h-auto cursor-pointer flex-row items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.receiveRsvpDeclineNotices)}
                    onChange={(e) => setFormData({ ...formData, receiveRsvpDeclineNotices: e.target.checked })}
                    className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
                  />
                  <span className="text-label">Receive RSVP Decline Notices</span>
                </label>
                <label className="min-h-auto cursor-pointer flex-row items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.receiveAdminNotifications !== false}
                    onChange={(e) => setFormData({ ...formData, receiveAdminNotifications: e.target.checked })}
                    className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
                  />
                  <span className="text-label">Receive General Admin Notifications</span>
                </label>
              </>
            )}
            {formData.email?.trim() ? (
              <label
                className="min-h-auto cursor-pointer flex-row items-center gap-2"
                // @allow-inline-style - dynamic opacity based on isSelf
                style={{
                  opacity: isSelf ? 0.6 : 1,
                }}
                title={isSelf ? "You cannot remove your own administrator permissions to prevent accidental lockout." : undefined}
              >
                <input
                  type="checkbox"
                  checked={formData.role === 'admin'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.checked ? 'admin' : 'singer' })}
                  disabled={Boolean(isSelf)}
                  className="size-4 min-h-auto shrink-0 cursor-pointer accent-[var(--primary)]"
                  // @allow-inline-style - dynamic cursor based on isSelf
                  style={{
                    cursor: isSelf ? 'not-allowed' : 'pointer',
                  }}
                />
                <span className="text-label">Administrator</span>
              </label>
            ) : <div />}
          </div>

          {initialData?.statusLastChangedAt && (
            <div className="rounded-xl flex flex-row flex-wrap justify-between gap-[4px_12px] border border-border bg-bg p-[6px_10px] shadow-none">
              <div className="text-muted m-0 text-xs">
                <strong>Status Changed:</strong> {new Date(initialData.statusLastChangedAt).toLocaleDateString()}
              </div>
              <div className="text-muted m-0 text-xs">
                <strong>Reason:</strong> {initialData.statusChangeReason || 'Manual update'}
              </div>
            </div>
          )}

          <div className="flex flex-col items-start gap-1">
            <label className="text-label">Notes</label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[60px] min-h-[60px] w-full resize-y p-3"
            />
          </div>
        </form>
      ) : activeTab === 'rsvps' ? (
        initialData && (
          <SingerRsvpHistoryTab singerId={initialData.id} isOpen={isOpen} isActive={activeTab === 'rsvps'} />
        )
      ) : (
        initialData && (
          <SingerPatronageHistoryTab profileId={initialData.id} isOpen={isOpen} isActive={activeTab === 'patronage'} />
        )
      )}
    </BaseModal>
  );
};
