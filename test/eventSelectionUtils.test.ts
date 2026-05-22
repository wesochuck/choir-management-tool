import test from 'node:test';
import assert from 'node:assert/strict';
import { findNearestEvent, resolveInitialEventId } from '../src/lib/eventUtils.ts';

test('findNearestEvent filters out past events when futureOnly is true', () => {
  const events = [
    { id: 'past', date: '2026-05-15T12:00:00Z', type: 'Performance' },
    { id: 'future', date: '2026-05-25T12:00:00Z', type: 'Performance' }
  ];
  const relativeTo = new Date('2026-05-20T12:00:00Z');
  
  const result = findNearestEvent(events, { relativeTo, futureOnly: true });
  assert.equal(result?.id, 'future');
});

test('findNearestEvent isolates records matching type: Performance', () => {
  const events = [
    { id: 'rehearsal_close', date: '2026-05-21T12:00:00Z', type: 'Rehearsal' },
    { id: 'perf_far', date: '2026-05-25T12:00:00Z', type: 'Performance' }
  ];
  const relativeTo = new Date('2026-05-20T12:00:00Z');

  const result = findNearestEvent(events, { relativeTo, type: 'Performance' });
  assert.equal(result?.id, 'perf_far');
});

test('fallback path returns absolute closest event if no upcoming future performance exists', () => {
  // relativeTo: May 20
  // Strict check: futureOnly: true, type: 'Performance'
  // Events: past performance, past rehearsal, future rehearsal
  // No future performances exist.
  // Fallback path should fall back to relativeTo search on all events.
  const events = [
    { id: 'past_perf', date: '2026-05-19T12:00:00Z', type: 'Performance' }, // 1 day past
    { id: 'future_rehearsal', date: '2026-05-25T12:00:00Z', type: 'Rehearsal' } // 5 days future
  ];
  const relativeTo = new Date('2026-05-20T12:00:00Z');

  const result = findNearestEvent(events, { relativeTo, futureOnly: true, type: 'Performance' });
  // Closest to relativeTo is 'past_perf' (1 day diff vs 5 days diff)
  assert.equal(result?.id, 'past_perf');
});

test('resolveInitialEventId extracts/prefers URL variable successfully', () => {
  const events = [
    { id: 'url_event', date: '2026-05-25T12:00:00Z', type: 'Performance' },
    { id: 'nearest_event', date: '2026-05-21T12:00:00Z', type: 'Performance' }
  ];
  
  // URL variable matching an event ID should be returned immediately
  const result = resolveInitialEventId(events, 'url_event');
  assert.equal(result, 'url_event');

  // If URL variable does not match any event ID, fallback to nearest
  const resultFallback = resolveInitialEventId(events, 'invalid_id', {
    relativeTo: new Date('2026-05-20T12:00:00Z')
  });
  assert.equal(resultFallback, 'nearest_event');
});
