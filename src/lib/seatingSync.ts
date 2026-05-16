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
