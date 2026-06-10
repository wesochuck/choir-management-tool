import React from 'react';
import type { Event } from '../../services/eventService';
import type { EventRoster } from '../../services/rosterService';
import { StatusBadge } from '../common/StatusBadge';
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
  const dateString = performanceDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeString = performanceDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const rsvpTone = getRsvpDisplay(currentRsvp).tone;

  const selectToneClass = rsvpTone === 'success'
    ? 'border-success-text bg-success-bg text-success-text'
    : rsvpTone === 'danger'
      ? 'border-danger-text bg-danger-bg text-danger-text'
      : 'border-border bg-surface text-text';

  return (
    <div className="card p-4 flex items-center justify-between gap-4 border border-border bg-bg transition-colors duration-200 hover:border-primary max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
      <div className="flex flex-col gap-0.5 min-w-[100px] max-sm:min-w-full">
        <span className="text-[13px] font-semibold text-text">{dateString}</span>
        <span className="text-xs text-muted">{timeString}</span>
      </div>

      <div className="flex flex-col flex-1 gap-0.5 min-w-[120px] max-sm:min-w-full">
        <span className="font-semibold text-sm text-text">{performance.title}</span>
        <span className="text-xs text-muted flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="truncate max-w-[180px]">
            {performance.expand?.venue?.name || 'No venue'}
          </span>
        </span>
      </div>

      <div className="flex flex-row items-start gap-4 shrink-0 max-sm:mt-1 max-sm:border-t max-sm:border-dashed max-sm:border-border max-sm:pt-2 max-sm:justify-start">
        {isPast && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">Attended</span>
            <StatusBadge label={attendanceDisplay.label} tone={attendanceDisplay.tone} />
          </div>
        )}

        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">RSVP</span>
          <div className="flex flex-row items-center gap-2">
            <select
              value={currentRsvp}
              disabled={isSaving}
              onChange={(e) => onRsvpChange(performance.id, e.target.value as EventRoster['rsvp'])}
              className={`px-2 h-8 min-h-[32px] rounded text-[13px] font-semibold cursor-pointer transition-all duration-200 outline-none border ${selectToneClass}`}
            >
              <option value="Pending">Pending</option>
              <option value="Yes">Yes (Attending)</option>
              <option value="No">No (Declined)</option>
            </select>

            {isSaving && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-black/10 border-t-primary rounded-full inline-block animate-spin"></span>
              </span>
            )}

            {saveError && (
              <span className="text-danger font-semibold">
                {saveError}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
