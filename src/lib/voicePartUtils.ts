import type { VoicePartDef } from '../services/settingsService';

export interface SectionDef {
  code: string;
  name: string;
}

/**
 * Fallback regex-based section classifier for legay voice parts or unconfigured values.
 */
export function getSectionFromVoicePart(part: string): string {
  const clean = part ? part.trim() : '';
  if (/^(soprano|s)(\s*\d+)?$/i.test(clean)) return 'S';
  if (/^(alto|a)(\s*\d+)?$/i.test(clean)) return 'A';
  if (/^(tenor|t)(\s*\d+)?$/i.test(clean)) return 'T';
  if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(clean)) return 'B';
  return 'Other';
}

export function getSectionsFromVoiceParts(voiceParts: VoicePartDef[]): SectionDef[] {
  const codes = Array.from(new Set(voiceParts.map(vp => vp.sectionCode).filter(Boolean)));
  const nameMap: Record<string, string> = {
    'S': 'Sopranos',
    'A': 'Altos',
    'T': 'Tenors',
    'B': 'Basses',
    'Other': 'Other'
  };
  return codes.map(code => ({
    code,
    name: nameMap[code] || `${code} Section`
  }));
}

/**
 * Robustly matches a profile's voice part against selected filters.
 * Supports exact part-level match and section-level match.
 */
export function matchesVoiceParts(
  profilePart: string,
  filterParts: string[],
  voiceParts: VoicePartDef[]
): boolean {
  if (!filterParts || filterParts.length === 0) return true;
  
  return filterParts.some(filterPart => {
    // 0. Special case for Administrative/Staff (no voice part)
    if (filterPart === '__STAFF__') return !profilePart;

    // 1. Exact match on the voice part label
    if (profilePart === filterPart) return true;

    // 2. Dynamic section match via config
    const vpDef = voiceParts.find(vp => vp.label === profilePart);
    if (vpDef && vpDef.sectionCode === filterPart) return true;

    // 3. Fallback regex match for unconfigured or custom legacy values
    if (!vpDef && profilePart) {
      const derivedSection = getSectionFromVoicePart(profilePart);
      if (derivedSection === filterPart) return true;
    }

    return false;
  });
}

/**
 * Checks if a singer's voice part matches the suggested section for a seat.
 * Returns true only if the voice part is known and belongs to a different section.
 */
export function isSectionMismatch(
  profilePart: string | undefined,
  suggestedSection: string | undefined,
  voiceParts: VoicePartDef[]
): boolean {
  if (!profilePart || !suggestedSection) return false;
  const vpDef = voiceParts.find(vp => vp.label === profilePart);
  if (!vpDef || !vpDef.sectionCode) return false;
  return vpDef.sectionCode.toUpperCase() !== suggestedSection.toUpperCase();
}
