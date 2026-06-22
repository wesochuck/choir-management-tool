interface VoicePartDef {
  label: string;
  sectionCode?: string;
}

interface SectionDef {
  code: string;
  name: string;
}

export function getSingerSection(
  voicePart: string,
  voiceParts: VoicePartDef[],
  sections: SectionDef[]
): string {
  const vp = voiceParts.find((v) => v.label === voicePart);
  if (vp) {
    const sec = sections.find((s) => s.code === vp.sectionCode);
    if (sec) {
      const name = sec.name.toLowerCase();
      if (name.includes('soprano') && !name.includes('mezzo')) return 'Soprano';
      if (name.includes('mezzo')) return 'Mezzo-Soprano';
      if (name.includes('alto')) return 'Alto';
      if (name.includes('tenor')) return 'Tenor';
      if (name.includes('baritone')) return 'Baritone';
      if (name.includes('bass')) return 'Bass';
      return sec.name;
    }
  }

  const vpLower = (voicePart || '').toLowerCase();
  if (vpLower.includes('mezzo')) return 'Mezzo-Soprano';
  if (vpLower.includes('soprano') || vpLower.startsWith('s')) return 'Soprano';
  if (vpLower.includes('alto') || vpLower.startsWith('a')) return 'Alto';
  if (vpLower.includes('tenor') || vpLower.startsWith('t')) return 'Tenor';
  if (vpLower.includes('baritone')) return 'Baritone';
  if (vpLower.includes('bass') || vpLower.startsWith('b')) return 'Bass';
  return 'Other';
}
