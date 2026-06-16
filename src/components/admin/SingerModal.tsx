import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { profileService, getProfileEmail, type Profile, type ProfileInput } from '../../services/profileService';
import { useDialog } from '../../contexts/DialogContext';
import { Modal, Button, Select, Input, Checkbox, Textarea, Icon, TabGroup, Tab, TabPanel } from '../ui';
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
  const emailInputRef = useRef<HTMLInputElement>(null);

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

  const validateEmailField = useCallback(() => {
    const email = formData.email?.trim();
    if (email && !isValidEmail(email)) {
      emailInputRef.current?.setCustomValidity('Please enter a valid email address.');
      return false;
    }
    emailInputRef.current?.setCustomValidity('');
    return true;
  }, [formData.email]);

  // Clear the custom validity message as the user types so the red error
  // disappears immediately on edit (matches native browser validation behavior).
  // Empty deps: setFormData and emailInputRef are stable across renders.
  const handleEmailChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
    emailInputRef.current?.setCustomValidity('');
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setIsLoading(true);

    if (!validateEmailField()) {
      emailInputRef.current?.reportValidity?.();
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? 'Edit Singer' : 'Add Singer'}
      maxWidth="640px"
      footer={
        <>
          {activeTab === 'profile' ? (
            initialData && onDelete ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <div className="flex justify-between gap-2 sm:mr-auto">
                  <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting || isSubmitting}
                    variant="danger"
                    loading={isDeleting}
                  >
                    Delete Singer
                  </Button>
                  <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
                </div>
                <Button
                  disabled={isSubmitting}
                  variant="primary"
                  loading={isSubmitting}
                  className="w-full sm:w-auto"
                  onClick={() => handleSubmit()}
                >
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
                <Button
                  disabled={isSubmitting}
                  variant="primary"
                  loading={isSubmitting}
                  onClick={() => handleSubmit()}
                >
                  Save Changes
                </Button>
              </div>
            )
          ) : (
            <Button type="button" onClick={handleClose} variant="primary">Close</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {initialData ? (
          <TabGroup
            value={activeTab}
            onTabChange={(name) => setActiveTab(name as 'profile' | 'rsvps' | 'patronage')}
          >
            <Tab panel="profile">
              Profile Info
            </Tab>
            <Tab panel="rsvps">
              Performance RSVPs
            </Tab>
            {isAdmin && (
              <Tab panel="patronage">
                Patronage
              </Tab>
            )}

            <TabPanel name="profile">
              <div className="pt-4 flex flex-col gap-4">
                <form id="singer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-1">
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
                  </div>

                  <div className="flex flex-col items-start gap-1 w-full">
                    <label className="text-label">Name</label>
                    <Input 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col items-start gap-1">
                      <label className="text-label">Login Email (Optional)</label>
                      <Input
                        ref={emailInputRef}
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={validateEmailField}
                        placeholder="e.g. singer@example.com"
                      />
                      <p className="text-muted m-0 text-xs">
                        {initialData.user 
                          ? "Clearing this removes their login account." 
                          : "Provides portal access via password reset email."}
                      </p>
                      {initialData.user && formData.email && (
                        <div className="mt-[6px] flex flex-col items-start gap-1">
                          <Button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isResettingPassword}
                            variant="secondary"
                            size="tiny"
                            className="cursor-pointer inline-flex items-center gap-1"
                            loading={isResettingPassword}
                          >
                            <Icon name="key" className="text-xs" /> Reset Password
                          </Button>
                          {resetFeedback && (
                            <span 
                              className="text-[11px] font-semibold"
                              // @allow-inline-style - dynamic feedback color from server response
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
                      <Input 
                        value={formData.phone || ''} 
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                        placeholder="e.g. 555-123-4567"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col items-start gap-1">
                      <label className="text-label">Voice Part</label>
                      <Select 
                        value={formData.voicePart} 
                        onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as Profile['voicePart'] })}
                        required={formData.role !== 'admin'}
                        size="small"
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
                      </Select>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <label className="text-label">Status</label>
                      <Select 
                        value={formData.globalStatus} 
                        onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as Profile['globalStatus'] })}
                        size="small"
                      >
                        <option value="Active">Active</option>
                        <option value="Idle">Idle</option>
                        <option value="Inactive">Inactive</option>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 gap-x-4">
                    <Checkbox
                      checked={formData.doNotEmail}
                      onChange={(e) => setFormData({ ...formData, doNotEmail: e.target.checked })}
                    >
                      Do Not Email
                    </Checkbox>
                    <Checkbox
                      checked={formData.statusIsManual}
                      onChange={(e) => setFormData({ ...formData, statusIsManual: e.target.checked })}
                    >
                      Lock Status (Disable Automation)
                    </Checkbox>
                    <Checkbox
                      checked={Boolean(formData.isSectionLeader)}
                      onChange={(e) => setFormData({ ...formData, isSectionLeader: e.target.checked })}
                    >
                      Section Leader
                    </Checkbox>
                    {formData.role === 'admin' && (
                      <>
                        <Checkbox
                          checked={formData.receiveAttendanceReports !== false}
                          onChange={(e) => setFormData({ ...formData, receiveAttendanceReports: e.target.checked })}
                        >
                          Receive Attendance Reports
                        </Checkbox>
                        <Checkbox
                          checked={Boolean(formData.receiveRsvpDeclineNotices)}
                          onChange={(e) => setFormData({ ...formData, receiveRsvpDeclineNotices: e.target.checked })}
                        >
                          Receive RSVP Decline Notices
                        </Checkbox>
                        <Checkbox
                          checked={formData.receiveAdminNotifications !== false}
                          onChange={(e) => setFormData({ ...formData, receiveAdminNotifications: e.target.checked })}
                        >
                          Receive General Admin Notifications
                        </Checkbox>
                      </>
                    )}
                    {formData.email?.trim() ? (
                      <Checkbox
                        checked={formData.role === 'admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.checked ? 'admin' : 'singer' })}
                        disabled={Boolean(isSelf)}
                        title={isSelf ? "You cannot remove your own administrator permissions to prevent accidental lockout." : undefined}
                        className={isSelf ? 'opacity-60 cursor-not-allowed' : ''}
                      >
                        Administrator
                      </Checkbox>
                    ) : <div />}
                  </div>

                  {initialData.statusLastChangedAt && (
                    <div className="flex flex-row flex-wrap justify-between gap-[4px_12px] rounded-xl border border-border bg-bg p-[6px_10px] shadow-none">
                      <div className="text-muted m-0 text-xs">
                        <strong>Status Changed:</strong> {new Date(initialData.statusLastChangedAt).toLocaleDateString()}
                      </div>
                      <div className="text-muted m-0 text-xs">
                        <strong>Reason:</strong> {initialData.statusChangeReason || 'Manual update'}
                      </div>
                    </div>
                  )}

                  <div className="flex w-full flex-col items-start gap-1">
                    <label className="text-label">Notes</label>
                    <Textarea 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                    />
                  </div>
                </form>
              </div>
            </TabPanel>
            <TabPanel name="rsvps">
              <div className="pt-4">
                <SingerRsvpHistoryTab singerId={initialData.id} isOpen={isOpen} isActive={activeTab === 'rsvps'} />
              </div>
            </TabPanel>
            {isAdmin && (
              <TabPanel name="patronage">
                <div className="pt-4">
                  <SingerPatronageHistoryTab profileId={initialData.id} isOpen={isOpen} isActive={activeTab === 'patronage'} />
                </div>
              </TabPanel>
            )}
          </TabGroup>
        ) : (
          <form id="singer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-bg text-4xl text-text-muted">
                ?
              </div>
              <span className="text-muted text-xs">Save first to add a photo</span>
            </div>

            <div className="flex flex-col items-start gap-1 w-full">
              <label className="text-label">Name</label>
              <Input 
                value={formData.name || ''} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-start gap-1">
                <label className="text-label">Login Email (Optional)</label>
                <Input
                  ref={emailInputRef}
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={validateEmailField}
                  placeholder="e.g. singer@example.com"
                />
                <p className="text-muted m-0 text-xs">
                  Provides portal access via password reset email.
                </p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <label className="text-label">Phone (Optional)</label>
                <Input 
                  value={formData.phone || ''} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="e.g. 555-123-4567"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-start gap-1">
                <label className="text-label">Voice Part</label>
                <Select 
                  value={formData.voicePart} 
                  onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as Profile['voicePart'] })}
                  required={formData.role !== 'admin'}
                  size="small"
                >
                  <option value="" disabled>-- Please Select --</option>
                  {voiceParts.map(v => (
                    <option key={v.label} value={v.label}>
                      {v.label} {v.fullName ? `(${v.fullName})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col items-start gap-1">
                <label className="text-label">Status</label>
                <Select 
                  value={formData.globalStatus} 
                  onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as Profile['globalStatus'] })}
                  size="small"
                >
                  <option value="Active">Active</option>
                  <option value="Idle">Idle</option>
                  <option value="Inactive">Inactive</option>
                </Select>
              </div>
            </div>
                        <div className="grid grid-cols-2 gap-2 gap-x-4">
              <Checkbox
                checked={formData.doNotEmail}
                onChange={(e) => setFormData({ ...formData, doNotEmail: e.target.checked })}
              >
                Do Not Email
              </Checkbox>
              <Checkbox
                checked={formData.statusIsManual}
                onChange={(e) => setFormData({ ...formData, statusIsManual: e.target.checked })}
              >
                Lock Status (Disable Automation)
              </Checkbox>
              <Checkbox
                checked={Boolean(formData.isSectionLeader)}
                onChange={(e) => setFormData({ ...formData, isSectionLeader: e.target.checked })}
              >
                Section Leader
              </Checkbox>
            </div>

            <div className="flex w-full flex-col items-start gap-1">
              <label className="text-label">Notes</label>
              <Textarea 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
            </div>
          </form>
        )}
      </div>

    </Modal>
  );
};
