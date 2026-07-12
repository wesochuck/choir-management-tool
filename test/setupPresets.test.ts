// @vitest-environment node
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS } from '../src/lib/setupPresets';

describe('Organization Presets', () => {
  it('defines correct defaults for choir, band, and other', () => {
    // Choir Preset Invariants
    assert.strictEqual(PRESETS.choir.performerLabel, 'Singer');
    assert.ok(PRESETS.choir.sections.some((s) => s.code === 'S'));
    assert.ok(PRESETS.choir.voiceParts.some((vp) => vp.label === 'S1'));

    // Band Preset Invariants
    assert.strictEqual(PRESETS.band.performerLabel, 'Musician');
    assert.ok(PRESETS.band.sections.some((s) => s.code === 'WW'));
    assert.ok(PRESETS.band.voiceParts.some((vp) => vp.label === 'Trumpet'));

    // Other Preset Invariants
    assert.strictEqual(PRESETS.other.performerLabel, 'Performer');
    assert.strictEqual(PRESETS.other.sections.length, 1);
    assert.strictEqual(PRESETS.other.voiceParts.length, 1);
  });
});
