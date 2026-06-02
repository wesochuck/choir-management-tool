import test from 'node:test';
import assert from 'node:assert/strict';
import { auditionToFormData, isAuditionFormDirty, defaultAuditionInput } from '../src/lib/auditionForm';
import type { Audition } from '../src/services/auditionService';

test('auditionToFormData returns default input when audition is null', () => {
  const result = auditionToFormData(null);
  assert.deepEqual(result, {
    ...defaultAuditionInput,
    performance: '',
  });
});

test('auditionToFormData returns default input with provided performanceId when audition is null', () => {
  const result = auditionToFormData(null, 'perf_123');
  assert.deepEqual(result, {
    ...defaultAuditionInput,
    performance: 'perf_123',
  });
});

test('auditionToFormData hydrates correctly from an audition record', () => {
  const audition: Audition = {
    id: 'aud_1',
    collectionId: 'pbc_auditions_001',
    collectionName: 'auditions',
    name: 'John Doe',
    contact: 'john@example.com',
    status: 'Scheduled',
    voicePart: 'B1',
    performance: 'perf_1',
    experience: 'Many years',
    notes: 'Likes pizza',
    requestedSlots: ['slot_1', 'slot_2'],
    scheduledTimeSlot: 'slot_1',
    created: '2023-01-01',
    updated: '2023-01-01',
  } as Audition;

  const result = auditionToFormData(audition);
  assert.deepEqual(result, {
    name: 'John Doe',
    contact: 'john@example.com',
    status: 'Scheduled',
    voicePart: 'B1',
    performance: 'perf_1',
    experience: 'Many years',
    notes: 'Likes pizza',
    requestedSlots: ['slot_1', 'slot_2'],
    scheduledTimeSlot: 'slot_1',
  });
});

test('isAuditionFormDirty returns false when form matches initial data', () => {
  const audition: Audition = {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    status: 'New',
    voicePart: '',
    performance: '',
    experience: '',
    notes: '',
    requestedSlots: [],
    scheduledTimeSlot: '',
  } as Audition;

  const formData = auditionToFormData(audition);
  assert.equal(isAuditionFormDirty(formData, audition), false);
});

test('isAuditionFormDirty returns true when form data is modified', () => {
  const audition: Audition = {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    status: 'New',
  } as Audition;

  const formData = auditionToFormData(audition);
  formData.name = 'Jane Smith';
  
  assert.equal(isAuditionFormDirty(formData, audition), true);
});

test('isAuditionFormDirty handles array order in requestedSlots', () => {
  const audition: Audition = {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    requestedSlots: ['slot_1', 'slot_2'],
  } as Audition;

  const formData = auditionToFormData(audition);
  formData.requestedSlots = ['slot_2', 'slot_1'];
  
  assert.equal(isAuditionFormDirty(formData, audition), false);
});
