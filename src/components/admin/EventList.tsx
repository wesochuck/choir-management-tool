import React from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';
import './EventList.css';

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onSendMessage: (event: Event) => void;
  onViewRoster: (event: Event) => void;
  onCheckAttendance?: (event: Event) => void;
  onViewSeating?: (event: Event) => void;
  onOpenPlayer?: (event: Event) => void;
  onClone?: (event: Event) => void;
  openAuditionEventId?: string;
}
import { AppCard } from '../common/AppCard';

export const EventList: React.FC<EventListProps> = ({ 
  events, 
  onEdit, 
  onSendMessage, 
  onViewRoster, 
  onCheckAttendance,
  onViewSeating,
  onOpenPlayer,
  onClone,
  openAuditionEventId
}) => {
  const { timezone } = useChoirSettings();
  const [activeDropdownId, setActiveDropdownId] = React.useState<string | null>(null);

  // Click outside to dismiss open dropdowns
  React.useEffect(() => {
    if (!activeDropdownId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeDropdownId]);

  return (
    <AppCard noPadding className="event-list-card">
      {events.map((e) => (
        <div 
          key={e.id} 
          className="flex-responsive relative-row clickable-row event-row" 
          onClick={() => onEdit(e)}
          role="button"
          tabIndex={0}
          aria-label={`Edit ${e.title || e.type} event`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onEdit(e);
            }
          }}
        >
          <div className="event-list-details">
            <div className="event-list-header">
              <span className={`badge ${e.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`}>
                {e.type}
              </span>
              {openAuditionEventId === e.id && (
                <span className="badge badge-success event-list-date">
                  🎵 Auditions Open
                </span>
              )}
              <span className="text-label event-list-venue">
                {formatInTimezone(e.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {e.callTime && (
                <span className="badge event-list-call-time-badge">
                  📢 Call: {formatTime12h(e.callTime)}
                </span>
              )}
            </div>
            {e.title && <div className="text-headline">{e.title}</div>}
            <div className="text-label">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.expand?.venue?.address || e.expand?.venue?.name || '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="event-list-actions"
              >
                📍 <strong>{e.expand?.venue?.name || ''}</strong>
              </a>
            </div>
            {e.details && <div className="text-muted text-xs">{e.details}</div>}
          </div>
          <div className="admin-event-actions event-list-dropdown-container">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onViewRoster(e);
              }}
              className={e.type === 'Rehearsal' && !e.isOpenForRSVP ? "btn btn-secondary btn-sm event-list-date" : "btn btn-primary btn-sm event-list-date"}
            >
              RSVP Roster
            </button>
            {onCheckAttendance && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onCheckAttendance(e);
                }}
                className="btn btn-secondary btn-sm event-list-date"
                title="Take attendance for this event"
              >
                📋 Attendance
              </button>
            )}
            {onViewSeating && e.type === 'Performance' && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onViewSeating(e);
                }}
                className="btn btn-secondary btn-sm event-list-date"
                title="Open seating chart for this performance"
              >
                🪑 Seating
              </button>
            )}

            {/* Actions Dropdown Button Panel */}
            <div className="actions-dropdown-container">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveDropdownId(activeDropdownId === e.id ? null : e.id);
                }}
                className="btn btn-secondary btn-sm event-list-dropdown-toggle"
                title="More Actions"
              >
                ⋮
              </button>

              {activeDropdownId === e.id && (
                <div 
                  className="dropdown-menu shadow-lg event-list-dropdown-menu"
                >
                  {onOpenPlayer && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onOpenPlayer(e);
                      }}
                      className="dropdown-item btn-sm event-list-dropdown-item"
                    >
                      🎧 Practice Player
                    </button>
                  )}
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      onSendMessage(e);
                    }}
                    className="dropdown-item btn-sm event-list-dropdown-item"
                  >
                    ✉️ Send Message
                  </button>
                  {onClone && e.type === 'Performance' && (
                    <button 
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onClone(e);
                      }}
                      className="dropdown-item btn-sm event-list-dropdown-item"
                    >
                      👯 Clone Performance
                    </button>
                  )}
                  <hr className="event-list-dropdown-separator" />
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      onEdit(e);
                    }}
                    className="dropdown-item btn-sm event-list-dropdown-item event-list-dropdown-item-primary"
                  >
                    ✏️ Edit Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {events.length === 0 && (
        <div className="event-list-empty">
          <p className="text-muted text-sm">No events scheduled.</p>
        </div>
      )}
    </AppCard>
  );
};
