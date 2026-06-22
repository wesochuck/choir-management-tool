import type { SectionDef, VoicePartDef } from '../../services/settingsService';

export type SeatingPerspective = 'singer' | 'director';

export type SeatingDisplayProfile = {
  id: string;
  name: string;
  voicePart: string;
};

export type SelectedSeatInfo = {
  row: number;
  seat: number;
  status: 'empty' | 'assignedUnknown' | 'assigned' | 'self';
  profileId?: string;
  name?: string;
  voicePart?: string;
};

export type ReadOnlySeatSelectPayload = {
  row: number;
  seat: number;
  profileId?: string;
  name?: string;
  voicePart?: string;
  status: SelectedSeatInfo['status'];
};

export type ReadOnlySeatingGridProps = {
  rowCounts: number[];
  assignments: Record<string, string>;
  profilesById: Map<string, SeatingDisplayProfile>;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  perspective: SeatingPerspective;
  selectedSeat?: SelectedSeatInfo | null;
  highlightedProfileId?: string | null;
  showVoicePartColors?: boolean;
  showNamesOnSeats?: boolean;
  onSeatSelect?: (seat: ReadOnlySeatSelectPayload) => void;
};
