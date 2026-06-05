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

  return (
    <div className="singer-rsvp-row card">
      <div className="singer-rsvp-row-date">
        <span className="singer-rsvp-row-date-text">{dateString}</span>
        <span className="text-xs text-muted">{timeString}</span>
      </div>

      <div className="singer-rsvp-row-info">
        <span className="singer-rsvp-row-title">{performance.title}</span>
        <span className="text-xs text-muted singer-rsvp-row-venue">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="singer-rsvp-row-venue-text">
            {performance.expand?.venue?.name || 'No venue'}
          </span>
        </span>
      </div>

      <div className="singer-rsvp-controls">
        {isPast && (
          <div className="singer-rsvp-control-group-center">
            <span className="text-xs text-muted singer-rsvp-row-label">Attended</span>
            <StatusBadge label={attendanceDisplay.label} tone={attendanceDisplay.tone} />
          </div>
        )}

        <div className="singer-rsvp-control-group">
          <span className="text-xs text-muted singer-rsvp-row-label">RSVP</span>
          <div className="singer-rsvp-select-container">
            <select
              value={currentRsvp}
              disabled={isSaving}
              onChange={(e) => onRsvpChange(performance.id, e.target.value as EventRoster['rsvp'])}
              className={`rsvp-select rsvp-select-${rsvpTone}`}
            >
              <option value="Pending">Pending</option>
              <option value="Yes">Yes (Attending)</option>
              <option value="No">No (Declined)</option>
            </select>

            {isSaving && (
              <span className="singer-rsvp-saving-spinner">
                <span className="singer-rsvp-spinner"></span>
              </span>
            )}

            {saveError && (
              <span className="singer-rsvp-error">
                {saveError}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
