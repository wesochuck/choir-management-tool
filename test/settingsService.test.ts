import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { getVoiceParts, saveVoiceParts } from '../src/services/settingsService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;
type SavedPayload = { value: Record<string, unknown> };

test('getVoiceParts fetches voice parts from settings', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { key: 'voiceParts', value: { voiceParts: [{ label: 'S1', fullName: 'Soprano 1' }] } };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parts = await getVoiceParts();
    assert.equal(parts[0].fullName, 'Soprano 1');
    assert.equal(parts[0].label, 'S1');
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getVoiceParts returns DEFAULT_VOICE_PARTS when settings has empty voiceParts list or database throws', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItemEmpty = t.mock.fn(async () => {
    return { key: 'voiceParts', value: { voiceParts: [] } };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItemEmpty } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parts = await getVoiceParts();
    assert.equal(parts.length, 8);
    assert.equal(parts[0].label, 'S1');
    assert.equal(parts[0].fullName, 'Soprano 1');
    assert.equal(parts[7].label, 'B2');
    assert.equal(parts[7].fullName, 'Bass 2');
    assert.equal(mockGetFirstListItemEmpty.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getVoiceParts returns DEFAULT_VOICE_PARTS when database throws an error', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItemError = t.mock.fn(async () => {
    throw new Error('Database connection failed');
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItemError } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parts = await getVoiceParts();
    assert.equal(parts.length, 8);
    assert.equal(parts[0].label, 'S1');
    assert.equal(parts[0].fullName, 'Soprano 1');
    assert.equal(mockGetFirstListItemError.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});


test('saveVoiceParts updates settings if present', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown>) => {
    return { id, ...data };
  });
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { id: 'settings_1', key: 'voiceParts', value: { voiceParts: [] } };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { 
        getFirstListItem: mockGetFirstListItem,
        update: mockUpdate
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await saveVoiceParts([{ label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' }]);
    assert.equal(result.id, 'settings_1');
    assert.deepEqual(result.value.voiceParts, [{ label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' }]);
    assert.equal(mockGetFirstListItem.mock.callCount(), 2);
    assert.equal(mockUpdate.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getCommunicationSettings and saveCommunicationSettings processes automatic email fields', async (t) => {
  const { settingsService } = await import('../src/services/settingsService.ts');
  const originalCollection = pb.collection;
  const saved = { payload: null as SavedPayload | null };

  const mockGetFirstListItem = t.mock.fn(async () => {
    return {
      key: 'communications',
      value: {
        emailSubject: 'Test subject',
        emailBody: 'Test body',
        smsBody: 'Test sms',
        reminderEnabled: true,
        reminderHoursBefore: 48,
        reminderSubjectTemplate: 'Reminder test: {eventTitle}',
        reminderBodyTemplate: 'Reminder body test',
        reportEnabled: false,
        reportHoursAfter: 6,
        reportSubjectTemplate: 'Report test: {eventTitle}',
        reportBodyTemplate: 'Report body test'
      }
    };
  });

  const mockUpdate = t.mock.fn(async (id: string, data: SavedPayload) => {
    saved.payload = data;
    return { id, ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return {
        getFirstListItem: mockGetFirstListItem,
        update: mockUpdate
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const settings = await settingsService.getCommunicationSettings();
    assert.equal(settings.emailSubject, 'Test subject');
    assert.equal(settings.reminderEnabled, true);
    assert.equal(settings.reminderHoursBefore, 48);
    assert.equal(settings.reportEnabled, false);
    assert.equal(settings.reportHoursAfter, 6);

    const testPayload = {
      ...settings,
      reminderHoursBefore: 12,
      reportEnabled: true
    };
    
    await settingsService.saveCommunicationSettings(testPayload);
    assert.deepEqual(saved.payload?.value.reminderHoursBefore, 12);
    assert.deepEqual(saved.payload?.value.reportEnabled, true);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getRosterSettings deduplicates concurrent in-flight requests', async (t) => {
  const { settingsService } = await import('../src/services/settingsService.ts');
  const originalCollection = pb.collection;

  let callCount = 0;
  let resolveFirst: (value: unknown) => void = () => {};
  const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });

  const mockGetFirstListItem = t.mock.fn(async () => {
    callCount++;
    if (callCount === 1) {
      await firstPromise;
    }
    return {
      key: 'roster',
      value: { defaultStatus: 'Active', defaultSort: 'lastName' }
    };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const call1 = settingsService.getRosterSettings();
    const call2 = settingsService.getRosterSettings();

    // Small delay to ensure both calls are in-flight
    await new Promise(r => setTimeout(r, 10));
    assert.equal(callCount, 1);

    resolveFirst({} as never);
    const [result1, result2] = await Promise.all([call1, call2]);

    assert.equal(result1.defaultStatus, 'Active');
    assert.equal(result2.defaultStatus, 'Active');
    assert.equal(callCount, 1);

    // After resolution, a fresh call should make a new network request
    const result3 = await settingsService.getRosterSettings();
    assert.equal(callCount, 2);
    assert.equal(result3.defaultStatus, 'Active');

  } finally {
    pb.collection = originalCollection;
  }
});

test('getRosterSettings and saveRosterSettings processes roster settings fields', async (t) => {
  const { settingsService } = await import('../src/services/settingsService.ts');
  const originalCollection = pb.collection;
  const saved = { payload: null as SavedPayload | null };

  const mockGetFirstListItem = t.mock.fn(async () => {
    return {
      key: 'roster',
      value: {
        defaultStatus: 'Active',
        defaultSort: 'voicePart',
        defaultRsvpSort: 'voicePart'
      }
    };
  });

  const mockUpdate = t.mock.fn(async (id: string, data: SavedPayload) => {
    saved.payload = data;
    return { id, ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return {
        getFirstListItem: mockGetFirstListItem,
        update: mockUpdate
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const settings = await settingsService.getRosterSettings();
    assert.equal(settings.defaultStatus, 'Active');
    assert.equal(settings.defaultSort, 'voicePart');
    assert.equal(settings.defaultRsvpSort, 'voicePart');

    const testPayload = {
      defaultStatus: 'Inactive',
      defaultSort: 'lastName' as const,
      defaultRsvpSort: 'lastName' as const
    };
    
    await settingsService.saveRosterSettings(testPayload);
    assert.deepEqual(saved.payload?.value.defaultStatus, 'Inactive');
    assert.deepEqual(saved.payload?.value.defaultSort, 'lastName');
    assert.deepEqual(saved.payload?.value.defaultRsvpSort, 'lastName');
  } finally {
    pb.collection = originalCollection;
  }
});
