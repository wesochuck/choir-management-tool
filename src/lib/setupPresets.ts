export interface SectionPreset {
  code: string;
  name: string;
  color: string;
  colorBg: string;
  colorText: string;
}

export interface VoicePartPreset {
  label: string;
  fullName: string;
  sectionCode: string;
}

export interface PresetDef {
  label: string;
  performerLabel: string;
  description: string;
  sections: SectionPreset[];
  voiceParts: VoicePartPreset[];
}

export const PRESETS: Record<'choir' | 'band' | 'other', PresetDef> = {
  choir: {
    label: 'Choir / Vocal Ensemble',
    performerLabel: 'Singer',
    description:
      'Standard SATB choral structure (Sopranos, Altos, Tenors, Basses) with split voice parts.',
    sections: [
      { code: 'S', name: 'Sopranos', color: '#1b4d3e', colorBg: '#d1fae5', colorText: '#065f46' },
      { code: 'A', name: 'Altos', color: '#4a7c59', colorBg: '#ecfdf5', colorText: '#047857' },
      { code: 'T', name: 'Tenors', color: '#92400e', colorBg: '#fef3c7', colorText: '#92400e' },
      { code: 'B', name: 'Basses', color: '#075985', colorBg: '#e0f2fe', colorText: '#075985' },
    ],
    voiceParts: [
      { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
      { label: 'S2', fullName: 'Soprano 2', sectionCode: 'S' },
      { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
      { label: 'A2', fullName: 'Alto 2', sectionCode: 'A' },
      { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' },
      { label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' },
      { label: 'B1', fullName: 'Bass 1', sectionCode: 'B' },
      { label: 'B2', fullName: 'Bass 2', sectionCode: 'B' },
    ],
  },
  band: {
    label: 'Band / Instrumental Ensemble',
    performerLabel: 'Musician',
    description:
      'Wind ensemble, concert band, or orchestra layout grouped by woodwinds, brass, percussion, and rhythm.',
    sections: [
      { code: 'WW', name: 'Woodwinds', color: '#047857', colorBg: '#ecfdf5', colorText: '#047857' },
      { code: 'BR', name: 'Brass', color: '#b45309', colorBg: '#fffbeb', colorText: '#b45309' },
      {
        code: 'PR',
        name: 'Percussion',
        color: '#6d28d9',
        colorBg: '#f5f3ff',
        colorText: '#6d28d9',
      },
      { code: 'RY', name: 'Rhythm', color: '#0369a1', colorBg: '#f0f9ff', colorText: '#0369a1' },
    ],
    voiceParts: [
      { label: 'Flute', fullName: 'Flute', sectionCode: 'WW' },
      { label: 'Clarinet', fullName: 'Clarinet', sectionCode: 'WW' },
      { label: 'Saxophone', fullName: 'Alto Saxophone', sectionCode: 'WW' },
      { label: 'Trumpet', fullName: 'Trumpet', sectionCode: 'BR' },
      { label: 'French Horn', fullName: 'French Horn', sectionCode: 'BR' },
      { label: 'Trombone', fullName: 'Trombone', sectionCode: 'BR' },
      { label: 'Tuba', fullName: 'Tuba', sectionCode: 'BR' },
      { label: 'Snare', fullName: 'Snare Drum', sectionCode: 'PR' },
      { label: 'Timpani', fullName: 'Timpani', sectionCode: 'PR' },
      { label: 'Piano', fullName: 'Piano', sectionCode: 'RY' },
      { label: 'Bass', fullName: 'Bass Guitar', sectionCode: 'RY' },
    ],
  },
  other: {
    label: 'Other / Custom Ensemble',
    performerLabel: 'Performer',
    description:
      'A simple generic section with a single starter part, customizable for any group type.',
    sections: [
      { code: 'GEN', name: 'General', color: '#475569', colorBg: '#f8fafc', colorText: '#475569' },
    ],
    voiceParts: [{ label: 'Performer', fullName: 'Performer', sectionCode: 'GEN' }],
  },
};
