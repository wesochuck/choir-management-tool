import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { exportToCSV, updateProfilePhoto, deleteProfilePhoto, getProfileEmail, generateRandomPassword, type Profile } from '../src/services/profileService.ts';


type CollectionMock = ReturnType<typeof pb.collection>;

test('exportToCSV maps profiles to CSV format correctly', () => {
  const profiles = [{ id: '1', name: 'John Doe', phone: '123', voicePart: 'T1', globalStatus: 'Active', user: '', photo: '', notes: '', expand: { user: { email: 'john@example.com', name: 'John Doe', role: 'singer', id: 'u1', collectionId: '', collectionName: '', created: '', updated: '' } } }] as unknown as Profile[];
  const csv = exportToCSV(profiles);

  assert.ok(csv.includes('Name,Email,Phone,Voice Part,Status'));
  assert.ok(csv.includes('"John Doe","john@example.com","123","T1","Active"'));
  assert.equal(csv.includes('Section Leaders'), false);
});

test('exportToCSV duplicates section leaders into dedicated section preserving order', () => {
  const profiles = [
    { id: '1', name: 'Jane Singer', phone: '555-123-4567', voicePart: 'S1', globalStatus: 'Active', isSectionLeader: true, user: '', photo: '', notes: '', expand: { user: { email: 'jane@example.com', name: 'Jane', role: 'singer', id: 'u1', collectionId: '', collectionName: '', created: '', updated: '' } } },
    { id: '2', name: 'Sam Singer', phone: '', voicePart: 'B2', globalStatus: 'Active', isSectionLeader: false, user: '', photo: '', notes: '', expand: { user: { email: 'sam@example.com', name: 'Sam', role: 'singer', id: 'u2', collectionId: '', collectionName: '', created: '', updated: '' } } },
    { id: '3', name: 'Alex "Ace", Singer', phone: '', voicePart: 'T2', globalStatus: 'Active', isSectionLeader: true, user: '', photo: '', notes: '', expand: { user: { email: 'alex@example.com', name: 'Alex', role: 'singer', id: 'u3', collectionId: '', collectionName: '', created: '', updated: '' } } },
  ] as unknown as Profile[];

  const csv = exportToCSV(profiles);
  const sections = csv.split('\n\nSection Leaders\n');

  assert.equal(sections.length, 2);

  const [mainTable, leaderTable] = sections;
  assert.ok(mainTable.includes('"Jane Singer","jane@example.com","555-123-4567","S1","Active"'));
  assert.ok(mainTable.includes('"Sam Singer","sam@example.com","","B2","Active"'));
  assert.ok(mainTable.includes('"Alex ""Ace"", Singer","alex@example.com","","T2","Active"'));

  const leaderRows = leaderTable.split('\n');
  assert.equal(leaderRows[0], 'Name,Email,Phone,Voice Part,Status');
  assert.equal(leaderRows[1], '"Jane Singer","jane@example.com","555-123-4567","S1","Active"');
  assert.equal(leaderRows[2], '"Alex ""Ace"", Singer","alex@example.com","","T2","Active"');
  assert.equal(leaderTable.includes('"Sam Singer","sam@example.com","","B2","Active"'), false);

  const janeCount = csv.split('"Jane Singer","jane@example.com","555-123-4567","S1","Active"').length - 1;
  const alexCount = csv.split('"Alex ""Ace"", Singer","alex@example.com","","T2","Active"').length - 1;
  assert.equal(janeCount, 2);
  assert.equal(alexCount, 2);
});

test('updateProfilePhoto calls pocketbase with FormData', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string) => {
    return { id, photo: 'photo.jpg' };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { update: mockUpdate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const formData = new FormData();
    formData.append('photo', new Blob(['test'], { type: 'image/jpeg' }));
    
    const result = await updateProfilePhoto('1', formData);
    
    assert.equal(result.photo, 'photo.jpg');
    assert.equal(mockUpdate.mock.callCount(), 1);
    const firstCall = mockUpdate.mock.calls[0];
    assert.equal(firstCall.arguments[0], '1');
    assert.equal((firstCall.arguments as unknown[])[1], formData);
  } finally {
    pb.collection = originalCollection;
  }
});

