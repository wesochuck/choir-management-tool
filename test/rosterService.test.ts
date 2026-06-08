import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pb } from '../src/lib/pocketbase.ts';
import { rosterService } from '../src/services/rosterService.ts';
import { ClientResponseError } from 'pocketbase';

type CollectionMock = ReturnType<typeof pb.collection>;

test('updateAttendance returns the saved roster when PocketBase reports a post-commit 400', async (t) => {
  const originalCollection = pb.collection;
  const error = new ClientResponseError({ status: 400, message: 'Failed to update record.', data: {} });
  const update = t.mock.fn(async () => {
    throw error;
  });
  const getOne = t.mock.fn(async (id: string) => ({
    id,
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: 'Present',
    seatId: '',
    folderNumber: '',
    folderReturned: false,
  }));

  pb.collection = function (name: string) {
    if (name === 'eventRosters') {
      return { update, getOne } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await rosterService.updateAttendance('roster_1', 'Present');

    assert.equal(result.id, 'roster_1');
    assert.equal(result.attendance, 'Present');
    assert.equal(update.mock.callCount(), 1);
    assert.equal(getOne.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('bulkUpsertAttendance calls custom backend bulk attendance endpoint and returns rosters', async () => {
  const originalSend = pb.send;
  const sendCalls: Array<{ path: string; options: { method?: string; body?: unknown } | undefined }> = [];

  pb.send = (async <T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> => {
    sendCalls.push({ path, options });
    return {
      rosters: [
        {
          id: 'roster_1',
          event: 'event_1',
          profile: 'profile_1',
          rsvp: 'Pending',
          attendance: 'Present',
          seatId: '',
          folderNumber: '',
          folderReturned: false,
        },
        {
          id: 'roster_2',
          event: 'event_1',
          profile: 'profile_2',
          rsvp: 'Pending',
          attendance: 'Absent',
          seatId: '',
          folderNumber: '',
          folderReturned: false,
        }
      ]
    } as unknown as T;
  }) as typeof pb.send;

  try {
    const updates = [
      { profileId: 'profile_1', attendance: 'Present' as const },
      { profileId: 'profile_2', attendance: 'Absent' as const }
    ];
    const results = await rosterService.bulkUpsertAttendance('event_1', updates);

    assert.equal(results.length, 2);
    assert.equal(results[0].id, 'roster_1');
    assert.equal(results[0].attendance, 'Present');
    assert.equal(results[1].id, 'roster_2');
    assert.equal(results[1].attendance, 'Absent');
    assert.equal(sendCalls.length, 1);
    assert.equal(sendCalls[0].path, '/api/admin/bulk-upsert-attendance');
    assert.equal(sendCalls[0].options?.method, 'POST');
    assert.deepEqual(sendCalls[0].options?.body, {
      eventId: 'event_1',
      updates
    });
  } finally {
    pb.send = originalSend;
  }
});

test('bulkUpdateRSVP calls custom backend bulk update endpoint with expected payload', async () => {
  const originalSend = pb.send;
  const sendCalls: Array<{ path: string; options: { method?: string; body?: unknown } | undefined }> = [];

  pb.send = (async <T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> => {
    sendCalls.push({ path, options });
    return { success: true } as unknown as T;
  }) as typeof pb.send;

  const progressCalls: Array<{ current: number; total: number }> = [];
  const onProgress = (current: number, total: number) => {
    progressCalls.push({ current, total });
  };

  try {
    const updates = [
      { profileId: 'profile_1', rsvp: 'Yes' as const },
      { profileId: 'profile_2', rsvp: 'No' as const }
    ];

    const results = await rosterService.bulkUpdateRSVP('event_1', updates, onProgress);

    assert.deepEqual(results, []);
    assert.equal(sendCalls.length, 1);
    assert.equal(sendCalls[0].path, '/api/admin/bulk-update-rsvps');
    assert.equal(sendCalls[0].options?.method, 'POST');
    assert.deepEqual(sendCalls[0].options?.body, {
      eventId: 'event_1',
      updates
    });

    assert.deepEqual(progressCalls, [
      { current: 0, total: 2 },
      { current: 2, total: 2 }
    ]);
  } finally {
    pb.send = originalSend;
  }
});

test('bulkUpdateRSVP handles empty updates array without calling backend API', async () => {
  const originalSend = pb.send;
  const sendCalls: Array<string> = [];

  pb.send = (async <T>(path: string): Promise<T> => {
    sendCalls.push(path);
    return { success: true } as unknown as T;
  }) as typeof pb.send;

  try {
    const results = await rosterService.bulkUpdateRSVP('event_1', []);
    assert.deepEqual(results, []);
    assert.equal(sendCalls.length, 0);
  } finally {
    pb.send = originalSend;
  }
});

test('event roster bulk actions operate on the currently shown singers', () => {
  const source = readFileSync(new URL('../src/views/admin/event-roster/useRsvpBulkActions.ts', import.meta.url), 'utf8');

  assert.match(
    source,
    /const eligibleSingers = sortedSingers\.filter/,
    'bulk RSVP actions should use the filtered and sorted singers currently shown in the table',
  );

  assert.match(
    source,
    /This only affects the singers currently shown after your filters and search\./,
    'bulk confirmation copy should make the scope clear before updating many people',
  );
});

test('getSingerRosters retrieves rosters filtered by profile and with expected expands', async (t) => {
  const originalCollection = pb.collection;
  const getFullList = t.mock.fn(async () => {
    return [
      { id: 'roster_1', profile: 'profile_1', event: 'event_1', expand: { event: { id: 'event_1', title: 'Concert' } } }
    ];
  });

  pb.collection = function (name: string) {
    if (name === 'eventRosters') {
      return { getFullList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await rosterService.getSingerRosters('profile_1');

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'roster_1');
    assert.equal(getFullList.mock.callCount(), 1);

    const firstCall = getFullList.mock.calls[0] as unknown as { arguments: [{ filter: string; expand?: string }] } | undefined;
    const callArgs = firstCall?.arguments?.[0];
    assert.ok(callArgs?.filter.includes('profile_1'));
    assert.equal(callArgs?.expand, 'event,event.venue');
  } finally {
    pb.collection = originalCollection;
  }
});

test('updateMyRSVP deletes record if set to Pending and no other important data exists', async (t) => {
  const originalSend = pb.send;
  const sendMock = t.mock.fn(async (path: string, options?: { method?: string; body?: unknown }) => {
    assert.equal(path, '/api/singer/rsvp');
    assert.deepEqual(options?.body, { eventId: 'event_1', rsvp: 'Pending', rsvpNote: '' });
    return {
      id: '',
      event: 'event_1',
      profile: 'profile_1',
      rsvp: 'Pending',
      attendance: 'Pending',
      folderReturned: false,
    };
  });

  pb.send = sendMock as unknown as typeof pb.send;

  try {
    const result = await rosterService.updateMyRSVP('event_1', 'Pending');
    assert.equal(result.rsvp, 'Pending');
    assert.equal(sendMock.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});

test('updateMyRSVP updates record (does not delete) if set to Pending but other important data exists', async (t) => {
  const originalSend = pb.send;
  const sendMock = t.mock.fn(async (path: string, options?: { method?: string; body?: unknown }) => {
    assert.equal(path, '/api/singer/rsvp');
    assert.deepEqual(options?.body, { eventId: 'event_1', rsvp: 'Pending', rsvpNote: '' });
    return {
      id: 'roster_1',
      event: 'event_1',
      profile: 'profile_1',
      rsvp: 'Pending',
      attendance: 'Present',
      folderReturned: false,
    };
  });

  pb.send = sendMock as unknown as typeof pb.send;

  try {
    const result = await rosterService.updateMyRSVP('event_1', 'Pending');
    assert.equal(result.rsvp, 'Pending');
    assert.equal(sendMock.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});

test('updateMyRSVP updates record normally if set to Yes or No', async (t) => {
  const originalSend = pb.send;
  const sendMock = t.mock.fn(async (path: string, options?: { method?: string; body?: unknown }) => {
    assert.equal(path, '/api/singer/rsvp');
    assert.deepEqual(options?.body, { eventId: 'event_1', rsvp: 'Yes', rsvpNote: '' });
    return {
      id: 'roster_1',
      event: 'event_1',
      profile: 'profile_1',
      rsvp: 'Yes',
      attendance: 'Pending',
      folderReturned: false,
    };
  });

  pb.send = sendMock as unknown as typeof pb.send;

  try {
    const result = await rosterService.updateMyRSVP('event_1', 'Yes');
    assert.equal(result.rsvp, 'Yes');
    assert.equal(sendMock.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});

test('updateMyRSVP clears rsvpNote when RSVP is changed to Yes or Pending', async (t) => {
  const originalSend = pb.send;
  const sendMock = t.mock.fn(async (path: string, options?: { method?: string; body?: unknown }) => {
    assert.equal(path, '/api/singer/rsvp');
    assert.deepEqual(options?.body, { eventId: 'event_1', rsvp: 'Yes', rsvpNote: '' });
    return {
      id: 'roster_1',
      event: 'event_1',
      profile: 'profile_1',
      rsvp: 'Yes',
      rsvpNote: '',
      attendance: 'Pending',
      folderReturned: false,
    };
  });

  pb.send = sendMock as unknown as typeof pb.send;

  try {
    const result = await rosterService.updateMyRSVP('event_1', 'Yes');
    assert.equal(result.rsvp, 'Yes');
    assert.equal(result.rsvpNote, '');
    assert.equal(sendMock.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});

test('updateMyRSVP saves rsvpNote when RSVP is No', async (t) => {
  const originalSend = pb.send;
  const sendMock = t.mock.fn(async (path: string, options?: { method?: string; body?: unknown }) => {
    assert.equal(path, '/api/singer/rsvp');
    assert.deepEqual(options?.body, { eventId: 'event_1', rsvp: 'No', rsvpNote: 'Sickness' });
    return {
      id: 'roster_1',
      event: 'event_1',
      profile: 'profile_1',
      rsvp: 'No',
      rsvpNote: 'Sickness',
      attendance: 'Pending',
      folderReturned: false,
    };
  });

  pb.send = sendMock as unknown as typeof pb.send;

  try {
    const result = await rosterService.updateMyRSVP('event_1', 'No', 'Sickness');
    assert.equal(result.rsvp, 'No');
    assert.equal(result.rsvpNote, 'Sickness');
    assert.equal(sendMock.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});
