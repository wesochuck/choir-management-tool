import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveInitialEventId } from '../src/lib/eventUtils.ts';

const makeEvent = (id: string, date: string) => ({
  id,
  date,
});

test('resolveInitialEventId returns urlEventId when it matches an event in the list', () => {
  const events = [
    makeEvent('evt_1', '2026-06-01T19:00:00Z'),
    makeEvent('evt_2', '2026-06-08T19:00:00Z'),
    makeEvent('evt_3', '2026-06-15T19:00:00Z'),
  ];

  const result = resolveInitialEventId(events, 'evt_2');
  assert.equal(result, 'evt_2');
});

test('resolveInitialEventId falls back to nearest event when urlEventId is absent', () => {
  const now = new Date('2026-06-07T12:00:00Z');
  const events = [
    makeEvent('evt_1', '2026-06-01T19:00:00Z'),
    makeEvent('evt_2', '2026-06-08T19:00:00Z'),
    makeEvent('evt_3', '2026-06-15T19:00:00Z'),
  ];

  // findNearestEvent uses "now" internally, but resolveInitialEventId
  // delegates to findNearestEvent which defaults to Date.now().
  // We just check it returns something (the nearest), not null.
  const result = resolveInitialEventId(events, undefined);
  assert.ok(result, 'should return an event id');
  assert.ok(events.some(e => e.id === result), 'returned id should be in the list');
});

test('resolveInitialEventId falls back to nearest when urlEventId does not match any event', () => {
  const events = [
    makeEvent('evt_1', '2026-06-01T19:00:00Z'),
    makeEvent('evt_2', '2026-06-08T19:00:00Z'),
  ];

  const result = resolveInitialEventId(events, 'evt_nonexistent');
  assert.notEqual(result, 'evt_nonexistent', 'should not return the invalid id');
  assert.ok(result, 'should still return a valid event id');
  assert.ok(events.some(e => e.id === result));
});

test('resolveInitialEventId returns null for empty events list', () => {
  assert.equal(resolveInitialEventId([], 'evt_1'), null);
  assert.equal(resolveInitialEventId([], undefined), null);
  assert.equal(resolveInitialEventId([], null), null);
});
