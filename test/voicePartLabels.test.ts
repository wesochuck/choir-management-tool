import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getVoicePartFilterLabel } from '../src/lib/voicePartLabels.ts';
import type { SectionDef } from '../src/services/settingsService.ts';

describe('getVoicePartFilterLabel helper', () => {
  const mockSections: SectionDef[] = [
    { code: 'S', name: 'Sopranos' },
    { code: 'A', name: 'Altos' }
  ];
  const mockVoicePartLabels = ['S1', 'S2', 'A1', 'A2'];

  it('returns All Voice Parts when no selections are made', () => {
    const result = getVoicePartFilterLabel([], mockSections, mockVoicePartLabels);
    assert.strictEqual(result, 'All Voice Parts');
  });

  it('returns configured section name for a section code', () => {
    const result = getVoicePartFilterLabel(['S'], mockSections, mockVoicePartLabels);
    assert.strictEqual(result, 'Sopranos');
  });

  it('returns voice part label for an individual voice part', () => {
    const result = getVoicePartFilterLabel(['S1'], mockSections, mockVoicePartLabels);
    assert.strictEqual(result, 'S1');
  });

  it('returns raw code for an unknown code', () => {
    const result = getVoicePartFilterLabel(['X'], mockSections, mockVoicePartLabels);
    assert.strictEqual(result, 'X');
  });

  it('joins multiple selections with a comma', () => {
    const result = getVoicePartFilterLabel(['S', 'A1', 'X'], mockSections, mockVoicePartLabels);
    assert.strictEqual(result, 'Sopranos, A1, X');
  });
});
