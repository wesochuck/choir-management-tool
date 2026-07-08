import { getSetting, upsertSetting } from './core';
import type { AppSetting } from './core';

export interface SectionDef {
  code: string;
  name: string;
  color?: string;
  colorBg?: string;
  colorText?: string;
}

export interface VoicePartDef {
  label: string;
  fullName: string;
  sectionCode: string;
  color?: string;
  colorBg?: string;
  colorText?: string;
  // If true, this voice part is strictly used to tag learning tracks (e.g. Soloists) and is hidden from general operational lists (rosters, seating, communications)
  trackOnly?: boolean;
}

export interface VoicePartSettings {
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
}

export type FormationStrategyType = 'vertical_column' | 'horizontal_row';

export interface SeatingFormationDef {
  id: string;
  name: string;
  strategy: FormationStrategyType;
  sectionOrder: string[];
  isVoicePartLayout?: boolean;
}

export interface SeatingSettings {
  defaultFormationId: string;
  formations: SeatingFormationDef[];
}

export const DEFAULT_SECTIONS: SectionDef[] = [
  {
    code: 'S',
    name: 'Sopranos',
    color: '#1b4d3e',
    colorBg: 'var(--color-danger-bg)',
    colorText: 'var(--color-danger-text)',
  },
  {
    code: 'A',
    name: 'Altos',
    color: '#4a7c59',
    colorBg: 'var(--color-primary-light)',
    colorText: 'var(--color-primary-deep)',
  },
  { code: 'T', name: 'Tenors', color: '#92400e', colorBg: '#fef3c7', colorText: '#92400e' },
  { code: 'B', name: 'Basses', color: '#075985', colorBg: '#e0f2fe', colorText: '#075985' },
];

export const DEFAULT_VOICE_PARTS: VoicePartDef[] = [
  { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
  { label: 'S2', fullName: 'Soprano 2', sectionCode: 'S' },
  { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
  { label: 'A2', fullName: 'Alto 2', sectionCode: 'A' },
  { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' },
  { label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' },
  { label: 'B1', fullName: 'Bass 1', sectionCode: 'B' },
  { label: 'B2', fullName: 'Bass 2', sectionCode: 'B' },
];

export const DEFAULT_SEATING_SETTINGS: SeatingSettings = {
  defaultFormationId: 'columns-standard',
  formations: [
    {
      id: 'columns-standard',
      name: 'Standard Columns (S-A-T-B Left to Right)',
      strategy: 'vertical_column',
      sectionOrder: ['S', 'A', 'T', 'B'],
    },
    {
      id: 'rows-standard',
      name: 'Standard Rows (S-A-T-B Front to Back)',
      strategy: 'horizontal_row',
      sectionOrder: ['S', 'A', 'T', 'B'],
    },
  ],
};

export async function getSeatingSettings(): Promise<SeatingSettings> {
  const setting = await getSetting<SeatingSettings>('seating_config');
  const value = setting?.value;
  const voiceSettings = await getVoicePartsAndSections();
  const activeCodes = voiceSettings.sections.map((s) => s.code.toUpperCase());
  const activeParts = voiceSettings.voiceParts.map((vp) => vp.label.toUpperCase());

  const baseFormations = value?.formations || DEFAULT_SEATING_SETTINGS.formations;

  const sanitizedFormations = baseFormations.map((form) => {
    const isVoice = !!form.isVoicePartLayout;
    const filterList = isVoice ? activeParts : activeCodes;
    const order = (form.sectionOrder || []).filter((code) =>
      filterList.includes(code.toUpperCase())
    );
    return { ...form, sectionOrder: order, isVoicePartLayout: isVoice };
  });

  return {
    defaultFormationId: value?.defaultFormationId || DEFAULT_SEATING_SETTINGS.defaultFormationId,
    formations: sanitizedFormations,
  };
}

export async function saveSeatingSettings(value: SeatingSettings) {
  return await upsertSetting('seating_config', value, true);
}

export async function getVoicePartsAndSections(): Promise<VoicePartSettings> {
  try {
    const setting = await getSetting<VoicePartSettings>('voiceParts');
    if (setting && setting.value) {
      let sections = setting.value.sections || [];
      let voiceParts = setting.value.voiceParts || [];

      if (sections.length === 0 && voiceParts.length > 0) {
        const detectedCodes = new Set<string>();
        voiceParts = voiceParts.map((vp) => {
          let code = vp.sectionCode;
          if (!code) {
            const label = vp.label || '';
            if (/^(soprano|s)(\s*\d+)?$/i.test(label)) code = 'S';
            else if (/^(alto|a)(\s*\d+)?$/i.test(label)) code = 'A';
            else if (/^(tenor|t)(\s*\d+)?$/i.test(label)) code = 'T';
            else if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(label)) code = 'B';
            else code = 'Other';
          }
          detectedCodes.add(code);
          return { ...vp, sectionCode: code };
        });

        sections = [];
        if (detectedCodes.has('S')) sections.push({ code: 'S', name: 'Sopranos' });
        if (detectedCodes.has('A')) sections.push({ code: 'A', name: 'Altos' });
        if (detectedCodes.has('T')) sections.push({ code: 'T', name: 'Tenors' });
        if (detectedCodes.has('B')) sections.push({ code: 'B', name: 'Basses' });
        if (detectedCodes.has('Other')) sections.push({ code: 'Other', name: 'Other' });

        if (sections.length === 0) {
          sections = [...DEFAULT_SECTIONS];
        }
      }

      if (sections.length > 0 && voiceParts.length > 0) {
        return { sections, voiceParts };
      }
    }
    return { sections: DEFAULT_SECTIONS, voiceParts: DEFAULT_VOICE_PARTS };
  } catch {
    return { sections: DEFAULT_SECTIONS, voiceParts: DEFAULT_VOICE_PARTS };
  }
}

export async function saveVoicePartsAndSections(
  voiceParts: VoicePartDef[],
  sections: SectionDef[]
): Promise<AppSetting<VoicePartSettings>> {
  return await upsertSetting<VoicePartSettings>('voiceParts', { voiceParts, sections }, true);
}

export async function getVoiceParts(): Promise<VoicePartDef[]> {
  const settings = await getVoicePartsAndSections();
  return settings.voiceParts;
}

export async function saveVoiceParts(
  voiceParts: VoicePartDef[]
): Promise<AppSetting<VoicePartSettings>> {
  const current = await getVoicePartsAndSections();
  return await saveVoicePartsAndSections(voiceParts, current.sections);
}
