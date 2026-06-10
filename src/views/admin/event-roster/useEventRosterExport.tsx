import { useCallback } from 'react';
import type { useDialog } from '../../../contexts/DialogContext';
import type { UserPreferences } from '../../../types/auth';
import type { Event } from '../../../services/eventService';
import type { useEventRosterData } from '../../../hooks/useEventRosterData';
import {
  buildEventRosterCsv,
  buildEventRosterExportFilename,
  type RsvpExportSort,
} from '../../../lib/eventRoster/exportCsv';
import {
  getRsvpStatusLabel,
  type RsvpStatus,
} from '../../../lib/eventRoster/rsvpLabels';
import './useEventRosterExport.css';

type VoicePartDef =
  ReturnType<typeof useEventRosterData>['voiceParts'][number];

type SectionDef =
  ReturnType<typeof useEventRosterData>['sections'][number];

type EventRosterExportSinger =
  ReturnType<typeof useEventRosterData>['filteredSingers'][number];

interface UseEventRosterExportArgs {
  event: Event | null;
  filteredSingers: EventRosterExportSinger[];
  selectedVoiceParts: string[];
  searchQuery: string;
  rsvpFilter: 'All' | RsvpStatus;
  voiceParts: VoicePartDef[];
  sections: SectionDef[];
  defaultExportSort: RsvpExportSort;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  dialog: ReturnType<typeof useDialog>;
}

export function useEventRosterExport({
  event,
  filteredSingers,
  selectedVoiceParts,
  searchQuery,
  rsvpFilter,
  voiceParts,
  sections,
  defaultExportSort,
  updatePreferences,
  dialog,
}: UseEventRosterExportArgs) {
  const handleExportCSV = useCallback(async () => {
    if (!event) return;

    const filterParts: string[] = [];

    if (rsvpFilter !== 'All') {
      filterParts.push(`RSVP: ${getRsvpStatusLabel(rsvpFilter)}`);
    }

    if (selectedVoiceParts.length > 0) {
      filterParts.push(`Voice Parts: ${selectedVoiceParts.join(', ')}`);
    }

    if (searchQuery.trim()) {
      filterParts.push(`Search: "${searchQuery.trim()}"`);
    }

    const filterSummary =
      filterParts.length > 0
        ? filterParts.join(' · ')
        : 'No filters active — all singers included';

    // Keep this mutable local variable inside handleExportCSV.
    // It captures the modal dropdown value at confirm time without extra renders.
    let chosenSort: RsvpExportSort = defaultExportSort;

    const confirmed = await dialog.confirm({
      title: 'Export RSVP Roster to CSV',
      message: (
        <div className="roster-export-container">
          <div className="roster-export-info-box">
            <div className="roster-export-label">
              Exporting {filteredSingers.length} singer
              {filteredSingers.length !== 1 ? 's' : ''} currently shown
            </div>
            <div className="roster-export-count">
              {filterSummary}
            </div>
          </div>

          <div className="roster-export-sort-container">
            <label className="roster-export-label">
              Sort Order
            </label>
            <select
              id="rsvp-export-sort-select"
              defaultValue={defaultExportSort}
              onChange={(event) => {
                chosenSort = event.target.value as RsvpExportSort;
              }}
              className="roster-export-select"
            >
              <option value="lastName">Last Name</option>
              <option value="section">Section → Last Name</option>
            </select>
          </div>
        </div>
      ),
      confirmLabel: '📥 Export CSV',
      cancelLabel: 'Cancel',
      variant: 'info',
    });

    if (!confirmed) return;

    await updatePreferences({ rsvpExportSort: chosenSort }).catch(() => undefined);

    const csvContent = buildEventRosterCsv({
      event,
      singers: filteredSingers,
      voiceParts,
      sections,
      sort: chosenSort,
    });

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', buildEventRosterExportFilename(event));

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [
    event,
    filteredSingers,
    selectedVoiceParts,
    searchQuery,
    rsvpFilter,
    voiceParts,
    sections,
    defaultExportSort,
    updatePreferences,
    dialog,
  ]);

  return { handleExportCSV };
}
