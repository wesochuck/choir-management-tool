import test from 'node:test';
import assert from 'node:assert/strict';
import { findNearestEvent } from '../src/lib/eventUtils.ts';

test('findNearestEvent returns null when events is empty', () => {
  const result = findNearestEvent([]);
  assert.equal(result, null);
});

test('findNearestEvent returns the only event when array has one event', () => {
  const events = [{ id: '1', date: '2026-05-20T12:00:00Z' }];
  const relativeTo = new Date('2026-05-19T12:00:00Z');
  const result = findNearestEvent(events, relativeTo);
  assert.deepEqual(result, events[0]);
});

test('findNearestEvent returns the closest future event', () => {
  const events = [
    { id: '1', date: '2026-05-18T12:00:00Z' },
    { id: '2', date: '2026-05-22T12:00:00Z' },
    { id: '3', date: '2026-05-25T12:00:00Z' }
  ];
  const relativeTo = new Date('2026-05-20T12:00:00Z'); // May 20 is closer to May 22 (2 days) than May 18 (2 days) - wait, absolute difference is same.
  // Let's use specific dates:
  // May 18 is 2 days in the past
  // May 21 is 1 day in the future
  // May 25 is 5 days in the future
  const result = findNearestEvent(events, new Date('2026-05-20T12:00:00Z'));
  // May 20 to May 18: 2 days (48 hrs)
  // May 20 to May 22: 2 days (48 hrs)
  // Let's make one clearly closer
  const result2 = findNearestEvent([
    { id: 'past', date: '2026-05-15T12:00:00Z' }, // 5 days past
    { id: 'future_close', date: '2026-05-21T12:00:00Z' }, // 1 day future
    { id: 'future_far', date: '2026-05-28T12:00:00Z' } // 8 days future
  ], new Date('2026-05-20T12:00:00Z'));
  assert.equal(result2?.id, 'future_close');
});

test('findNearestEvent returns the closest past event if it is closer than future events', () => {
  const events = [
    { id: 'past_close', date: '2026-05-19T12:00:00Z' }, // 1 day past
    { id: 'future_far', date: '2026-05-25T12:00:00Z' } // 5 days future
  ];
  const result = findNearestEvent(events, new Date('2026-05-20T12:00:00Z'));
  assert.equal(result?.id, 'past_close');
});
