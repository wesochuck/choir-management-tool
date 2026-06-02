import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProfilesByRsvpYes, type RsvpRecord } from '../src/lib/seatingSync.ts';

test('filterProfilesByRsvpYes includes only Active profiles who RSVPd Yes', () => {
  const profiles = [
    { id: 'p1', name: 'Singer A', globalStatus: 'Active', voicePart: 'S1' },
    { id: 'p2', name: 'Singer B', globalStatus: 'Active', voicePart: 'S2' },
    { id: 'p3', name: 'Singer C', globalStatus: 'Idle', voicePart: 'A1' },
    { id: 'p4', name: 'Singer D', globalStatus: 'Active', voicePart: 'A2' },
    { id: 'p5', name: 'Singer E', globalStatus: 'Inactive', voicePart: 'T1' },
    { id: 'p6', name: 'Admin No Part', globalStatus: 'Active', voicePart: '' },
  ];

  const roster: RsvpRecord[] = [
    { profile: 'p1', rsvp: 'Yes' },
    { profile: 'p2', rsvp: 'No' },
    { profile: 'p3', rsvp: 'Yes' }, // Attending, but Idle should be filtered out
    { profile: 'p4', rsvp: 'Pending' },
    { profile: 'p6', rsvp: 'Yes' }, // Attending, but no voicePart should be filtered out
  ];

  const result = filterProfilesByRsvpYes(profiles, roster);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'p1');
});
