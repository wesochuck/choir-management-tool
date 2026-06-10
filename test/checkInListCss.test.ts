import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/components/admin/CheckInList.css', import.meta.url), 'utf8');

test('check-in list mobile CSS hooks exist', () => {
  assert.match(css, /@media\s*\(width\s*<=\s*700px\)/, 'mobile breakpoint should exist');
  assert.match(css, /\.admin-checkin-mobile-more\s*\{/, 'mobile more button class should exist');
  assert.match(css, /\.admin-checkin-row\.secondary-open\s+\.admin-checkin-bottom-row\s*\{/, 'secondary open rule should exist');
});
