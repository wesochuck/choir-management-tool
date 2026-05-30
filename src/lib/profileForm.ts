import type { Profile, ProfileInput } from '../services/profileService';

export const defaultProfileInput: ProfileInput = {
  name: '',
  email: '',
  phone: '',
  voicePart: '',
  globalStatus: 'Active',
  notes: '',
  doNotEmail: false,
  isSectionLeader: false,
  statusIsManual: false,
  role: 'singer',
};

export function profileToFormData(profile: Profile | null | undefined): ProfileInput {
  if (!profile) return { ...defaultProfileInput };

  const restProfile = { ...profile } as Record<string, unknown>;
  delete restProfile.password;

  return {
    ...restProfile,
    email: profile.expand?.user?.email || '',
    doNotEmail: Boolean(profile.doNotEmail),
    isSectionLeader: Boolean(profile.isSectionLeader),
    statusIsManual: Boolean(profile.statusIsManual),
    role: profile.expand?.user?.role || 'singer',
  } as ProfileInput;
}

export function isProfileFormDirty(formData: ProfileInput, initialData?: Profile | null): boolean {
  if (!initialData) {
    return Boolean(
      formData.name?.trim() ||
      formData.email?.trim() ||
      formData.phone?.trim() ||
      formData.voicePart ||
      formData.globalStatus !== 'Active' ||
      formData.notes?.trim() ||
      formData.doNotEmail ||
      formData.isSectionLeader ||
      formData.statusIsManual ||
      formData.role !== 'singer'
    );
  }

  return (
    (formData.name || '') !== (initialData.name || '') ||
    (formData.email || '') !== (initialData.expand?.user?.email || '') ||
    (formData.phone || '') !== (initialData.phone || '') ||
    (formData.voicePart || '') !== (initialData.voicePart || '') ||
    (formData.globalStatus || '') !== (initialData.globalStatus || '') ||
    (formData.notes || '') !== (initialData.notes || '') ||
    Boolean(formData.doNotEmail) !== Boolean(initialData.doNotEmail) ||
    Boolean(formData.isSectionLeader) !== Boolean(initialData.isSectionLeader) ||
    Boolean(formData.statusIsManual) !== Boolean(initialData.statusIsManual) ||
    (formData.role || 'singer') !== (initialData.expand?.user?.role || 'singer') ||
    formData.photo !== initialData.photo
  );
}
