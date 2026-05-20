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

