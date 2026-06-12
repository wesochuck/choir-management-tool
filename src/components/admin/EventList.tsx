import React from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';
import { Button, Badge } from '../ui';
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
  openAuditionEventId,
}) => {
  const { timezone } = useChoirSettings();
  const [activeDropdownId, setActiveDropdownId] = React.useState<string | null>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!activeDropdownId) return;
    const handleOutsideClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (!target.closest('[data-event-overflow-anchor]')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeDropdownId]);

  if (events.length === 0) {
    return (
      <AppCard noPadding>
        <div className="p-8 text-center text-sm text-text-muted">
          No events scheduled.
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard noPadding className="gap-0">
      {events.map((e) => {
        const weekday = formatInTimezone(e.date, timezone, { weekday: 'short' });
        const day = formatInTimezone(e.date, timezone, { day: 'numeric' });
        const month = formatInTimezone(e.date, timezone, { month: 'short' });
        const year = formatInTimezone(e.date, timezone, { year: 'numeric' });
        const isPerformance = e.type === 'Performance';
        const hasAuditions = openAuditionEventId === e.id;
        const isDropdownOpen = activeDropdownId === e.id;

        // Build overflow menu items
        const overflowItems: Array<{
          label: string;
          icon: string;
          action: (event: Event) => void;
          show: boolean;
        }> = [
          {
            label: 'RSVP Roster',
            icon: '📋',
            action: onViewRoster,
            show: true,
          },
          {
            label: 'Attendance',
            icon: '✅',
            action: onCheckAttendance ?? (() => {}),
            show: !!onCheckAttendance,
          },
          {
            label: 'Seating Chart',
            icon: '🪑',
            action: onViewSeating ?? (() => {}),
            show: !!onViewSeating && isPerformance,
          },
          {
            label: 'Practice Player',
            icon: '🎧',
            action: onOpenPlayer ?? (() => {}),
            show: !!onOpenPlayer,
          },
          {
            label: 'Send Message',
            icon: '✉️',
            action: onSendMessage,
            show: true,
          },
          {
            label: 'Clone Performance',
            icon: '👯',
            action: onClone ?? (() => {}),
            show: !!onClone && isPerformance,
          },
        ];

        const visibleOverflow = overflowItems.filter((item) => item.show);

        return (
          <div
            key={e.id}
            className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border px-6 py-5 transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl last:border-b-0 hover:bg-primary-light/50 max-sm:grid-cols-[auto_1fr] max-sm:gap-x-4 max-sm:gap-y-2 max-sm:px-4"
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
            {/* Date column */}
            <div className="flex min-w-14 flex-col items-center">
              <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">{weekday}</span>
              <span className="text-2xl leading-tight font-bold text-text">{day}</span>
              <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">{month} {year}</span>
            </div>

            {/* Details column */}
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={isPerformance ? 'performance' : 'rehearsal'}>
                  {e.type}
                </Badge>
                {hasAuditions && (
                  <Badge tone="success">🎵 Auditions Open</Badge>
                )}
                {e.callTime && (
                  <span className="inline-flex items-center gap-1 rounded border border-[#c7d2fe] bg-[#eef2ff] px-1.5 py-px text-xs font-bold text-[#4338ca]">
                    📢 Call: {formatTime12h(e.callTime)}
                  </span>
                )}
              </div>

              {e.title && (
                <div className="text-base leading-snug font-semibold text-text">{e.title}</div>
              )}

              {(e.expand?.venue?.name) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.expand?.venue?.address || e.expand?.venue?.name || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex w-fit items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-primary-deep"
                >
                  📍 <strong className="text-text group-hover:text-primary-deep">{e.expand?.venue?.name}</strong>
                </a>
              )}

              {e.details && (
                <div className="line-clamp-2 text-xs leading-relaxed text-text-muted">{e.details}</div>
              )}
            </div>

            {/* Actions column */}
            <div className="flex items-center gap-2 max-sm:col-span-full max-sm:justify-end max-sm:border-t max-sm:border-border/60 max-sm:pt-2">
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onViewRoster(e);
                }}
                variant={e.type === 'Rehearsal' && !e.isOpenForRSVP ? 'secondary' : 'primary'}
                size="small"
                className="font-bold"
              >
                RSVP Roster
              </Button>

              <div className="relative" data-event-overflow-anchor>
                <button
                  type="button"
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-full border text-base font-extrabold transition-colors duration-150 ${
                    isDropdownOpen
                      ? 'border-primary-light bg-primary-light text-primary-deep'
                      : 'border-border bg-transparent text-text-muted hover:bg-primary-light hover:text-primary-deep'
                  }`}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="More actions"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveDropdownId(isDropdownOpen ? null : e.id);
                  }}
                >
                  ⋮
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute top-[calc(100%+4px)] right-0 z-[250] min-w-[180px] rounded-lg border border-border bg-surface p-1 shadow-lg"
                    role="menu"
                  >
                    {visibleOverflow.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-[13px] font-medium text-text transition-colors duration-100 hover:bg-primary-light"
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveDropdownId(null);
                          item.action(e);
                        }}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                    <hr className="my-1 border-0 border-t border-border" />
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-[13px] font-semibold text-primary-deep transition-colors duration-100 hover:bg-primary-light"
                      role="menuitem"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onEdit(e);
                      }}
                    >
                      <span>✏️</span>
                      Edit Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </AppCard>
  );
};