test('generateRandomPassword generates a password of default length 12', () => {
  const pwd = generateRandomPassword();
  assert.equal(pwd.length, 12);
});

test('generateRandomPassword generates a password of specified length', () => {
  const pwd = generateRandomPassword(20);
  assert.equal(pwd.length, 20);
});

test('generateRandomPassword only contains valid characters', () => {
  const validCharsRegex = /^[a-zA-Z0-9!@#$%^&*]+$/;
  const pwd = generateRandomPassword(50);
  assert.match(pwd, validCharsRegex);
});

test('generateRandomPassword uses Web Crypto API when available', (t) => {
  const originalCrypto = globalThis.crypto;
  let getRandomValuesCalled = false;

  const mockCrypto = {
    getRandomValues: t.mock.fn((array: Uint32Array) => {
      getRandomValuesCalled = true;
      for (let i = 0; i < array.length; i++) {
        array[i] = i; // Predictable values for testing
      }
      return array;
    })
  };

  Object.defineProperty(globalThis, 'crypto', {
    value: mockCrypto,
    configurable: true,
    writable: true,
  });

  try {
    const pwd = generateRandomPassword(5);
    assert.equal(getRandomValuesCalled, true);
    assert.equal(mockCrypto.getRandomValues.mock.callCount(), 1);
    // Based on chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    // length is 70.
    // i=0 -> chars[0] = 'a'
    // i=1 -> chars[1] = 'b'
    // i=2 -> chars[2] = 'c'
    // i=3 -> chars[3] = 'd'
    // i=4 -> chars[4] = 'e'
    assert.equal(pwd, 'abcde');
  } finally {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  }
});

test('generateRandomPassword falls back to Math.random when Web Crypto API is unavailable', (t) => {
  const originalCrypto = globalThis.crypto;

  Object.defineProperty(globalThis, 'crypto', {
    value: undefined,
    configurable: true,
    writable: true,
  });

  const originalMathRandom = Math.random;
  let mathRandomCalled = false;
  Math.random = t.mock.fn(() => {
    mathRandomCalled = true;
    return 0.5; // Always return middle of range
  });

  try {
    const pwd = generateRandomPassword(4);
    assert.equal(mathRandomCalled, true);
    // if random is 0.5, 0.5 * 70 = 35 -> floor is 35
    // chars[35] = 'J' (a-z is 26, A-Z starts at 26. 26 + 9 = 35 -> 'J')
    assert.equal(pwd, 'JJJJ');
  } finally {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
    Math.random = originalMathRandom;
  }
});

test('in-memory profile name filtering works case-insensitively', () => {
  const profiles = [
    { id: '1', name: 'Alice Smith', voicePart: 'S1', globalStatus: 'Active' },
    { id: '2', name: 'Bob Johnson', voicePart: 'B1', globalStatus: 'Active' },
    { id: '3', name: 'Charlie Miller', voicePart: 'T1', globalStatus: 'Inactive' }
  ];

  const filterName = <T extends { name: string }>(list: T[], query: string): T[] => {
    return list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  };

  const match1 = filterName(profiles, 'alice');
  assert.equal(match1.length, 1);
  assert.equal(match1[0].id, '1');

  const match2 = filterName(profiles, 'JOHN');
  assert.equal(match2.length, 1);
  assert.equal(match2[0].id, '2');

  const match3 = filterName(profiles, 'mi');
  assert.equal(match3.length, 2);
});

test('profileService.getActiveProfiles deduplicates concurrent in-flight requests', async (t) => {
  const { profileService } = await import('../src/services/profileService.ts');
  const originalCollection = pb.collection;

  let callCount = 0;
  let resolveFirst: (value: unknown) => void = () => {};
  const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });

  const mockGetFullList = t.mock.fn(async () => {
    callCount++;
    if (callCount === 1) {
      await firstPromise;
    }
    return [{ id: 'p1', name: 'Alice', globalStatus: 'Active', voicePart: 'S1' }];
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getFullList: mockGetFullList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const call1 = profileService.getActiveProfiles();
    const call2 = profileService.getActiveProfiles();

    await new Promise(r => setTimeout(r, 10));
    assert.equal(callCount, 1);

    resolveFirst({} as never);
    const [result1, result2] = await Promise.all([call1, call2]);

    assert.equal(result1.length, 1);
    assert.equal(result2.length, 1);
    assert.equal(callCount, 1);

    const result3 = await profileService.getActiveProfiles();
    assert.equal(callCount, 2);
    assert.equal(result3.length, 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('profileService.getMyProfile queries using parameterized pb.filter', async (t) => {
  const originalCollection = pb.collection;
  const originalAuthStore = pb.authStore;

  const mockGetFirstListItem = t.mock.fn(async () => {
    return { id: 'profile123', user: 'user123' };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  // Mock pb.authStore.model
  pb.authStore = {
    ...originalAuthStore,
    model: { id: 'user123' }
  } as typeof originalAuthStore;

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    const result = await profileService.getMyProfile();

    assert.equal(result.id, 'profile123');
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
    
    const callArgs = mockGetFirstListItem.mock.calls[0].arguments as unknown[];
    // Parameterized filter should be expanded to "user = 'user123'" by pb.filter
    assert.equal(callArgs[0], "user = 'user123'");
  } finally {
    pb.collection = originalCollection;
    pb.authStore = originalAuthStore;
  }
});

test('profileService.updateProfile leaves photo file field untouched', async (t) => {
  const originalCollection = pb.collection;

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: 'user123', photo: 'existing.jpg' };
  });

  const mockUpdate = t.mock.fn(async (id: string, payload: Record<string, unknown>) => {
    return { id, ...payload };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return {
        getOne: mockGetOne,
        update: mockUpdate,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    
    await profileService.updateProfile('profile123', { name: 'New Name' });
    assert.equal(mockUpdate.mock.callCount(), 1);
    let payload = mockUpdate.mock.calls[0].arguments[1];
    assert.equal('photo' in payload, false);

    await profileService.updateProfile('profile123', { name: 'New Name', photo: 'new_photo.jpg' });
    assert.equal(mockUpdate.mock.callCount(), 2);
    payload = mockUpdate.mock.calls[1].arguments[1];
    assert.equal('photo' in payload, false);

    await profileService.updateProfile('profile123', { name: 'New Name', photo: '' });
    assert.equal(mockUpdate.mock.callCount(), 3);
    payload = mockUpdate.mock.calls[2].arguments[1];
    assert.equal('photo' in payload, false);
  } finally {
    pb.collection = originalCollection;
  }
});

test('deleteProfilePhoto calls pocketbase with photo set to null', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string, payload: Record<string, unknown>) => {
    return { id, ...payload };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { update: mockUpdate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await deleteProfilePhoto('profile123');
    assert.equal(result.photo, null);
    assert.equal(mockUpdate.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.calls[0].arguments[0], 'profile123');
    assert.deepEqual(mockUpdate.mock.calls[0].arguments[1], { photo: null });
  } finally {
    pb.collection = originalCollection;
  }
});

test('profileService.updateProfile deletes user login when email is empty', async (t) => {
  const originalCollection = pb.collection;

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: 'user123' };
  });

  const mockDeleteUser = t.mock.fn(async () => {
    return true;
  });

  const mockUpdateProfile = t.mock.fn(async (id: string, payload: Record<string, unknown>) => {
    return { id, ...payload };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return {
        getOne: mockGetOne,
        update: mockUpdateProfile,
      } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return {
        delete: mockDeleteUser,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    
    await profileService.updateProfile('profile123', { name: 'John Doe', email: '' });
    
    assert.equal(mockGetOne.mock.callCount(), 1);
    assert.equal(mockDeleteUser.mock.callCount(), 1);
    const deleteArgs = mockDeleteUser.mock.calls[0].arguments as unknown[];
    assert.equal(deleteArgs[0], 'user123');
    
    assert.equal(mockUpdateProfile.mock.callCount(), 1);
    const updatePayload = mockUpdateProfile.mock.calls[0].arguments[1] as Record<string, unknown>;
    assert.equal(updatePayload.user, null);
  } finally {
    pb.collection = originalCollection;
  }
});

const baseProfileFixture = {
  id: 'profile1',
  collectionId: 'profiles',
  collectionName: 'profiles',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  user: 'user1',
  name: 'Jane Singer',
  phone: '555-0100',
  photo: '',
  voicePart: 'S1',
  globalStatus: 'Active',
  notes: '',
} satisfies Profile;

test('getProfileEmail returns expanded user email', () => {
  const profile = {
    ...baseProfileFixture,
    expand: {
      user: {
        id: 'user1',
        collectionId: 'users',
        collectionName: 'users',
        created: '2026-01-01 00:00:00.000Z',
        updated: '2026-01-01 00:00:00.000Z',
        email: 'jane@example.org',
        name: 'Jane Singer',
        role: 'singer',
      },
    },
  } satisfies Profile;

  assert.equal(getProfileEmail(profile), 'jane@example.org');
});

test('getProfileEmail returns empty string without expanded user', () => {
  assert.equal(getProfileEmail(baseProfileFixture), '');
});

test('exportToCSV includes expanded user email and never undefined', () => {
  const csv = exportToCSV([
    {
      ...baseProfileFixture,
      expand: {
        user: {
          id: 'user1',
          collectionId: 'users',
          collectionName: 'users',
          created: '2026-01-01 00:00:00.000Z',
          updated: '2026-01-01 00:00:00.000Z',
          email: 'jane@example.org',
          name: 'Jane Singer',
          role: 'singer',
        },
      },
    },
    {
      ...baseProfileFixture,
      id: 'profile2',
      user: '',
      name: 'No Login Singer',
    },
  ]);

  assert.match(csv, /jane@example\.org/);
  assert.doesNotMatch(csv, /undefined/);
});

test('profileService.createProfile with blank email does not create a users record and creates a profiles record with no linked user', async (t) => {
  const originalCollection = pb.collection;

  const mockCreateUser = t.mock.fn(async (payload: Record<string, unknown>) => {
    return { id: 'user123', ...payload };
  });

  const mockCreateProfile = t.mock.fn(async (payload: Record<string, unknown>) => {
    return { id: 'profile123', ...payload };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return {
        create: mockCreateProfile,
      } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return {
        create: mockCreateUser,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    
    const result = await profileService.createProfile({ name: 'No Email Singer', email: '' });
    
    assert.equal(mockCreateUser.mock.callCount(), 0);
    assert.equal(mockCreateProfile.mock.callCount(), 1);
    const createPayload = mockCreateProfile.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.equal(createPayload.user, undefined);
    assert.equal(result.name, 'No Email Singer');
  } finally {
    pb.collection = originalCollection;
  }
});

test('getProfileEmail returns empty string when user is null', () => {
  const profile = {
    ...baseProfileFixture,
    user: null,
    expand: {},
  } as unknown as Profile;

  assert.equal(getProfileEmail(profile), '');
});

test('email validation regex matches standard emails and rejects invalid ones', () => {
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  assert.equal(isValidEmail('test@example.com'), true);
  assert.equal(isValidEmail('user.name+tag@domain.co.uk'), true);
  assert.equal(isValidEmail('plainaddress'), false);
  assert.equal(isValidEmail('@missingusername.com'), false);
  assert.equal(isValidEmail('username@.missingdomain'), false);
});

test('profileService.updateProfile clear email - save-order sequence', async (t) => {
  const originalCollection = pb.collection;
  const callOrder: string[] = [];

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: 'user123' };
  });

  const mockUpdateProfile = t.mock.fn(async (id: string, payload: Record<string, unknown>) => {
    callOrder.push('profiles.update');
    return { id, ...payload };
  });

  const mockDeleteUser = t.mock.fn(async () => {
    callOrder.push('users.delete');
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getOne: mockGetOne, update: mockUpdateProfile } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return { delete: mockDeleteUser } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    const updated = await profileService.updateProfile('profile123', { name: 'John Doe', email: '' });

    assert.deepEqual(callOrder, ['profiles.update', 'users.delete']);
    assert.equal(updated.user, null);
  } finally {
    pb.collection = originalCollection;
  }
});

test('profileService.updateProfile clear email - profile update fails (no user delete)', async (t) => {
  const originalCollection = pb.collection;
  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: 'user123' };
  });

  const mockUpdateProfile = t.mock.fn(async () => {
    throw new Error('Database Error');
  });

  const mockDeleteUser = t.mock.fn(async () => {
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getOne: mockGetOne, update: mockUpdateProfile } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return { delete: mockDeleteUser } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    await assert.rejects(
      profileService.updateProfile('profile123', { name: 'John Doe', email: '' }),
      /Database Error/
    );
    assert.equal(mockDeleteUser.mock.callCount(), 0);
  } finally {
    pb.collection = originalCollection;
  }
});

