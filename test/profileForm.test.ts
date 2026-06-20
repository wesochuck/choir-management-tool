import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProfileInput,
  isProfileFormDirty,
  profileToFormData,
} from '../src/lib/profileForm.ts';
import type { Profile, ProfileInput } from '../src/services/profileService.ts';

const makeProfile = (overrides: Partial<Profile> = {}): Profile => {
  const base = {
    id: 'p1',
    collectionId: 'profiles',
    collectionName: 'profiles',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    user: 'u1',
    name: 'Jane Singer',
    phone: '555-1234',
    photo: 'photo.jpg',
    voicePart: 'S1',
    globalStatus: 'Active' as const,
    notes: 'Note',
    doNotEmail: false,
    isSectionLeader: false,
    statusIsManual: false,
    expand: {
      user: {
        id: 'u1',
        collectionId: 'users',
        collectionName: 'users',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        email: 'jane@example.com',
        name: 'Jane Singer',
        role: 'singer' as const,
      },
    },
  } satisfies Profile;

  return { ...base, ...overrides };
};

test('blank add form is not dirty', () => {
  assert.equal(isProfileFormDirty({ ...defaultProfileInput }, null), false);
});

test('add form with name is dirty', () => {
  const formData: ProfileInput = { ...defaultProfileInput, name: 'New Singer' };
  assert.equal(isProfileFormDirty(formData, null), true);
});

test('add form with isSectionLeader true is dirty', () => {
  const formData: ProfileInput = { ...defaultProfileInput, isSectionLeader: true };
  assert.equal(isProfileFormDirty(formData, null), true);
});

test('existing profile with same values is not dirty', () => {
  const profile = makeProfile();
  const formData = profileToFormData(profile);
  assert.equal(isProfileFormDirty(formData, profile), false);
});

test('changing email is dirty', () => {
  const profile = makeProfile();
  const formData = { ...profileToFormData(profile), email: 'different@example.com' };
  assert.equal(isProfileFormDirty(formData, profile), true);
});

test('changing section leader status is dirty', () => {
  const profile = makeProfile({ isSectionLeader: false });
  const formData = { ...profileToFormData(profile), isSectionLeader: true };
  assert.equal(isProfileFormDirty(formData, profile), true);
});

test('profileToFormData hydrates email from expand.user.email', () => {
  const profile = makeProfile({
    expand: { user: { ...makeProfile().expand!.user!, email: 'hydrate@example.com' } },
  });
  const formData = profileToFormData(profile);
  assert.equal(formData.email, 'hydrate@example.com');
});

test('missing booleans default to false', () => {
  const profile = makeProfile({
    doNotEmail: undefined,
    isSectionLeader: undefined,
    statusIsManual: undefined,
  });
  const formData = profileToFormData(profile);
  assert.equal(formData.doNotEmail, false);
  assert.equal(formData.isSectionLeader, false);
  assert.equal(formData.statusIsManual, false);
});

test('showInDirectory defaults to true in profileToFormData when missing or undefined', () => {
  const profile = makeProfile({ showInDirectory: undefined });
  const formData = profileToFormData(profile);
  assert.equal(formData.showInDirectory, true);
});

test('showInDirectory preserves false in profileToFormData when explicitly false', () => {
  const profile = makeProfile({ showInDirectory: false });
  const formData = profileToFormData(profile);
  assert.equal(formData.showInDirectory, false);
});

test('changing showInDirectory makes existing profile form dirty', () => {
  const profile = makeProfile({ showInDirectory: true });
  const formData = { ...profileToFormData(profile), showInDirectory: false };
  assert.equal(isProfileFormDirty(formData, profile), true);
});
