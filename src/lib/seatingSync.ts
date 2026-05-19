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

export function groupSingersBySection<T extends { id: string; name: string; voicePart: string }>(
  profiles: T[],
  assignedIds: Set<string>
) {
  const unassigned = profiles.filter(p => !assignedIds.has(p.id));
  
  const groups: {
    S: T[];
    A: T[];
    T: T[];
    B: T[];
    Other: T[];
  } = {
    S: [],
    A: [],
    T: [],
    B: [],
    Other: []
  };

  unassigned.forEach(p => {
    const part = p.voicePart ? p.voicePart.trim() : '';
    
    const isSoprano = /^(soprano|s)(\s*\d+)?$/i.test(part);
    const isAlto = /^(alto|a)(\s*\d+)?$/i.test(part);
    const isTenor = /^(tenor|t)(\s*\d+)?$/i.test(part);
    const isBass = /^(bass|b|baritone|bar)(\s*\d+)?$/i.test(part);

    if (isSoprano) {
      groups.S.push(p);
    } else if (isAlto) {
      groups.A.push(p);
    } else if (isTenor) {
      groups.T.push(p);
    } else if (isBass) {
      groups.B.push(p);
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


