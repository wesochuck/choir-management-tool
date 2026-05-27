import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAttendanceDisplay,
  getGlobalStatusDisplay,
  getRsvpDisplay,
} from '../src/lib/statusDisplay.ts';

test('getAttendanceDisplay maps known and fallback statuses', () => {
  assert.deepEqual(getAttendanceDisplay('Present'), { label: 'Present', tone: 'success' });
  assert.deepEqual(getAttendanceDisplay('Absent'), { label: 'Absent', tone: 'danger' });
  assert.deepEqual(getAttendanceDisplay('Pending'), { label: 'Pending', tone: 'muted' });
  assert.deepEqual(getAttendanceDisplay('SomethingElse'), { label: 'Pending', tone: 'muted' });
});

test('getRsvpDisplay maps known and fallback statuses', () => {
  assert.deepEqual(getRsvpDisplay('Yes'), { label: 'Yes', tone: 'success' });
  assert.deepEqual(getRsvpDisplay('No'), { label: 'No', tone: 'danger' });
  assert.deepEqual(getRsvpDisplay('Pending'), { label: 'Pending', tone: 'muted' });
  assert.deepEqual(getRsvpDisplay('Maybe'), { label: 'Pending', tone: 'muted' });
});

test('getGlobalStatusDisplay maps known and fallback statuses', () => {
  assert.deepEqual(getGlobalStatusDisplay('Active'), { label: 'Active', tone: 'success' });
  assert.deepEqual(getGlobalStatusDisplay('Idle'), { label: 'Idle', tone: 'warning' });
  assert.deepEqual(getGlobalStatusDisplay('Inactive'), { label: 'Inactive', tone: 'danger' });
  assert.deepEqual(getGlobalStatusDisplay('Unknown'), { label: 'Active', tone: 'primary' });
});
