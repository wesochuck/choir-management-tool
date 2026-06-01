import test from 'node:test';
import assert from 'node:assert/strict';
import { findNearestEvent, resolveInitialEventId, getSetListVisibility } from '../src/lib/eventUtils.ts';

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
  // Let's use specific dates:
  // May 18 is 2 days in the past
  // May 21 is 1 day in the future
  // May 25 is 5 days in the future
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

test('getSetListVisibility: Performance (Concert) with RSVP Yes and setListApproved = true displays set list', () => {
  const concert = {
    id: 'c1',
    type: 'Performance',
    setListApproved: true,
    setList: [{ id: 's1', title: 'Song 1' }]
  };
  const myRosters = {
    c1: { rsvp: 'Yes' }
  };
  
  const result = getSetListVisibility(concert, myRosters, [concert]);
  assert.deepEqual(result, {
    showSetList: true,
    setList: [{ id: 's1', title: 'Song 1' }],
    headerLabel: 'Set List'
  });
});

test('getSetListVisibility: Performance (Concert) with RSVP Yes and setListApproved = false hides set list', () => {
  const concert = {
    id: 'c1',
    type: 'Performance',
    setListApproved: false,
    setList: [{ id: 's1', title: 'Song 1' }]
  };
  const myRosters = {
    c1: { rsvp: 'Yes' }
  };
  
  const result = getSetListVisibility(concert, myRosters, [concert]);
  assert.deepEqual(result, {
    showSetList: false
  });
});

test('getSetListVisibility: Performance (Concert) with RSVP No/Pending and setListApproved = true hides set list', () => {
  const concert = {
    id: 'c1',
    type: 'Performance',
    setListApproved: true,
    setList: [{ id: 's1', title: 'Song 1' }]
  };
  
  assert.deepEqual(getSetListVisibility(concert, { c1: { rsvp: 'No' } }, [concert]), { showSetList: false });
  assert.deepEqual(getSetListVisibility(concert, { c1: { rsvp: 'Pending' } }, [concert]), { showSetList: false });
  assert.deepEqual(getSetListVisibility(concert, {}, [concert]), { showSetList: false });
});

test('getSetListVisibility: Rehearsal linked to parent with RSVP Yes and setListApproved = true inherits parent set list', () => {
  const concert = {
    id: 'c1',
    title: 'Spring Concert',
    type: 'Performance',
    setListApproved: true,
    setList: [{ id: 's1', title: 'Song 1' }]
  };
  const rehearsal = {
    id: 'r1',
    type: 'Rehearsal',
    parentPerformanceId: 'c1',
    expand: { parentPerformanceId: concert }
  };
  const myRosters = {
    c1: { rsvp: 'Yes' }
  };

  const result = getSetListVisibility(rehearsal, myRosters, [concert, rehearsal]);
  assert.deepEqual(result, {
    showSetList: true,
    setList: [{ id: 's1', title: 'Song 1' }],
    headerLabel: 'Set List for Spring Concert'
  });
});

test('getSetListVisibility: Rehearsal linked to parent with RSVP Yes and setListApproved = false hides set list', () => {
  const concert = {
    id: 'c1',
    title: 'Spring Concert',
    type: 'Performance',
    setListApproved: false,
    setList: [{ id: 's1', title: 'Song 1' }]
  };
  const rehearsal = {
    id: 'r1',
    type: 'Rehearsal',
    parentPerformanceId: 'c1',
    expand: { parentPerformanceId: concert }
  };
  const myRosters = {
    c1: { rsvp: 'Yes' }
  };

  const result = getSetListVisibility(rehearsal, myRosters, [concert, rehearsal]);
  assert.deepEqual(result, {
    showSetList: false
  });
});

test('getSetListVisibility: Rehearsal linked to parent with RSVP No/Pending hides set list', () => {
  const concert = {
    id: 'c1',
    title: 'Spring Concert',
    type: 'Performance',
    setListApproved: true,
    setList: [{ id: 's1', title: 'Song 1' }]
  };
  const rehearsal = {
    id: 'r1',
    type: 'Rehearsal',
    parentPerformanceId: 'c1',
    expand: { parentPerformanceId: concert }
  };

  assert.deepEqual(getSetListVisibility(rehearsal, { c1: { rsvp: 'No' } }, [concert, rehearsal]), { showSetList: false });
  assert.deepEqual(getSetListVisibility(rehearsal, { c1: { rsvp: 'Pending' } }, [concert, rehearsal]), { showSetList: false });
  assert.deepEqual(getSetListVisibility(rehearsal, {}, [concert, rehearsal]), { showSetList: false });
});

test('resolveInitialEventId returns urlEventId when it matches an event', () => {
  const events = [
    { id: 'e1', date: '2026-05-15T12:00:00Z' },
    { id: 'e2', date: '2026-05-20T12:00:00Z' }
  ];
  assert.equal(resolveInitialEventId(events, 'e2'), 'e2');
});

test('resolveInitialEventId falls back to nearest event when urlEventId is not provided', () => {
  const events = [
    { id: 'past', date: '2026-05-15T12:00:00Z' },
    { id: 'nearest', date: '2026-05-21T12:00:00Z' },
    { id: 'future', date: '2026-05-28T12:00:00Z' }
  ];
  const relativeTo = new Date('2026-05-20T12:00:00Z');
  assert.equal(resolveInitialEventId(events, undefined, relativeTo), 'nearest');
});

test('resolveInitialEventId falls back to nearest event when urlEventId is provided but not found', () => {
  const events = [
    { id: 'past', date: '2026-05-15T12:00:00Z' },
    { id: 'nearest', date: '2026-05-21T12:00:00Z' }
  ];
  const relativeTo = new Date('2026-05-20T12:00:00Z');
  assert.equal(resolveInitialEventId(events, 'missing-id', relativeTo), 'nearest');
});

test('resolveInitialEventId returns null when events array is empty', () => {
  assert.equal(resolveInitialEventId([], 'some-id'), null);
  assert.equal(resolveInitialEventId([]), null);
});
