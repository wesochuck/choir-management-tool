import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttendanceDisplay, getGlobalStatusDisplay, getRsvpDisplay } from '../src/lib/statusDisplay';

test('attendance display maps known statuses', () => {
  assert.deepEqual(getAttendanceDisplay('Present'), { label: 'Present', tone: 'success' });
  assert.deepEqual(getAttendanceDisplay('Absent'), { label: 'Absent', tone: 'danger' });
  assert.deepEqual(getAttendanceDisplay('Pending'), { label: 'Pending', tone: 'muted' });
});

test('rsvp display maps known statuses', () => {
  assert.deepEqual(getRsvpDisplay('Yes'), { label: 'Yes', tone: 'success' });
  assert.deepEqual(getRsvpDisplay('No'), { label: 'No', tone: 'danger' });
  assert.deepEqual(getRsvpDisplay('Pending'), { label: 'Pending', tone: 'muted' });
});

test('rsvp display eventRoster variant maps statuses', () => {
  assert.deepEqual(getRsvpDisplay('Yes', { variant: 'eventRoster' }), { label: '🟢 Attending', tone: 'success' });
  assert.deepEqual(getRsvpDisplay('No', { variant: 'eventRoster' }), { label: '🔴 Declined', tone: 'danger' });
  assert.deepEqual(getRsvpDisplay('Pending', { variant: 'eventRoster' }), { label: '⏳ No Response', tone: 'muted' });
  assert.deepEqual(getRsvpDisplay('unknown-value', { variant: 'eventRoster' }), { label: '⏳ No Response', tone: 'muted' });
});

test('global status display maps known statuses', () => {
  assert.deepEqual(getGlobalStatusDisplay('Active'), { label: 'Active', tone: 'success' });
  assert.deepEqual(getGlobalStatusDisplay('Idle'), { label: 'Idle', tone: 'warning' });
  assert.deepEqual(getGlobalStatusDisplay('Leave'), { label: 'On Leave', tone: 'warning' });
  assert.deepEqual(getGlobalStatusDisplay('Inactive'), { label: 'Inactive', tone: 'muted' });
});

test('global status display handles unknown statuses', () => {
  assert.deepEqual(getGlobalStatusDisplay('unknown-value'), { label: 'Unknown', tone: 'primary' });
  assert.deepEqual(getGlobalStatusDisplay('Unknown'), { label: 'Unknown', tone: 'primary' });
});

test('unknown statuses return fallback display', () => {
  assert.deepEqual(getAttendanceDisplay('unknown-value'), { label: 'Pending', tone: 'muted' });
  assert.deepEqual(getRsvpDisplay('unknown-value'), { label: 'Pending', tone: 'muted' });
  assert.deepEqual(getGlobalStatusDisplay('unknown-value'), { label: 'Unknown', tone: 'primary' });
});
