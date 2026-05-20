import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { rosterService } from '../src/services/rosterService.ts';

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
      return { update, getOne } as any;
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
  const update = t.mock.fn(async (id: string, data: any) => ({
    id,
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: data.attendance,
    seatId: '',
    folderNumber: '',
    folderReturned: false,
  }));
  const create = t.mock.fn(async (data: any) => ({
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
      return { getFullList, update, create } as any;
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


