import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pb } from '../src/lib/pocketbase.ts';
import { rosterService, type EventRoster } from '../src/services/rosterService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('updateAttendance returns the saved roster when PocketBase reports a post-commit 400', async (t) => {
  const originalCollection = pb.collection;
  const error = Object.assign(new Error('Failed to update record.'), { status: 400 });
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

test('bulkUpsertAttendance queries existing records once and runs updates/creates in chunks', async (t) => {
  const originalCollection = pb.collection;
  const getFullList = t.mock.fn(async () => [
    { id: 'roster_1', profile: 'profile_1', attendance: 'Pending' }
  ]);
  const update = t.mock.fn(async (id: string, data: { attendance: 'Present' | 'Absent' | 'Pending' }) => ({
    id,
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: data.attendance,
    seatId: '',
    folderNumber: '',
    folderReturned: false,
  }));
  const create = t.mock.fn(async (data: { profile: string; attendance: 'Present' | 'Absent' | 'Pending' }) => ({
    id: 'roster_2',
    event: 'event_1',
    profile: data.profile,
    rsvp: 'Pending',
    attendance: data.attendance,
    seatId: '',
    folderNumber: '',
    folderReturned: false,
  }));

  pb.collection = function (name: string) {
    if (name === 'eventRosters') {
      return { getFullList, update, create } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

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

    assert.equal(getFullList.mock.callCount(), 1);
    assert.equal(update.mock.callCount(), 1);
    assert.equal(create.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
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
  const source = readFileSync(new URL('../src/views/admin/EventRosterView.tsx', import.meta.url), 'utf8');

  assert.match(
    source,
    /const eligibleSingers = sortedSingers\.filter\(singer => singer\.rsvp !== nextRsvp\)/,
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

test('updateRSVP deletes record if set to Pending and no other important data exists', async (t) => {
  const originalCollection = pb.collection;
  const getFirstListItem = t.mock.fn(async () => ({
    id: 'roster_1',
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Yes',
    attendance: 'Pending',
    folderNumber: '',
    folderReturned: false,
    seatId: '',
  }));
  const deleteMock = t.mock.fn(async () => {});
  const update = t.mock.fn(async () => {
    throw new Error('Should not update');
  });

  pb.collection = function (name: string) {
    if (name === 'eventRosters') {
      return { getFirstListItem, delete: deleteMock, update } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await rosterService.updateRSVP('event_1', 'profile_1', 'Pending');
    assert.equal(result.rsvp, 'Pending');
    assert.equal(getFirstListItem.mock.callCount(), 1);
    assert.equal(deleteMock.mock.callCount(), 1);
    assert.equal(update.mock.callCount(), 0);
  } finally {
    pb.collection = originalCollection;
  }
});

test('updateRSVP updates record (does not delete) if set to Pending but other important data exists', async (t) => {
  const originalCollection = pb.collection;
  const getFirstListItem = t.mock.fn(async () => ({
    id: 'roster_1',
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Yes',
    attendance: 'Present',
    folderNumber: '',
    folderReturned: false,
    seatId: '',
  }));
  const deleteMock = t.mock.fn(async () => {
    throw new Error('Should not delete');
  });
  const update = t.mock.fn(async (id: string, data: Partial<EventRoster>) => ({
    id,
    event: 'event_1',
    profile: 'profile_1',
    rsvp: data.rsvp,
    attendance: 'Present',
    folderNumber: '',
    folderReturned: false,
    seatId: '',
  }));

  pb.collection = function (name: string) {
    if (name === 'eventRosters') {
      return { getFirstListItem, delete: deleteMock, update } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await rosterService.updateRSVP('event_1', 'profile_1', 'Pending');
    assert.equal(result.rsvp, 'Pending');
    assert.equal(getFirstListItem.mock.callCount(), 1);
    assert.equal(deleteMock.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('updateRSVP updates record normally if set to Yes or No', async (t) => {
  const originalCollection = pb.collection;
  const getFirstListItem = t.mock.fn(async () => ({
    id: 'roster_1',
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: 'Pending',
    folderNumber: '',
    folderReturned: false,
    seatId: '',
  }));
  const deleteMock = t.mock.fn(async () => {
    throw new Error('Should not delete');
  });
  const update = t.mock.fn(async (id: string, data: Partial<EventRoster>) => ({
    id,
    event: 'event_1',
    profile: 'profile_1',
    rsvp: data.rsvp,
    attendance: 'Pending',
    folderNumber: '',
    folderReturned: false,
    seatId: '',
  }));

  pb.collection = function (name: string) {
    if (name === 'eventRosters') {
      return { getFirstListItem, delete: deleteMock, update } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await rosterService.updateRSVP('event_1', 'profile_1', 'Yes');
    assert.equal(result.rsvp, 'Yes');
    assert.equal(getFirstListItem.mock.callCount(), 1);
    assert.equal(deleteMock.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});
