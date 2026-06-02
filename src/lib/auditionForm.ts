import type { Audition, AuditionInput } from '../services/auditionService';

export const defaultAuditionInput: AuditionInput = {
  name: '',
  contact: '',
  status: 'New',
  notes: '',
  experience: '',
  requestedSlots: [],
};

/**
 * Hydrates form state from a record or defaults.
 */
export function auditionToFormData(audition: Audition | null, defaultPerformanceId?: string): AuditionInput {
  if (!audition) {
    return {
      ...defaultAuditionInput,
      performance: defaultPerformanceId || '',
    };
  }
  return {
    name: audition.name || '',
    contact: audition.contact || '',
    status: audition.status || 'New',
    voicePart: audition.voicePart || '',
    performance: audition.performance || '',
    experience: audition.experience || '',
    notes: audition.notes || '',
    requestedSlots: audition.requestedSlots || [],
    scheduledTimeSlot: audition.scheduledTimeSlot || '',
  };
}

/**
 * Checks if the current form differs from the initial record data.
 */
export function isAuditionFormDirty(formData: AuditionInput, initialData: Audition | null): boolean {
  const currentInitial = auditionToFormData(initialData);
  // Sort requested slots to ensure comparison is order-independent
  const sortedFormData = {
    ...formData,
    requestedSlots: [...(formData.requestedSlots || [])].sort(),
  };
  const sortedInitial = {
    ...currentInitial,
    requestedSlots: [...(currentInitial.requestedSlots || [])].sort(),
  };
  return JSON.stringify(sortedFormData) !== JSON.stringify(sortedInitial);
}
