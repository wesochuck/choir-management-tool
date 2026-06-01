import { profileService, type Profile } from '../profileService';
import { rosterService } from '../rosterService';
import { getVoicePartsAndSections } from '../settingsService';
import type {
  CommunicationFilters,
  CommunicationRecipient,
} from './types';

export function profileToRecipient(profile: Profile): CommunicationRecipient {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.expand?.user?.email || '',
    phone: profile.phone || '',
    voicePart: profile.voicePart,
    globalStatus: profile.globalStatus,
  };
}

export async function resolveRecipients(
  filters: CommunicationFilters
): Promise<CommunicationRecipient[]> {
  const [profiles, voiceData] = await Promise.all([
    profileService.getProfiles(),
    getVoicePartsAndSections(),
  ]);

  let allowedProfileIds: Set<string> | null = null;

  if (filters.eventId) {
    const roster = await rosterService.getEventRoster(filters.eventId);
    if (filters.rsvp === 'Pending') {
      // "Pending" includes profiles without an eventRosters row; those are implicitly pending.
      const rosterByProfileId = new Map<string, 'Yes' | 'No' | 'Pending'>(
        roster.map((item) => [item.profile, item.rsvp])
      );
      allowedProfileIds = new Set(
        profiles
          .filter((profile) => (rosterByProfileId.get(profile.id) ?? 'Pending') === 'Pending')
          .map((profile) => profile.id)
      );
    } else {
      allowedProfileIds = new Set(
        roster
          .filter((item) => filters.rsvp === 'All' || item.rsvp === filters.rsvp)
          .map((item) => item.profile)
      );
    }
  }

  // Resolve voiceParts filter: Expand any section codes to their constituent parts
  let targetParts: Set<string> | null = null;
  if (filters.voiceParts && filters.voiceParts.length > 0) {
    targetParts = new Set();
    const sections = new Set(voiceData.sections.map((s) => s.code));

    filters.voiceParts.forEach((token) => {
      if (sections.has(token)) {
        // It's a bucket/section code, add all parts in this section
        voiceData.voiceParts
          .filter((vp) => vp.sectionCode === token)
          .forEach((vp) => targetParts?.add(vp.label));
      } else {
        // It's an individual part label
        targetParts?.add(token);
      }
    });
  }

  return profiles
    .filter((profile: Profile) => !allowedProfileIds || allowedProfileIds.has(profile.id))
    .filter((profile: Profile) => !targetParts || targetParts.has(profile.voicePart))
    .filter((profile: Profile) => !filters.globalStatus || profile.globalStatus === filters.globalStatus)
    .map(profileToRecipient);
}
