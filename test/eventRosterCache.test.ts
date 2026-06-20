import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertRosterRow, removeRosterRow } from '../src/lib/eventRosterCache';
import type { EventRoster } from '../src/services/rosterService';

function makeRoster(overrides: Partial<EventRoster> = {}): EventRoster {
  return {
    id: 'roster_1',
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: 'Pending',
    seatId: '',
    folderNumber: '',
    folderReturned: false,
    rsvpNote: '',
    collectionId: '',
    collectionName: 'eventRosters',
    created: '',
    updated: '',
    ...overrides,
  };
}

test('upsertRosterRow - inserts into undefined rows', () => {
  const roster = makeRoster({ attendance: 'Present' });
  const result = upsertRosterRow(undefined, roster);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'roster_1');
  assert.equal(result[0].attendance, 'Present');
});

test('upsertRosterRow - inserts into empty array', () => {
  const roster = makeRoster({ attendance: 'Present' });
  const result = upsertRosterRow([], roster);
  assert.equal(result.length, 1);
  assert.equal(result[0].attendance, 'Present');
});

test('upsertRosterRow - replaces existing row by same id', () => {
  const existing = makeRoster({ attendance: 'Pending' });
  const updated = makeRoster({ id: 'roster_1', attendance: 'Present' });
  const result = upsertRosterRow([existing], updated);
  assert.equal(result.length, 1);
  assert.equal(result[0].attendance, 'Present');
});

test('upsertRosterRow - replaces optimistic row by same profile', () => {
  const optimistic = makeRoster({ id: 'optimistic_event_1_profile_1', attendance: 'Present' });
  const saved = makeRoster({ id: 'roster_real_1', profile: 'profile_1', attendance: 'Present' });
  const result = upsertRosterRow([optimistic], saved);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'roster_real_1');
});

test('upsertRosterRow - keeps unrelated rows', () => {
  const existing = makeRoster({ id: 'roster_2', profile: 'profile_2', attendance: 'Absent' });
  const updated = makeRoster({ id: 'roster_1', profile: 'profile_1', attendance: 'Present' });
  const result = upsertRosterRow([existing], updated);
  assert.equal(result.length, 2);
});

test('removeRosterRow - returns empty from undefined', () => {
  const roster = makeRoster();
  const result = removeRosterRow(undefined, roster);
  assert.equal(result.length, 0);
});

test('removeRosterRow - removes by same id', () => {
  const roster = makeRoster({ id: 'roster_1' });
  const result = removeRosterRow([roster], roster);
  assert.equal(result.length, 0);
});

test('removeRosterRow - removes by same profile', () => {
  const optimistic = makeRoster({ id: 'optimistic_1', profile: 'profile_1' });
  const serverRoster = makeRoster({ id: 'real_1', profile: 'profile_1' });
  const result = removeRosterRow([optimistic], serverRoster);
  assert.equal(result.length, 0);
});

test('removeRosterRow - keeps unrelated rows', () => {
  const keep = makeRoster({ id: 'roster_2', profile: 'profile_2' });
  const remove = makeRoster({ id: 'roster_1', profile: 'profile_1' });
  const result = removeRosterRow([keep, remove], remove);
  assert.equal(result.length, 1);
  assert.equal(result[0].profile, 'profile_2');
});
