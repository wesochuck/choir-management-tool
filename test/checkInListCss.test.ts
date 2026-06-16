import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const checkInList = readFileSync(resolve(process.cwd(), 'src/components/admin/CheckInList.tsx'), 'utf8');

test('check-in list has mobile responsive Tailwind classes', () => {
  assert.match(checkInList, /max-\[700px\]:/, 'should have mobile responsive breakpoints via max-[700px]:');
  assert.match(checkInList, /flex/, 'should use Tailwind flex utilities');
});
