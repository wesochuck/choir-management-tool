import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProfilesByRsvpYes, type ProfileWithStatus, type RsvpRecord } from '../src/lib/seatingSync.ts';

test('filterProfilesByRsvpYes includes only Active (Current) profiles who RSVPd Yes', () => {
  const profiles: ProfileWithStatus[] = [
    { id: 'p1', name: 'Singer A', globalStatus: 'Active (Current)' },
    { id: 'p2', name: 'Singer B', globalStatus: 'Active (Current)' },
    { id: 'p3', name: 'Singer C', globalStatus: 'Active (Future)' },
    { id: 'p4', name: 'Singer D', globalStatus: 'Active (Current)' },
    { id: 'p5', name: 'Singer E', globalStatus: 'Inactive' },
  ];

  const roster: RsvpRecord[] = [
    { profile: 'p1', rsvp: 'Yes' },
    { profile: 'p2', rsvp: 'No' },
    { profile: 'p3', rsvp: 'Yes' }, // Attending, but Active (Future) should be filtered out
    { profile: 'p4', rsvp: 'Pending' },
  ];

  const result = filterProfilesByRsvpYes(profiles, roster);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'p1');
});