test('profileService.updateProfile singer without login -> add email succeeds', async (t) => {
  const originalCollection = pb.collection;
  const callOrder: string[] = [];

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: '' };
  });

  const mockCreateUser = t.mock.fn(async (payload: Record<string, unknown>) => {
    callOrder.push('users.create');
    return { id: 'new_user_id', ...payload };
  });

  const mockRequestPasswordReset = t.mock.fn(async () => {
    callOrder.push('users.requestPasswordReset');
    return true;
  });

  const mockUpdateProfile = t.mock.fn(async (id: string, payload: Record<string, unknown>) => {
    callOrder.push('profiles.update');
    return { id, ...payload };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getOne: mockGetOne, update: mockUpdateProfile } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return {
        create: mockCreateUser,
        requestPasswordReset: mockRequestPasswordReset,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    const updated = await profileService.updateProfile('profile123', { name: 'John Doe', email: 'new@example.com' });

    assert.deepEqual(callOrder, ['users.create', 'users.requestPasswordReset', 'profiles.update']);
    assert.equal(updated.user, 'new_user_id');
  } finally {
    pb.collection = originalCollection;
  }
});

test('profileService.updateProfile singer without login -> add email -> password reset fails (user rolled back)', async (t) => {
  const originalCollection = pb.collection;
  const callOrder: string[] = [];

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: '' };
  });

  const mockCreateUser = t.mock.fn(async (payload: Record<string, unknown>) => {
    callOrder.push('users.create');
    return { id: 'new_user_id', ...payload };
  });

  const mockRequestPasswordReset = t.mock.fn(async () => {
    throw new Error('SMTP Error');
  });

  const mockDeleteUser = t.mock.fn(async (id: string) => {
    callOrder.push(`users.delete:${id}`);
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getOne: mockGetOne } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return {
        create: mockCreateUser,
        requestPasswordReset: mockRequestPasswordReset,
        delete: mockDeleteUser,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    await assert.rejects(
      profileService.updateProfile('profile123', { name: 'John Doe', email: 'new@example.com' }),
      /SMTP Error/
    );
    assert.deepEqual(callOrder, ['users.create', 'users.delete:new_user_id']);
  } finally {
    pb.collection = originalCollection;
  }
});

