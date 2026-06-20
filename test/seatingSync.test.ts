import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProfilesByRsvpYes,
  type RsvpRecord,
  seatingContextKey,
  seatingContextId,
  shouldApplySeatingResponse,
  type SeatingSyncContext,
} from '../src/lib/seatingSync.ts';

test('seatingContextKey generates correct key', () => {
  assert.equal(seatingContextKey('perf1', 'venue1'), 'perf1-venue1');
  assert.equal(seatingContextKey('', 'venue1'), 'none-venue1');
  assert.equal(seatingContextKey('perf1', ''), 'perf1-none');
  assert.equal(seatingContextKey('', ''), 'none-none');
});

test('seatingContextId generates correct ID', () => {
  const context: SeatingSyncContext = { performanceId: 'perf1', venueId: 'venue1', sessionId: 123 };
  assert.equal(seatingContextId(context), 'perf1-venue1-123');

  const contextEmpty: SeatingSyncContext = { performanceId: '', venueId: '', sessionId: 456 };
  assert.equal(seatingContextId(contextEmpty), 'none-none-456');
});

test('shouldApplySeatingResponse returns true for matching contexts', () => {
  const reqContext: SeatingSyncContext = { performanceId: 'perf1', venueId: 'venue1', sessionId: 123 };
  const currContext: SeatingSyncContext = { performanceId: 'perf1', venueId: 'venue1', sessionId: 123 };
  assert.equal(shouldApplySeatingResponse(reqContext, currContext), true);
});

test('shouldApplySeatingResponse returns false for non-matching contexts', () => {
  const reqContext: SeatingSyncContext = { performanceId: 'perf1', venueId: 'venue1', sessionId: 123 };

  assert.equal(shouldApplySeatingResponse(reqContext, { ...reqContext, sessionId: 456 }), false);
  assert.equal(shouldApplySeatingResponse(reqContext, { ...reqContext, performanceId: 'perf2' }), false);
  assert.equal(shouldApplySeatingResponse(reqContext, { ...reqContext, venueId: 'venue2' }), false);
});

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
