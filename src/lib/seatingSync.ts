import type { SeatingChart } from '../services/seatingService';

export interface SeatingSyncContext {
  performanceId: string;
  venueId: string;
  sessionId: number;
}

export const seatingContextKey = (performanceId: string, venueId: string) => (
  `${performanceId || 'none'}-${venueId || 'none'}`
);

export const seatingContextId = ({ performanceId, venueId, sessionId }: SeatingSyncContext) => (
  `${seatingContextKey(performanceId, venueId)}-${sessionId}`
);

export const shouldApplySeatingResponse = (
  requestContext: SeatingSyncContext,
  currentContext: SeatingSyncContext,
) => seatingContextId(requestContext) === seatingContextId(currentContext);

export const mergeSeatingResponseWithDirtyState = (
  serverChart: SeatingChart | null,
  dirtyPayload: Partial<SeatingChart>,
  optimisticAssignments: Record<string, string>,
  performanceId: string,
  venueId: string,
) => ({
  ...(serverChart || {}),
  ...dirtyPayload,
  performance: performanceId,
  venue: venueId,
  assignments: optimisticAssignments,
}) as SeatingChart;

import { DEFAULT_SECTIONS, DEFAULT_VOICE_PARTS, type SectionDef, type VoicePartDef } from '../services/settingsService';

export function groupSingersBySection<T extends { id: string; name: string; voicePart: string }>(
  profiles: T[],
  assignedIds: Set<string>,
  sections: SectionDef[] = DEFAULT_SECTIONS,
  voicePartDefs: VoicePartDef[] = DEFAULT_VOICE_PARTS
) {
  const unassigned = profiles.filter(p => !assignedIds.has(p.id));
  
  const groups: Record<string, T[]> = {};
  sections.forEach(s => {
    groups[s.code] = [];
  });
  groups.Other = [];

  unassigned.forEach(p => {
    const vpDef = voicePartDefs.find(vp => 
      vp.label === p.voicePart || 
      vp.fullName === p.voicePart || 
      vp.label.toLowerCase() === p.voicePart.toLowerCase() ||
      vp.fullName.toLowerCase() === p.voicePart.toLowerCase()
    );
    let sectionCode = vpDef?.sectionCode;
    if (!sectionCode) {
      const part = p.voicePart ? p.voicePart.trim() : '';
      if (/^(soprano|s)(\s*\d+)?$/i.test(part)) sectionCode = 'S';
      else if (/^(alto|a)(\s*\d+)?$/i.test(part)) sectionCode = 'A';
      else if (/^(tenor|t)(\s*\d+)?$/i.test(part)) sectionCode = 'T';
      else if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(part)) sectionCode = 'B';
    }

    if (sectionCode && groups[sectionCode]) {
      groups[sectionCode].push(p);
    } else {
      groups.Other.push(p);
    }
  });

  return groups;
}

export function removeSeatFromRow(
  rowCounts: number[],
  rowIndex: number,
  seatIndex: number,
  assignments: Record<string, string>
): { rowCounts: number[]; assignments: Record<string, string> } {
  const newRowCounts = [...rowCounts];
  if (newRowCounts[rowIndex] > 0) {
    newRowCounts[rowIndex] -= 1;
  }

  const newAssignments: Record<string, string> = {};
  Object.entries(assignments).forEach(([key, profileId]) => {
    const [rStr, sStr] = key.split('-');
    const r = parseInt(rStr, 10);
    const s = parseInt(sStr, 10);

    if (r === rowIndex) {
      if (s === seatIndex) {
        return;
      }
      if (s < seatIndex) {
        newAssignments[`${r}-${s}`] = profileId;
      } else {
        newAssignments[`${r}-${s - 1}`] = profileId;
      }
    } else {
      newAssignments[key] = profileId;
    }
  });

  return { rowCounts: newRowCounts, assignments: newAssignments };
}

export function removeRowAndShiftAssignments(
  rowCounts: number[],
  rowIndex: number,
  assignments: Record<string, string>
): { rowCounts: number[]; assignments: Record<string, string> } {
  const newRowCounts = rowCounts.filter((_, idx) => idx !== rowIndex);
  const newAssignments: Record<string, string> = {};
  Object.entries(assignments).forEach(([key, profileId]) => {
    const [rStr, sStr] = key.split('-');
    const r = parseInt(rStr, 10);
    if (r === rowIndex) {
      return;
    }
    if (r < rowIndex) {
      newAssignments[key] = profileId;
    } else {
      newAssignments[`${r - 1}-${sStr}`] = profileId;
    }
  });
  return { rowCounts: newRowCounts, assignments: newAssignments };
}

export interface RsvpRecord {
  profile: string;
  rsvp: string;
}

export interface ProfileWithStatus {
  id: string;
  globalStatus: string;
  voicePart?: string;
}

export function filterProfilesByRsvpYes<T extends ProfileWithStatus>(
  profiles: T[],
  roster: RsvpRecord[]
): T[] {
  const attendingProfileIds = new Set(
    roster
      .filter(r => r.rsvp === 'Yes')
      .map(r => r.profile)
  );
  return profiles.filter(
    p => p.globalStatus === 'Active' && !!p.voicePart && attendingProfileIds.has(p.id)
  );
}



