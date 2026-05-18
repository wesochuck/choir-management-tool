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

