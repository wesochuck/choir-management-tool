import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import type { SeatingDisplayProfile, SelectedSeatInfo } from './types';

export function getSingerInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getProfileSeatColor(
  profile: SeatingDisplayProfile | null,
  sections: SectionDef[],
  voiceParts: VoicePartDef[]
): string {
  if (!profile) return 'var(--color-border)';
  const voicePart = voiceParts.find((v) => v.label === profile.voicePart);
  const sectionCode = voicePart?.sectionCode || profile.voicePart?.[0];
  const section = sections.find((s) => s.code === sectionCode);
  return (
    voicePart?.color ||
    voicePart?.colorBg ||
    section?.color ||
    section?.colorBg ||
    'var(--color-primary)'
  );
}

export function buildSelectedSeatInfo(params: {
  row: number;
  seat: number;
  singerId?: string;
  highlightedProfileId?: string | null;
  profilesById: Map<string, SeatingDisplayProfile>;
}): SelectedSeatInfo {
  const { row, seat, singerId, highlightedProfileId, profilesById } = params;
  if (!singerId) return { row, seat, status: 'empty' };
  const profile = singerId ? (profilesById.get(singerId) ?? null) : null;
  const isSelf = singerId === highlightedProfileId;
  if (profile) {
    return {
      row,
      seat,
      status: isSelf ? 'self' : 'assigned',
      profileId: singerId,
      name: profile.name,
      voicePart: profile.voicePart,
    };
  }
  return { row, seat, profileId: singerId, status: 'assignedUnknown' };
}
