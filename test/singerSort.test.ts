import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareProfilesByLastName,
  compareProfilesByVoicePartThenLastName,
  sortProfiles
} from '../src/lib/singerSort.ts';
import type { Profile } from '../src/services/profileService.ts';

describe('singerSort helpers', () => {
  const mockProfiles = [
    { id: 'p1', name: 'Alice Smith', voicePart: 'S1', active: true },
    { id: 'p2', name: 'Bob Jones', voicePart: 'A1', active: true },
    { id: 'p3', name: 'Charlie Brown', voicePart: 'T1', active: true }
  ] as unknown as Profile[];

  describe('compareProfilesByLastName', () => {
    it('compares profiles alphabetically by last name', () => {
      // Smith vs Jones: Smith is after Jones
      assert.ok(compareProfilesByLastName(mockProfiles[0], mockProfiles[1]) > 0);
      // Jones vs Brown: Jones is after Brown
      assert.ok(compareProfilesByLastName(mockProfiles[1], mockProfiles[2]) > 0);
      // Brown vs Smith: Brown is before Smith
      assert.ok(compareProfilesByLastName(mockProfiles[2], mockProfiles[0]) < 0);
    });

    it('falls back to full name if last names match', () => {
      const a = { id: 'p4', name: 'John Smith', voicePart: 'T1' } as unknown as Profile;
      const b = { id: 'p5', name: 'Adam Smith', voicePart: 'T1' } as unknown as Profile;
      // John vs Adam: John is after Adam
      assert.ok(compareProfilesByLastName(a, b) > 0);
    });
  });

  describe('compareProfilesByVoicePartThenLastName', () => {
    const voicePartOrder = ['S1', 'A1', 'T1'];

    it('orders by voice part index first', () => {
      // Alice (S1) vs Bob (A1): S1 comes first
      assert.ok(compareProfilesByVoicePartThenLastName(mockProfiles[0], mockProfiles[1], voicePartOrder) < 0);
      // Bob (A1) vs Charlie (T1): A1 comes first
      assert.ok(compareProfilesByVoicePartThenLastName(mockProfiles[1], mockProfiles[2], voicePartOrder) < 0);
    });

    it('orders by last name if voice parts are identical', () => {
      const a = { id: 'p6', name: 'Zoe Smith', voicePart: 'S1' } as unknown as Profile;
      const b = { id: 'p7', name: 'Adam Jones', voicePart: 'S1' } as unknown as Profile;
      // Zoe Smith vs Adam Jones: Jones comes before Smith
      assert.ok(compareProfilesByVoicePartThenLastName(a, b, voicePartOrder) > 0);
    });

    it('sorts unconfigured or unknown voice parts at the end', () => {
      const a = { id: 'p8', name: 'Dan White', voicePart: 'UnknownPart' } as unknown as Profile;
      const b = { id: 'p9', name: 'Adam Jones', voicePart: 'S1' } as unknown as Profile;
      // UnknownPart vs S1: S1 comes first
      assert.ok(compareProfilesByVoicePartThenLastName(a, b, voicePartOrder) > 0);
    });
  });

  describe('sortProfiles', () => {
    const voicePartOrder = ['S1', 'A1', 'T1'];

    it('sorts by lastName', () => {
      const sorted = sortProfiles(mockProfiles, 'lastName', voicePartOrder);
      assert.strictEqual(sorted[0].name, 'Charlie Brown');
      assert.strictEqual(sorted[1].name, 'Bob Jones');
      assert.strictEqual(sorted[2].name, 'Alice Smith');
    });

    it('sorts by voicePart', () => {
      const sorted = sortProfiles(mockProfiles, 'voicePart', voicePartOrder);
      assert.strictEqual(sorted[0].name, 'Alice Smith');
      assert.strictEqual(sorted[1].name, 'Bob Jones');
      assert.strictEqual(sorted[2].name, 'Charlie Brown');
    });
  });
});