test('profileService.updateProfile singer without login -> add email -> profile update fails (user rolled back)', async (t) => {
  const originalCollection = pb.collection;
  const callOrder: string[] = [];

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'John Doe', user: '' };
  });

  const mockCreateUser = t.mock.fn(async (payload: Record<string, unknown>) => {
    callOrder.push('users.create');
    return { id: 'new_user_id', ...payload };
  });

  const mockRequestPasswordReset = t.mock.fn(async () => {
    callOrder.push('users.requestPasswordReset');
    return true;
  });

  const mockUpdateProfile = t.mock.fn(async () => {
    throw new Error('Database Write Lock');
  });

  const mockDeleteUser = t.mock.fn(async (id: string) => {
    callOrder.push(`users.delete:${id}`);
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { getOne: mockGetOne, update: mockUpdateProfile } as unknown as CollectionMock;
    }
    if (name === 'users') {
      return {
        create: mockCreateUser,
        requestPasswordReset: mockRequestPasswordReset,
        delete: mockDeleteUser,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { profileService } = await import('../src/services/profileService.ts');
    await assert.rejects(
      profileService.updateProfile('profile123', { name: 'John Doe', email: 'new@example.com' }),
      /Database Write Lock/
    );
    assert.deepEqual(callOrder, ['users.create', 'users.requestPasswordReset', 'users.delete:new_user_id']);
  } finally {
    pb.collection = originalCollection;
  }
});


