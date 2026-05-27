import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfileInput, isProfileFormDirty, profileToFormData } from '../src/lib/profileForm.ts';
import type { Profile } from '../src/services/profileService.ts';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile_1',
    collectionId: 'profiles',
    collectionName: 'profiles',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    user: 'user_1',
    name: 'Jane Singer',
    phone: '123-456-7890',
    photo: 'jane.jpg',
    voicePart: 'Alto',
    globalStatus: 'Active',
    notes: 'note',
    doNotEmail: false,
    isSectionLeader: false,
    statusIsManual: false,
    ...overrides,
  };
}

test('blank add form is not dirty', () => {
  assert.equal(isProfileFormDirty({ ...defaultProfileInput }, null), false);
});

test('add form with name is dirty', () => {
  assert.equal(isProfileFormDirty({ ...defaultProfileInput, name: 'Test' }, null), true);
});

test('add form with isSectionLeader true is dirty', () => {
  assert.equal(isProfileFormDirty({ ...defaultProfileInput, isSectionLeader: true }, null), true);
});

test('existing profile with same values is not dirty', () => {
  const profile = makeProfile({
    expand: {
      user: {
        id: 'user_1',
        collectionId: 'users',
        collectionName: 'users',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        email: 'jane@example.com',
        name: 'Jane Singer',
        role: 'singer',
      },
    },
  });

  const formData = profileToFormData(profile);
  assert.equal(isProfileFormDirty(formData, profile), false);
});

test('changing email is dirty', () => {
  const profile = makeProfile({
    expand: {
      user: {
        id: 'user_1',
        collectionId: 'users',
        collectionName: 'users',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        email: 'jane@example.com',
        name: 'Jane Singer',
        role: 'singer',
      },
    },
  });

  const formData = profileToFormData(profile);
  formData.email = 'new@example.com';
  assert.equal(isProfileFormDirty(formData, profile), true);
});

test('changing section leader status is dirty', () => {
  const profile = makeProfile({ isSectionLeader: false });
  const formData = profileToFormData(profile);
  formData.isSectionLeader = true;
  assert.equal(isProfileFormDirty(formData, profile), true);
});

test('profileToFormData hydrates email from expand.user.email', () => {
  const profile = makeProfile({
    expand: {
      user: {
        id: 'user_1',
        collectionId: 'users',
        collectionName: 'users',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        email: 'hydrated@example.com',
        name: 'Jane Singer',
        role: 'singer',
      },
    },
  });

  const hydrated = profileToFormData(profile);
  assert.equal(hydrated.email, 'hydrated@example.com');
});

test('missing booleans default to false', () => {
  const profile = makeProfile({
    doNotEmail: undefined,
    isSectionLeader: undefined,
    statusIsManual: undefined,
  });

  const hydrated = profileToFormData(profile);
  assert.equal(hydrated.doNotEmail, false);
  assert.equal(hydrated.isSectionLeader, false);
  assert.equal(hydrated.statusIsManual, false);
});
