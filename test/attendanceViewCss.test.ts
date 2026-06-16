import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const attendanceView = readFileSync(resolve(process.cwd(), 'src/views/admin/AttendanceView.tsx'), 'utf8');

test('attendance view has mobile responsive Tailwind classes', () => {
  assert.match(attendanceView, /md:flex-row/, 'should have desktop-first responsive breakpoints via md:');
});
