import { pb } from '../../lib/pocketbase';
import { profileService, type Profile } from '../profileService';
import { rosterService } from '../rosterService';
import { getVoicePartsAndSections } from '../settingsService';
import type { CommunicationFilters, CommunicationRecipient } from './types';
import { resolveTicketBuyers } from './ticketBuyerResolver';
import { resolveDonors } from './donorResolver';

function profileToRecipient(profile: Profile): CommunicationRecipient {
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
  if (filters.profileIds && filters.profileIds.length > 0) {
    const filterParts: string[] = [];
    const filterParams: Record<string, string> = {};
    filters.profileIds.forEach((id, index) => {
      filterParts.push(`id = {:id${index}}`);
      filterParams[`id${index}`] = id;
    });

    const profiles = await pb.collection('profiles').getFullList<Profile>({
      filter: pb.filter(filterParts.join(' || '), filterParams),
      expand: 'user',
    });
    return profiles.map(profileToRecipient);
  }

  const audiences =
    filters.targetAudiences && filters.targetAudiences.length > 0
      ? filters.targetAudiences
      : ['Members'];

  const promises: [
    Promise<CommunicationRecipient[]>,
    Promise<CommunicationRecipient[]>,
    Promise<CommunicationRecipient[]>,
  ] = [
    audiences.includes('Members') ? resolveMembers(filters) : Promise.resolve([]),
    audiences.includes('Ticket Buyers')
      ? resolveTicketBuyers(filters.eventId, !filters.eventId)
      : Promise.resolve([]),
    audiences.includes('Donors') ? resolveDonors(true) : Promise.resolve([]),
  ];

  const [members, ticketBuyers, donors] = await Promise.all(promises);

  const merged = new Map<string, CommunicationRecipient>();

  // Add members first, so they are preferred
  members.forEach((m) => {
    if (m.email) {
      merged.set(m.email.trim().toLowerCase(), m);
    }
  });

  // Add ticket buyers if not already present
  ticketBuyers.forEach((tb) => {
    if (tb.email) {
      const emailKey = tb.email.trim().toLowerCase();
      if (!merged.has(emailKey)) {
        merged.set(emailKey, tb);
      }
    }
  });

  // Add donors if not already present
  donors.forEach((d) => {
    if (d.email) {
      const emailKey = d.email.trim().toLowerCase();
      if (!merged.has(emailKey)) {
        merged.set(emailKey, d);
      }
    }
  });

  return Array.from(merged.values());
}

async function resolveMembers(filters: CommunicationFilters): Promise<CommunicationRecipient[]> {
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
    .filter((profile: Profile) => !!profile.voicePart)
    .filter((profile: Profile) => !allowedProfileIds || allowedProfileIds.has(profile.id))
    .filter((profile: Profile) => !targetParts || targetParts.has(profile.voicePart))
    .filter(
      (profile: Profile) => !filters.globalStatus || profile.globalStatus === filters.globalStatus
    )
    .map(profileToRecipient);
}
