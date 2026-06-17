import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const checkInList = readFileSync(resolve(process.cwd(), 'src/components/admin/CheckInList.tsx'), 'utf8');

test('check-in list has mobile responsive Tailwind classes', () => {
  assert.match(checkInList, /hideBelow/, 'should use DataTable hideBelow for responsive columns');
  assert.match(checkInList, /DataTable/, 'should use DataTable component');
});
