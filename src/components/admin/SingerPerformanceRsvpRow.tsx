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

const getSelectStyle = (val: EventRoster['rsvp']) => {
  const base: React.CSSProperties = {
    padding: '0 8px',
    height: '32px',
    minHeight: '32px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 600,
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  };

  const tone = getRsvpDisplay(val).tone;
  if (tone === 'success') {
    return {
      ...base,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      color: '#15803d',
      border: '1px solid rgba(34, 197, 94, 0.3)',
    };
  }

  if (tone === 'danger') {
    return {
      ...base,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#b91c1c',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
  }

  return {
    ...base,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    color: '#4b5563',
    border: '1px solid rgba(107, 114, 128, 0.2)',
  };
};

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

  return (
    <div
      className="singer-rsvp-row card"
      style={{
        padding: 'var(--space-md)',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        boxShadow: 'none',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg)',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <style>{`
        @media (max-width: 600px) {
          .singer-rsvp-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: var(--space-sm) !important;
          }
          .singer-rsvp-row > div {
            min-width: 100% !important;
          }
          .singer-rsvp-controls {
            margin-top: var(--space-xs);
            border-top: 1px dashed var(--border);
            padding-top: var(--space-sm);
            justify-content: flex-start !important;
          }
        }
      `}</style>
      <div className="flex-col" style={{ gap: '2px', minWidth: '100px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{dateString}</span>
        <span className="text-xs text-muted">{timeString}</span>
      </div>

      <div className="flex-col" style={{ flex: 1, gap: '2px', minWidth: '120px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{performance.title}</span>
        <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
            {performance.expand?.venue?.name || 'No venue'}
          </span>
        </span>
      </div>

      <div className="singer-rsvp-controls flex-row" style={{ alignItems: 'flex-start', gap: 'var(--space-md)', flexShrink: 0 }}>
        {isPast && (
          <div className="flex-col" style={{ alignItems: 'center', gap: '2px' }}>
            <span className="text-xs text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Attended</span>
            <StatusBadge label={attendanceDisplay.label} tone={attendanceDisplay.tone} />
          </div>
        )}

        <div className="flex-col" style={{ alignItems: 'flex-start', gap: '2px' }}>
          <span className="text-xs text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>RSVP</span>
          <div className="flex-row" style={{ alignItems: 'center', gap: '8px' }}>
            <select
              value={currentRsvp}
              disabled={isSaving}
              onChange={(e) => onRsvpChange(performance.id, e.target.value as EventRoster['rsvp'])}
              style={getSelectStyle(currentRsvp)}
            >
              <option value="Pending">Pending</option>
              <option value="Yes">Yes (Attending)</option>
              <option value="No">No (Declined)</option>
            </select>

            {isSaving && (
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  className="saving-spinner"
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    borderTop: '2px solid var(--primary)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }}
                ></span>
              </span>
            )}

            {saveError && (
              <span className="text-xs" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                {saveError}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
