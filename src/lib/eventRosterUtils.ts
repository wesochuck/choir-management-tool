import { type Profile } from '../services/profileService';
import { type EventRoster } from '../services/rosterService';
import { type VoicePartDef, type SectionDef } from '../services/settingsService';
import { matchesVoiceParts, getSectionFromVoicePart } from './voicePartUtils';
import { compareProfilesByLastName, compareProfilesByVoicePartThenLastName } from './singerSort';

export interface MappedSinger {
  profile: Profile;
  rsvp: 'Yes' | 'No' | 'Pending';
  roster: EventRoster | undefined;
}

export function mapSingersToRosters(
  activeProfiles: Profile[],
  eventRoster: EventRoster[]
): MappedSinger[] {
  const profileRosterMap = new Map<string, EventRoster>();
  eventRoster.forEach((item) => {
    if (item.profile) {
      profileRosterMap.set(item.profile, item);
    }
  });

  return activeProfiles
    .filter((profile) => !!profile.voicePart)
    .map((profile) => {
      const roster = profileRosterMap.get(profile.id);
      const rsvp = roster?.rsvp || 'Pending';
      return {
        profile,
        rsvp,
        roster,
      };
    });
}

export function calculateRsvpCounts(mappedSingers: MappedSinger[]) {
  const yesCount = mappedSingers.filter((s) => s.rsvp === 'Yes').length;
  const noCount = mappedSingers.filter((s) => s.rsvp === 'No').length;
  const pendingCount = mappedSingers.filter((s) => s.rsvp === 'Pending').length;
  return { yesCount, noCount, pendingCount };
}

export function calculateSectionCounts(
  activeCountSingers: MappedSinger[],
  sections: SectionDef[],
  voiceParts: VoicePartDef[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  sections.forEach((sec) => {
    counts[sec.code] = 0;
  });
  activeCountSingers.forEach((s) => {
    if (s.profile.voicePart) {
      const vpDef = voiceParts.find((vp) => vp.label === s.profile.voicePart);
      const section = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(s.profile.voicePart);
      if (counts[section] !== undefined) {
        counts[section]++;
      } else {
        counts[section] = (counts[section] || 0) + 1;
      }
    }
  });
  return counts;
}

export function calculatePartCounts(
  activeCountSingers: MappedSinger[],
  voiceParts: VoicePartDef[]
): Map<string, number> {
  const partCounts = new Map<string, number>();
  voiceParts.forEach((vp) => {
    const count = activeCountSingers.filter((s) => s.profile.voicePart === vp.label).length;
    partCounts.set(vp.label, count);
  });
  return partCounts;
}

export function filterMappedSingers(
  mappedSingers: MappedSinger[],
  rsvpFilter: 'All' | 'Yes' | 'No' | 'Pending',
  selectedVoiceParts: string[],
  voiceParts: VoicePartDef[],
  searchQuery: string
): MappedSinger[] {
  return mappedSingers.filter((singer) => {
    if (rsvpFilter !== 'All' && singer.rsvp !== rsvpFilter) return false;

    if (selectedVoiceParts.length > 0) {
      const matchesVoice = matchesVoiceParts(
        singer.profile.voicePart,
        selectedVoiceParts,
        voiceParts
      );
      if (!matchesVoice) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return singer.profile.name.toLowerCase().includes(q);
    }
    return true;
  });
}

export function sortMappedSingers(
  filteredSingers: MappedSinger[],
  sortBy: 'lastName' | 'voicePart',
  voiceParts: VoicePartDef[]
): MappedSinger[] {
  const parts = voiceParts.map((vp) => vp.label);
  return [...filteredSingers].sort((a, b) => {
    if (sortBy === 'voicePart') {
      return compareProfilesByVoicePartThenLastName(a.profile, b.profile, parts);
    }
    return compareProfilesByLastName(a.profile, b.profile);
  });
}
