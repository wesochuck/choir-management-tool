import React from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';
import { Button } from '../ui';
import { AppCard } from '../common/AppCard';

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
          className="relative flex w-full cursor-pointer flex-col justify-between gap-4 border-b border-border p-4 hover:bg-primary-light/50 md:flex-row md:items-center" 
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
          <div className="event-list-details flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="event-list-header flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${e.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary-light text-primary-deep'}`}>
                {e.type}
              </span>
              {openAuditionEventId === e.id && (
                <span className="inline-flex items-center rounded bg-success-bg px-2 py-0.5 text-xs font-semibold tracking-wider text-success-text uppercase">
                  🎵 Auditions Open
                </span>
              )}
              <span className="text-label text-primary">
                {formatInTimezone(e.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {e.callTime && (
                <span className="inline-flex items-center gap-1 rounded border border-[#c7d2fe] bg-[#eef2ff] px-[6px] py-[1px] text-xs font-bold text-[#4338ca]">
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
          <div className="relative flex shrink-0 items-center gap-2">
            <Button
              onClick={(event) => {
                event.stopPropagation();
                onViewRoster(e);
              }}
              variant={e.type === 'Rehearsal' && !e.isOpenForRSVP ? "secondary" : "primary"}
              size="small"
              className="font-bold"
            >
              RSVP Roster
            </Button>
            {onCheckAttendance && (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onCheckAttendance(e);
                }}
                variant="secondary"
                size="small"
                className="font-bold"
                title="Take attendance for this event"
              >
                📋 Attendance
              </Button>
            )}
            {onViewSeating && e.type === 'Performance' && (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onViewSeating(e);
                }}
                variant="secondary"
                size="small"
                className="font-bold"
                title="Open seating chart for this performance"
              >
                🪑 Seating
              </Button>
            )}

            {/* Actions Dropdown Button Panel */}
            <div className="actions-dropdown-container">
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveDropdownId(activeDropdownId === e.id ? null : e.id);
                }}
                variant="secondary"
                size="small"
                className="flex size-8 items-center justify-center rounded-full border border-border p-0 text-base font-extrabold"
                title="More Actions"
              >
                ⋮
              </Button>

              {activeDropdownId === e.id && (
                <div 
                  className="dropdown-menu absolute top-full right-0 z-[250] mt-1.5 flex w-[180px] flex-col gap-0.5 rounded-md border border-border bg-surface p-1.5 shadow-lg"
                >
                  {onOpenPlayer && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onOpenPlayer(e);
                      }}
                      className="dropdown-item btn-sm flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-[13px] font-semibold text-text transition-colors duration-150 hover:bg-primary-light"
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
                    className="dropdown-item btn-sm flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-[13px] font-semibold text-text transition-colors duration-150 hover:bg-primary-light"
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
                      className="dropdown-item btn-sm flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-[13px] font-semibold text-text transition-colors duration-150 hover:bg-primary-light"
                    >
                      👯 Clone Performance
                    </button>
                  )}
                  <hr className="my-1 border-0 border-t border-border" />
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      onEdit(e);
                    }}
                    className="dropdown-item btn-sm flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-[13px] font-bold text-primary-deep transition-colors duration-150 hover:bg-primary-light"
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
