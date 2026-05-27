import type { Profile } from '../services/profileService';
import { getLastName } from './stringUtils';

export type SingerSortMode = 'lastName' | 'voicePart';

export function compareProfilesByLastName(a: Profile, b: Profile): number {
  const lastA = getLastName(a.name);
  const lastB = getLastName(b.name);
  const cmp = lastA.localeCompare(lastB);
  if (cmp !== 0) return cmp;
  return a.name.localeCompare(b.name);
}

export function compareProfilesByVoicePartThenLastName(
  a: Profile,
  b: Profile,
  voicePartOrder: string[]
): number {
  const idxA = voicePartOrder.indexOf(a.voicePart);
  const idxB = voicePartOrder.indexOf(b.voicePart);
  const orderA = idxA === -1 ? 999 : idxA;
  const orderB = idxB === -1 ? 999 : idxB;

  if (orderA !== orderB) return orderA - orderB;
  return compareProfilesByLastName(a, b);
}

export function sortProfiles(
  profiles: Profile[],
  sortBy: SingerSortMode,
  voicePartOrder: string[]
): Profile[] {
  return [...profiles].sort((a, b) => {
    if (sortBy === 'voicePart') {
      return compareProfilesByVoicePartThenLastName(a, b, voicePartOrder);
    }
    return compareProfilesByLastName(a, b);
  });
}
