import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const attendanceCss = readFileSync(new URL('../src/views/admin/AttendanceView.css', import.meta.url), 'utf8');

test('attendance view has core mobile layout hooks', () => {
  assert.match(attendanceCss, /@media\s*\(max-width:\s*700px\)/, 'attendance mobile breakpoint should exist');
  assert.match(attendanceCss, /\.attendance-mobile-progress\s*\{/, 'attendance mobile progress class should exist');
  assert.match(attendanceCss, /\.attendance-mobile-actions-toggle\s*\{/, 'attendance mobile actions toggle class should exist');
});
