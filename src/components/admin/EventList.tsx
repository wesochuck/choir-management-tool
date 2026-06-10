import React from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';


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
    <AppCard noPadding className="event-list-card gap-0">
      {events.map((e) => (
        <div 
          key={e.id} 
          className="flex flex-col md:flex-row relative-row clickable-row p-4 border-b border-border hover:bg-primary-light/50 cursor-pointer" 
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
          <div className="event-list-details flex flex-col gap-4">
            <div className="event-list-header flex items-center gap-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${e.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary-light text-primary-deep'}`}>
                {e.type}
              </span>
              {openAuditionEventId === e.id && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-success-bg text-success-text">
                  🎵 Auditions Open
                </span>
              )}
              <span className="text-label text-primary">
                {formatInTimezone(e.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {e.callTime && (
                <span className="inline-flex items-center gap-1 bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-bold text-xs px-[6px] py-[1px] rounded">
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
                className="flex items-center gap-1"
              >
                📍 <strong>{e.expand?.venue?.name || ''}</strong>
              </a>
            </div>
            {e.details && <div className="text-muted text-xs">{e.details}</div>}
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onViewRoster(e);
              }}
              className={e.type === 'Rehearsal' && !e.isOpenForRSVP ? "btn btn-secondary btn-sm font-bold" : "btn btn-primary btn-sm font-bold"}
            >
              RSVP Roster
            </button>
            {onCheckAttendance && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onCheckAttendance(e);
                }}
                className="btn btn-secondary btn-sm font-bold"
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
                className="btn btn-secondary btn-sm font-bold"
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
                className="btn btn-secondary btn-sm w-8 h-8 p-0 rounded-full flex items-center justify-center font-extrabold text-base border border-border"
                title="More Actions"
              >
                ⋮
              </button>

              {activeDropdownId === e.id && (
                <div 
                  className="dropdown-menu shadow-lg absolute right-0 top-full mt-1.5 w-[180px] bg-surface border border-border rounded-md p-1.5 z-[250] flex flex-col gap-0.5"
                >
                  {onOpenPlayer && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onOpenPlayer(e);
                      }}
                      className="dropdown-item btn-sm flex items-center gap-2 w-full px-4 py-2 border-0 bg-transparent text-text text-left cursor-pointer text-[13px] font-semibold transition-colors duration-150 hover:bg-primary-light"
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
                    className="dropdown-item btn-sm flex items-center gap-2 w-full px-4 py-2 border-0 bg-transparent text-text text-left cursor-pointer text-[13px] font-semibold transition-colors duration-150 hover:bg-primary-light"
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
                      className="dropdown-item btn-sm flex items-center gap-2 w-full px-4 py-2 border-0 bg-transparent text-text text-left cursor-pointer text-[13px] font-semibold transition-colors duration-150 hover:bg-primary-light"
                    >
                      👯 Clone Performance
                    </button>
                  )}
                  <hr className="border-0 border-t border-border my-1" />
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      onEdit(e);
                    }}
                    className="dropdown-item btn-sm flex items-center gap-2 w-full px-4 py-2 border-0 bg-transparent text-left cursor-pointer text-[13px] transition-colors duration-150 hover:bg-primary-light text-primary-deep font-bold"
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
        <div className="p-8 text-center">
          <p className="text-muted text-sm">No events scheduled.</p>
        </div>
      )}
    </AppCard>
  );
};
