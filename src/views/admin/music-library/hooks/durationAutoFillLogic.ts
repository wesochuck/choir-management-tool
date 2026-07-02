import { formatSecondsToDuration } from '../../../../lib/musicPieceUtils';

export interface DurationAutoFillState {
  manuallyEdited: boolean;
  runningMax: number | null;
  tuttiLocked: boolean;
}

export interface AutoFillDecision {
  newDuration: string;
  newState: DurationAutoFillState;
}

export function computeAutoFillDecision(
  state: DurationAutoFillState,
  currentDuration: string,
  voicePart: string,
  durationSeconds: number
): AutoFillDecision | null {
  if (state.manuallyEdited) return null;

  const hasAutoFilled = state.runningMax !== null || state.tuttiLocked;

  if (currentDuration.trim() && !hasAutoFilled) return null;

  const isTutti = voicePart === 'tutti';

  if (isTutti) {
    return {
      newDuration: formatSecondsToDuration(durationSeconds),
      newState: {
        manuallyEdited: false,
        runningMax: durationSeconds,
        tuttiLocked: true,
      },
    };
  }

  if (state.tuttiLocked) return null;

  const currentMax = state.runningMax ?? 0;
  if (durationSeconds > currentMax) {
    return {
      newDuration: formatSecondsToDuration(durationSeconds),
      newState: {
        manuallyEdited: false,
        runningMax: durationSeconds,
        tuttiLocked: false,
      },
    };
  }

  return null;
}

export function computeExpectedDuration(
  trackDurations: Record<string, number | null>
): number | null {
  const entries = Object.entries(trackDurations);
  if (entries.length === 0) return null;

  if (trackDurations['tutti'] != null) return trackDurations['tutti'];

  const valid = Object.values(trackDurations).filter((d): d is number => d != null);
  if (valid.length === 0) return null;
  return Math.max(...valid);
}
