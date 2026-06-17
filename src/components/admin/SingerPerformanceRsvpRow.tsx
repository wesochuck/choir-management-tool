import React from 'react';
import type { Event } from '../../services/eventService';
import type { EventRoster } from '../../services/rosterService';
import { Badge, Select } from '../ui';
import { getAttendanceDisplay, getRsvpDisplay } from '../../lib/statusDisplay';

interface SingerPerformanceRsvpRowProps {
  performance: Event;
  rosterEntry?: EventRoster;
  isPast: boolean;
  isSaving: boolean;
  saveError?: string;
  onRsvpChange: (eventId: string, newRsvp: EventRoster['rsvp']) => void;
}

export const SingerPerformanceRsvpRow: React.FC<SingerPerformanceRsvpRowProps> = ({
  performance,
  rosterEntry,
  isPast,
  isSaving,
  saveError,
  onRsvpChange,
}) => {
  const currentRsvp = rosterEntry?.rsvp ?? 'Pending';
  const currentAttendance = rosterEntry?.attendance ?? 'Pending';
  const attendanceDisplay = getAttendanceDisplay(currentAttendance);

  const performanceDate = new Date(performance.date);
  const dateString = performanceDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeString = performanceDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const rsvpTone = getRsvpDisplay(currentRsvp).tone;

  const selectToneClass =
    rsvpTone === 'success'
      ? 'border-success-text bg-success-bg text-success-text'
      : rsvpTone === 'danger'
        ? 'border-danger-text bg-danger-bg text-danger-text'
        : 'border-border bg-surface text-text';

  return (
    <div className="border-border bg-bg hover:border-primary flex items-center justify-between gap-4 rounded-xl border p-4 shadow-sm transition-colors duration-200 max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
      <div className="flex min-w-[100px] flex-col gap-0.5 max-sm:min-w-full">
        <span className="text-text text-[13px] font-semibold">{dateString}</span>
        <span className="text-muted text-xs">{timeString}</span>
      </div>

      <div className="flex min-w-[120px] flex-1 flex-col gap-0.5 max-sm:min-w-full">
        <span className="text-text text-sm font-semibold">{performance.title}</span>
        <span className="text-muted flex items-center gap-1 text-xs">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="max-w-[180px] truncate">
            {performance.expand?.venue?.name || 'No venue'}
          </span>
        </span>
      </div>

      <div className="max-sm:border-border flex shrink-0 flex-row items-start gap-4 max-sm:mt-1 max-sm:justify-start max-sm:border-t max-sm:border-dashed max-sm:pt-2">
        {isPast && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-muted text-[10px] font-semibold tracking-wider uppercase">
              Attended
            </span>
            <Badge label={attendanceDisplay.label} tone={attendanceDisplay.tone} />
          </div>
        )}

        <div className="flex flex-col items-start gap-0.5">
          <span className="text-muted text-[10px] font-semibold tracking-wider uppercase">
            RSVP
          </span>
          <div className="flex flex-row items-center gap-2">
            <Select
              value={currentRsvp}
              disabled={isSaving}
              onChange={(e) => onRsvpChange(performance.id, e.target.value as EventRoster['rsvp'])}
              size="compact"
              className={`!font-semibold ${selectToneClass}`}
            >
              <option value="Pending">Pending</option>
              <option value="Yes">Yes (Attending)</option>
              <option value="No">No (Declined)</option>
            </Select>

            {isSaving && (
              <span className="flex items-center gap-1">
                <span className="border-t-primary inline-block size-3 animate-spin rounded-full border-2 border-black/10"></span>
              </span>
            )}

            {saveError && <span className="text-danger font-semibold">{saveError}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
