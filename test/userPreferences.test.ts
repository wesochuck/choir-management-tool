import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePreferences } from '../src/lib/userPreferences.ts';

test('User Personal Preferences Management - should patch sort fields cleanly while preserving unrelated preference values', () => {
  const initial = { rosterSort: 'lastName' as const, attendanceSort: 'voicePart' as const };
  const update = { rosterSort: 'voicePart' as const };
  
  const result = mergePreferences(initial, update);
  
  assert.equal(result.rosterSort, 'voicePart');
  assert.equal(result.attendanceSort, 'voicePart'); // Preserved value
});
