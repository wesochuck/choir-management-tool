import type { SectionDef } from '../services/settingsService';

export function getVoicePartFilterLabel(
  selectedCodes: string[],
  sections: SectionDef[],
  voicePartLabels: string[]
): string {
  if (selectedCodes.length === 0) return 'All Voice Parts';

  return selectedCodes.map(code => {
    const section = sections.find(sec => sec.code === code);
    if (section) return section.name;

    if (voicePartLabels.includes(code)) return code;

    return code;
  }).join(', ');
}
