import { DEFAULT_VOICE_PARTS, type VoicePartDef } from '../../services/settingsService';
import { getSectionFromVoicePart } from '../voicePartUtils';

/**
 * Resolves recommended audio tracks for a given voice part key from the tracks mapping.
 * @param voicePart The singer's voice part (e.g. "S1", "S2", "A1", "Bass").
 * @param mapping The track mapping object (e.g. {"tutti": "...", "S1": "...", "S": "..."}).
 * @returns An array of matching keys in order of preference.
 */
export function resolveRecommendedTracks(
  voicePart: string | undefined,
  mapping: Record<string, string> | undefined,
  voiceParts?: VoicePartDef[]
): string[] {
  if (!mapping) return [];
  const activeKeys = Object.keys(mapping).filter((k) => mapping[k] && mapping[k].trim() !== '');
  if (activeKeys.length === 0) return [];

  const recommendedSet = new Set<string>();
  const normalizedPart = voicePart ? voicePart.trim() : '';

  if (normalizedPart) {
    // 1. Direct exact match
    const exactMatchKey = activeKeys.find((k) => k.toLowerCase() === normalizedPart.toLowerCase());
    if (exactMatchKey) {
      recommendedSet.add(exactMatchKey);
    } else {
      const resolvedVoiceParts =
        voiceParts && voiceParts.length > 0 ? voiceParts : DEFAULT_VOICE_PARTS;

      const getSectionOfKey = (k: string): string => {
        const vp = resolvedVoiceParts.find((v) => v.label.toLowerCase() === k.toLowerCase());
        if (vp && vp.sectionCode) {
          return vp.sectionCode;
        }
        return getSectionFromVoicePart(k);
      };

      const requestedSection = getSectionOfKey(normalizedPart);
      if (requestedSection !== 'Other') {
        // 2a. Broad section match (e.g. "S")
        const sectionCodeMatch = activeKeys.find(
          (k) => k.toLowerCase() === requestedSection.toLowerCase()
        );
        if (sectionCodeMatch) {
          recommendedSet.add(sectionCodeMatch);
        }

        // 2b. Other voice parts in the same section (e.g. "S1")
        const sameSectionLabels = resolvedVoiceParts
          .filter((vp) => vp.sectionCode === requestedSection)
          .map((vp) => vp.label.toLowerCase());

        for (const label of sameSectionLabels) {
          const match = activeKeys.find((k) => k.toLowerCase() === label);
          if (match) {
            recommendedSet.add(match);
          }
        }

        // 2c. Generic fallback for same section
        for (const k of activeKeys) {
          if (getSectionOfKey(k) === requestedSection) {
            recommendedSet.add(k);
          }
        }
      } else {
        // Fallback for unconfigured or custom legacy values
        const baseSection = normalizedPart.replace(/\d+/g, '').trim();
        if (baseSection && baseSection !== normalizedPart) {
          const prefixMatch = activeKeys.find((k) => k.toLowerCase() === baseSection.toLowerCase());
          if (prefixMatch) {
            recommendedSet.add(prefixMatch);
          }
        }

        if (recommendedSet.size === 0 && baseSection) {
          const related = activeKeys.find(
            (k) =>
              k.toLowerCase().startsWith(baseSection.toLowerCase()) && k.toLowerCase() !== 'tutti'
          );
          if (related) {
            recommendedSet.add(related);
          }
        }
      }
    }
  }

  // 4. Always add Tutti (Full Mix) as fallback option if available
  const tuttiKey = activeKeys.find((k) => k.toLowerCase() === 'tutti');
  if (tuttiKey) {
    recommendedSet.add(tuttiKey);
  }

  return Array.from(recommendedSet);
}
