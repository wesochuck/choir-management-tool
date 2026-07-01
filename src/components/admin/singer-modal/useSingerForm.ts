import { useState, useEffect, useMemo, useRef } from 'react';
import type { Profile, ProfileInput } from '../../../services/profileService';
import { profileService, getProfileEmail } from '../../../services/profileService';
import { useDialog } from '../../../contexts/DialogContext';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import {
  defaultProfileInput,
  isProfileFormDirty,
  profileToFormData,
} from '../../../lib/profileForm';

export function useSingerForm(
  isOpen: boolean,
  initialData: Profile | null | undefined,
  onClose: () => void,
  onSave: (data: ProfileInput) => Promise<void>,
  onDelete?: (profile: Profile) => Promise<void>
) {
  const dialog = useDialog();
  const { performerLabel } = useChoirSettings();

  const [formData, setFormData] = useState<ProfileInput>({ ...defaultProfileInput });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(profileToFormData(initialData));
  }, [initialData, isOpen]);

  const isDirty = useMemo(() => {
    return isProfileFormDirty(formData, initialData);
  }, [formData, initialData]);

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const validateEmailField = () => {
    const email = formData.email?.trim();
    if (email && !isValidEmail(email)) {
      emailInputRef.current?.setCustomValidity('Please enter a valid email address.');
      return false;
    }
    emailInputRef.current?.setCustomValidity('');
    return true;
  };

  const handleEmailChange = (value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
    emailInputRef.current?.setCustomValidity('');
  };

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: initialData
          ? `You have unsaved changes to this ${performerLabel.toLowerCase()}'s profile. Do you want to discard them?`
          : `You are adding a new ${performerLabel.toLowerCase()} with unsaved details. Do you want to discard this ${performerLabel.toLowerCase()}?`,
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setIsSubmitting(true);

    if (!(formData.name ?? '').trim()) {
      dialog.showToast('Please enter a name.');
      setIsSubmitting(false);
      return;
    }
    if (formData.role !== 'admin' && !formData.voicePart) {
      dialog.showToast('Please select a voice part.');
      setIsSubmitting(false);
      return;
    }

    if (!validateEmailField()) {
      emailInputRef.current?.reportValidity?.();
      setIsSubmitting(false);
      return;
    }

    const hasExistingAccount = Boolean(initialData?.user);
    const existingEmail = initialData ? getProfileEmail(initialData) : '';
    const nextEmail = formData.email || '';
    const willRemoveEmail = Boolean(existingEmail.trim()) && !nextEmail.trim();

    if (hasExistingAccount && willRemoveEmail) {
      const confirmed = await dialog.confirm({
        title: 'Delete Member User Account?',
        message:
          'Clearing this email address completely deletes this user portal account. They will lose all login access. Proceed?',
        confirmLabel: 'Delete Account',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (!confirmed) {
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      let customMessage = formatPocketBaseError(err);
      if (willRemoveEmail) {
        customMessage = `Could not remove the login account. The ${performerLabel.toLowerCase()} profile was not changed. (${customMessage})`;
      }
      await dialog.showMessage({
        title: `Could Not Save ${performerLabel}`,
        message: customMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    const shouldDelete = await dialog.confirm({
      title: `Delete ${performerLabel}`,
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
        title: `Could Not Delete ${performerLabel}`,
        message: `Error deleting ${performerLabel.toLowerCase()}`,
        variant: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

  return {
    formData,
    setFormData,
    isSubmitting,
    isDeleting,
    isDirty,
    emailInputRef,
    resetFeedback,
    isResettingPassword,
    validateEmailField,
    handleEmailChange,
    handleClose,
    handleSubmit,
    handleDelete,
    handleResetPassword,
  };
}
