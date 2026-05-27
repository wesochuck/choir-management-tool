import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateRosterConfig } from '../src/hooks/useRosterConfigForm.ts';
import type { SectionDef, VoicePartDef } from '../src/services/settingsService.ts';

describe('useRosterConfigForm - validateRosterConfig helper', () => {
  it('returns null for a valid configuration', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: 'Sopranos' },
      { code: 'A', name: 'Altos' }
    ];
    const voiceParts: VoicePartDef[] = [
      { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
      { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' }
    ];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, null);
  });

  it('fails when a section bucket code is empty', () => {
    const sections: SectionDef[] = [
      { code: ' ', name: 'Sopranos' }
    ];
    const voiceParts: VoicePartDef[] = [];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Section bucket code cannot be empty.');
  });

  it('fails when section codes are duplicated case-insensitively', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: 'Sopranos' },
      { code: 's', name: 'Second Sopranos' }
    ];
    const voiceParts: VoicePartDef[] = [];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Duplicate section bucket code "S".');
  });

  it('fails when a section name is empty', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: ' ' }
    ];
    const voiceParts: VoicePartDef[] = [];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Section bucket "S" name cannot be empty.');
  });

  it('fails when a voice part label is empty', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: 'Sopranos' }
    ];
    const voiceParts: VoicePartDef[] = [
      { label: '', fullName: 'Soprano 1', sectionCode: 'S' }
    ];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Voice part label cannot be empty.');
  });

  it('fails when a voice part label is duplicated', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: 'Sopranos' }
    ];
    const voiceParts: VoicePartDef[] = [
      { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
      { label: 'S1', fullName: 'Another Soprano 1', sectionCode: 'S' }
    ];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Duplicate voice part label "S1".');
  });

  it('fails when a voice part full name is empty', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: 'Sopranos' }
    ];
    const voiceParts: VoicePartDef[] = [
      { label: 'S1', fullName: ' ', sectionCode: 'S' }
    ];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Voice part "S1" full name cannot be empty.');
  });

  it('fails when a voice part belongs to an unknown section bucket', () => {
    const sections: SectionDef[] = [
      { code: 'S', name: 'Sopranos' }
    ];
    const voiceParts: VoicePartDef[] = [
      { label: 'S1', fullName: 'Soprano 1', sectionCode: 'X' }
    ];

    const result = validateRosterConfig({ sections, voiceParts });
    assert.strictEqual(result, 'Error: Voice part "S1" belongs to unknown section bucket "X".');
  });
});
