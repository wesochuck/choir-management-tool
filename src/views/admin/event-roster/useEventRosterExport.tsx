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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid rgba(74,117,89,0.2)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              Exporting {filteredSingers.length} singer
              {filteredSingers.length !== 1 ? 's' : ''} currently shown
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--primary-deep)',
                fontWeight: 600,
              }}
            >
              {filterSummary}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}
            >
              Sort Order
            </label>
            <select
              id="rsvp-export-sort-select"
              defaultValue={defaultExportSort}
              onChange={(event) => {
                chosenSort = event.target.value as RsvpExportSort;
              }}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
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
