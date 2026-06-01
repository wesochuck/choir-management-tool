import test from 'node:test';
import assert from 'node:assert/strict';
import { profileToRecipient } from '../../../src/services/communication/recipientResolver';
import type { Profile } from '../../../src/services/profileService';

test('profileToRecipient maps fully populated profile', () => {
  const profile = {
    id: 'p123',
    name: 'John Doe',
    phone: '555-0100',
    voicePart: 'Tenor',
    globalStatus: 'Active',
    expand: {
      user: {
        id: 'u123',
        email: 'john@example.com',
      },
    },
  } as unknown as Profile;

  const recipient = profileToRecipient(profile);

  assert.deepEqual(recipient, {
    id: 'p123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-0100',
    voicePart: 'Tenor',
    globalStatus: 'Active',
  });
});

test('profileToRecipient handles missing expand', () => {
  const profile = {
    id: 'p124',
    name: 'Jane Smith',
    phone: '555-0101',
    voicePart: 'Soprano',
    globalStatus: 'Inactive',
  } as unknown as Profile;

  const recipient = profileToRecipient(profile);

  assert.deepEqual(recipient, {
    id: 'p124',
    name: 'Jane Smith',
    email: '',
    phone: '555-0101',
    voicePart: 'Soprano',
    globalStatus: 'Inactive',
  });
});

test('profileToRecipient handles expand without user', () => {
  const profile = {
    id: 'p125',
    name: 'Bob Jones',
    phone: '555-0102',
    voicePart: 'Bass',
    globalStatus: 'Idle',
    expand: {},
  } as unknown as Profile;

  const recipient = profileToRecipient(profile);

  assert.deepEqual(recipient, {
    id: 'p125',
    name: 'Bob Jones',
    email: '',
    phone: '555-0102',
    voicePart: 'Bass',
    globalStatus: 'Idle',
  });
});

test('profileToRecipient handles missing phone', () => {
  const profile = {
    id: 'p126',
    name: 'Alice Brown',
    voicePart: 'Alto',
    globalStatus: 'Active',
    expand: {
      user: {
        id: 'u126',
        email: 'alice@example.com',
      },
    },
  } as unknown as Profile;

  const recipient = profileToRecipient(profile);

  assert.deepEqual(recipient, {
    id: 'p126',
    name: 'Alice Brown',
    email: 'alice@example.com',
    phone: '',
    voicePart: 'Alto',
    globalStatus: 'Active',
  });
});
