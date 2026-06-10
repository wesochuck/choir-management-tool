import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const attendanceView = readFileSync(new URL('../src/views/admin/AttendanceView.tsx', import.meta.url), 'utf8');

test('attendance view has mobile responsive Tailwind classes', () => {
  assert.match(attendanceView, /md:flex-row/, 'should have desktop-first responsive breakpoints via md:');
});
