import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checkInList = readFileSync(new URL('../src/components/admin/CheckInList.tsx', import.meta.url), 'utf8');

test('check-in list has mobile responsive Tailwind classes', () => {
  assert.match(checkInList, /max-\[700px\]:/, 'should have mobile responsive breakpoints via max-[700px]:');
  assert.match(checkInList, /flex/, 'should use Tailwind flex utilities');
});
