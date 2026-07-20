import React from 'react';
import type { Event } from '../../../services/eventService';
import { Select, Button } from '../../../components/ui';
import { formatInTimezone } from '../../../lib/timezone';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../../lib/labelHelpers';

interface SetListToolbarProps {
  events: Event[];
  selectedEventId: string;
  selectedEvent: Event | undefined;
  parentPerformance: Event | null;
  localApproved: boolean;
  timezone: string;
  onEventChange: (id: string) => void;
  onCopyFrom: (sourceEventId: string) => void;
  onToggleApproved: (checked: boolean) => Promise<void>;
  onGoToParent: () => void;
}

export function SetListToolbar({
  events,
  selectedEventId,
  selectedEvent,
  parentPerformance,
  localApproved,
  timezone,
  onEventChange,
  onCopyFrom,
  onToggleApproved,
  onGoToParent,
}: SetListToolbarProps) {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  return (
    <div className="border-border flex flex-col gap-4 border-b px-4 py-3">
      <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(260px,0.8fr)]">
        <div>
          <span className="text-text-muted mb-2 block text-sm font-bold tracking-wider uppercase">
            Select Event
          </span>
          <Select
            value={selectedEventId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onEventChange(e.target.value)}
            className="w-full"
          >
            <option value="">-- Choose Event --</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {formatInTimezone(e.date, timezone, {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                })}{' '}
                - {e.title || e.type}
              </option>
            ))}
          </Select>
        </div>

        {selectedEvent ? (
          <div>
            <span className="text-text-muted mb-2 block text-sm font-bold tracking-wider uppercase">
              Copy from Previous
            </span>
            <Select
              value=""
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value) {
                  onCopyFrom(e.target.value);
                }
              }}
              className="w-full"
            >
              <option value="">-- Copy Set List --</option>
              {events
                .filter((e) => e.id !== selectedEventId && e.setList && e.setList.length > 0)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatInTimezone(e.date, timezone, {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                    })}{' '}
                    - {e.title || e.type}
                  </option>
                ))}
            </Select>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        {selectedEvent && selectedEvent.type === 'Performance' && (
          <div className="flex flex-col">
            <span className="text-text-muted mb-2 block text-sm font-bold tracking-wider uppercase">
              {performerLabel} Visibility
            </span>
            <label className="border-border bg-surface text-text flex h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-md border px-4 text-sm font-semibold shadow-sm transition-colors select-none hover:bg-slate-50">
              <input
                type="checkbox"
                checked={localApproved}
                onChange={(e) => onToggleApproved(e.target.checked)}
                className="accent-primary size-4 cursor-pointer"
              />
              <span>Approved for {performerLabelPlural}</span>
            </label>
          </div>
        )}

        {selectedEvent && selectedEvent.type === 'Rehearsal' && (
          <div className="flex flex-col">
            <span className="text-text-muted mb-2 block text-sm font-bold tracking-wider uppercase">
              Parent Set List
            </span>
            {parentPerformance ? (
              <Button
                variant="secondary"
                className="flex h-11 w-full items-center justify-center gap-2"
                onClick={onGoToParent}
              >
                🔗 Go to parent: {parentPerformance.title || 'Concert'}
              </Button>
            ) : (
              <div className="border-border text-text-muted bg-surface-muted flex h-11 items-center justify-center rounded-md border px-4 text-sm">
                No parent linked
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
