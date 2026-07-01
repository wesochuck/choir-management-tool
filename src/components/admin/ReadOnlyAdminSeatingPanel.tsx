import { useState, useEffect } from 'react';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import type { SeatingDisplayProfile, SelectedSeatInfo } from '../seating/types';
import { SeatingPerspectiveToggle } from '../seating/SeatingPerspectiveToggle';
import { ReadOnlySeatingGrid } from '../seating/ReadOnlySeatingGrid';
import { SelectedSeatCard } from '../seating/SelectedSeatCard';
import { Button } from '../ui';

interface ReadOnlyAdminSeatingPanelProps {
  rowCounts: number[];
  assignments: Record<string, string>;
  profilesById: Map<string, SeatingDisplayProfile>;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  chartName?: string;
  onEditAnyway: () => void;
}

export function ReadOnlyAdminSeatingPanel({
  rowCounts,
  assignments,
  profilesById,
  sections,
  voiceParts,
  chartName,
  onEditAnyway,
}: ReadOnlyAdminSeatingPanelProps) {
  const { performerLabel } = useChoirSettings();

  const [perspective, setPerspective] = useState<'singer' | 'director'>(() => {
    return (localStorage.getItem('admin-seating-perspective') as 'singer' | 'director') || 'singer';
  });
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatInfo | null>(null);

  useEffect(() => {
    localStorage.setItem('admin-seating-perspective', perspective);
  }, [perspective]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        Mobile seating view is read-only. Tap a seat to view {performerLabel.toLowerCase()} details.
      </div>

      {chartName && <h3 className="text-text text-center text-base font-bold">{chartName}</h3>}

      <SeatingPerspectiveToggle value={perspective} onChange={setPerspective} />

      <ReadOnlySeatingGrid
        rowCounts={rowCounts}
        assignments={assignments}
        profilesById={profilesById}
        sections={sections}
        voiceParts={voiceParts}
        perspective={perspective}
        selectedSeat={selectedSeat}
        showVoicePartColors
        onSeatSelect={(seat) => setSelectedSeat(seat)}
      />

      {selectedSeat && (
        <SelectedSeatCard selectedSeat={selectedSeat} onClear={() => setSelectedSeat(null)} />
      )}

      <Button variant="outline" onClick={onEditAnyway}>
        Edit seating anyway
      </Button>
    </div>
  );
}
