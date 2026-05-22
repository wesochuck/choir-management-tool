import test from 'node:test';
import assert from 'node:assert/strict';
import { isSectionMismatch } from '../src/lib/voicePartUtils.ts';
import type { VoicePartDef } from '../src/services/settingsService.ts';

test('isSectionMismatch correctly identifies voice part and section conflicts', () => {
  const voiceParts: VoicePartDef[] = [
    { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
    { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
  ];

  // Case 1: Match
  assert.equal(isSectionMismatch('S1', 'S', voiceParts), false);
  assert.equal(isSectionMismatch('A1', 'A', voiceParts), false);

  // Case 2: Mismatch
  assert.equal(isSectionMismatch('S1', 'A', voiceParts), true);
  assert.equal(isSectionMismatch('A1', 'S', voiceParts), true);

  // Case 3: Case insensitivity for suggested section
  assert.equal(isSectionMismatch('S1', 's', voiceParts), false);

  // Case 4: Lenient when voice part is unknown or not configured
  assert.equal(isSectionMismatch('Unknown', 'S', voiceParts), false);
  assert.equal(isSectionMismatch('s1', 'S', []), false);

  // Case 5: Missing inputs
  assert.equal(isSectionMismatch(undefined, 'S', voiceParts), false);
  assert.equal(isSectionMismatch('S1', undefined, voiceParts), false);
});
