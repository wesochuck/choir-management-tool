import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { getVoiceParts, saveVoiceParts } from '../src/services/settingsService.ts';

test('getVoiceParts fetches voice parts from settings', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { voiceParts: [{ label: 'S1', fullName: 'Soprano 1' }] };
  });

  pb.collection = function (name: string) {
    if (name === 'app_settings') {
      return { getFirstListItem: mockGetFirstListItem } as any;
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

test('saveVoiceParts updates settings if present', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string, data: any) => {
    return { id, ...data };
  });
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { id: 'settings_1', voiceParts: [] };
  });

  pb.collection = function (name: string) {
    if (name === 'app_settings') {
      return { 
        getFirstListItem: mockGetFirstListItem,
        update: mockUpdate
      } as any;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await saveVoiceParts([{ label: 'T2', fullName: 'Tenor 2' }]);
    assert.equal(result.id, 'settings_1');
    assert.deepEqual(result.voiceParts, [{ label: 'T2', fullName: 'Tenor 2' }]);
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getCommunicationSettings and saveCommunicationSettings processes automatic email fields', async (t) => {
  const { settingsService } = await import('../src/services/settingsService.ts');
  const originalCollection = pb.collection;
  let savedPayload: any = null;

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

  const mockUpdate = t.mock.fn(async (id: string, data: any) => {
    savedPayload = data;
    return { id, ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return {
        getFirstListItem: mockGetFirstListItem,
        update: mockUpdate
      } as any;
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
    
    const result = await settingsService.saveCommunicationSettings(testPayload);
    assert.deepEqual(savedPayload.value.reminderHoursBefore, 12);
    assert.deepEqual(savedPayload.value.reportEnabled, true);
  } finally {
    pb.collection = originalCollection;
  }
});

