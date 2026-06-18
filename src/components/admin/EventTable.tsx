import React, { useState, useEffect } from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';
import { Button, Badge, DataTable, type ColumnDef } from '../ui';

interface EventTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onCreate?: () => void;
  onSendMessage: (event: Event) => void;
  onViewRoster: (event: Event) => void;
  onCheckAttendance?: (event: Event) => void;
  onViewSeating?: (event: Event) => void;
  onOpenPlayer?: (event: Event) => void;
  onClone?: (event: Event) => void;
  openAuditionEventId?: string;
}

export const EventTable: React.FC<EventTableProps> = ({
  events,
  onEdit,
  onCreate,
  onSendMessage,
  onViewRoster,
  onCheckAttendance,
  onViewSeating,
  onOpenPlayer,
  onClone,
  openAuditionEventId,
}) => {
  const { timezone } = useChoirSettings();
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDropdownId) return;
    const handler = () => setActiveDropdownId(null);
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handler);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handler);
    };
  }, [activeDropdownId]);

  const columns: ColumnDef<Event>[] = [
    {
      id: 'date',
      header: 'Date',
      enableSorting: true,
      accessorFn: (event) => event.date,
      cell: ({ row }) => {
        const weekday = formatInTimezone(row.original.date, timezone, { weekday: 'short' });
        const day = formatInTimezone(row.original.date, timezone, { day: 'numeric' });
        const month = formatInTimezone(row.original.date, timezone, { month: 'short' });
        const year = formatInTimezone(row.original.date, timezone, { year: 'numeric' });
        return (
          <div className="flex min-w-14 flex-col items-center">
            <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
              {weekday}
            </span>
            <span className="text-text text-2xl leading-tight font-bold">{day}</span>
            <span className="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
              {month} {year}
            </span>
          </div>
        );
      },
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'event',
      header: 'Event',
      cell: ({ row }) => {
        const isPerformance = row.original.type === 'Performance';
        const hasAuditions = openAuditionEventId === row.original.id;
        return (
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={isPerformance ? 'performance' : 'rehearsal'}>{row.original.type}</Badge>
              {hasAuditions && <Badge tone="success">🎵 Auditions Open</Badge>}
              {row.original.callTime && (
                <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px text-xs font-bold text-indigo-700">
                  📢 Call: {formatTime12h(row.original.callTime)}
                </span>
              )}
            </div>
            {row.original.title && (
              <div className="text-text text-base leading-snug font-semibold">
                {row.original.title}
              </div>
            )}
          </div>
        );
      },
      meta: {
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'venue',
      header: 'Venue',
      cell: ({ row }) =>
        row.original.expand?.venue?.name ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.original.expand?.venue?.address || row.original.expand?.venue?.name || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-text-muted hover:text-primary-deep inline-flex w-fit items-center gap-1 text-sm font-medium transition-colors"
          >
            📍{' '}
            <strong className="text-text group-hover:text-primary-deep">
              {row.original.expand?.venue?.name}
            </strong>
          </a>
        ) : null,
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Venue',
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isPerformance = row.original.type === 'Performance';
        const isDropdownOpen = activeDropdownId === row.original.id;

        const overflowItems = [
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
        ].filter((item) => item.show);

        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              onClick={() => onViewRoster(row.original)}
              variant={
                row.original.type === 'Rehearsal' && !row.original.isOpenForRSVP
                  ? 'secondary'
                  : 'primary'
              }
              size="small"
              className="font-bold"
            >
              RSVP Roster
            </Button>

            <div className="relative">
              <button
                type="button"
                className={`flex size-8 cursor-pointer items-center justify-center rounded-full border text-base font-extrabold transition-colors ${
                  isDropdownOpen
                    ? 'border-primary-light bg-primary-light text-primary-deep'
                    : 'border-border text-text-muted hover:bg-primary-light hover:text-primary-deep bg-transparent'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownId(isDropdownOpen ? null : row.original.id);
                }}
              >
                ⋮
              </button>

              {isDropdownOpen && (
                <div
                  className="border-border bg-surface absolute top-[calc(100%+4px)] right-0 z-[250] min-w-[180px] rounded-lg border p-1 shadow-lg"
                  role="menu"
                >
                  {overflowItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="text-text hover:bg-primary-light flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-[13px] font-medium transition-colors"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(null);
                        item.action(row.original);
                      }}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-slate-200" />
                  <button
                    type="button"
                    className="text-primary-deep hover:bg-primary-light flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-[13px] font-semibold transition-colors"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(null);
                      onEdit(row.original);
                    }}
                  >
                    <span aria-hidden="true">✏️</span>
                    <span>Edit Event</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      },
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={events}
      isLoading={false}
      emptyState={{
        title: 'No events scheduled.',
        icon: '📅',
        ...(onCreate
          ? {
              action: (
                <Button onClick={onCreate} variant="primary" size="small">
                  + Create Event
                </Button>
              ),
            }
          : {}),
      }}
      onRowClick={(event) => onEdit(event)}
      defaultSorting={[{ id: 'date', desc: true }]}
      getRowClassName={() => 'hover:bg-primary-light/45 cursor-pointer'}
      hidePagination
      renderMobileCard={(event) => {
        const weekday = formatInTimezone(event.date, timezone, { weekday: 'short' });
        const day = formatInTimezone(event.date, timezone, { day: 'numeric' });
        const month = formatInTimezone(event.date, timezone, { month: 'short' });
        const year = formatInTimezone(event.date, timezone, { year: 'numeric' });
        const isPerformance = event.type === 'Performance';
        const hasAuditions = openAuditionEventId === event.id;
        const isDropdownOpen = activeDropdownId === event.id;

        const overflowItems = [
          { label: 'RSVP Roster', icon: '📋', action: onViewRoster, show: true },
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
          { label: 'Send Message', icon: '✉️', action: onSendMessage, show: true },
          {
            label: 'Clone Performance',
            icon: '👯',
            action: onClone ?? (() => {}),
            show: !!onClone && isPerformance,
          },
        ].filter((item) => item.show);

        return (
          <div
            className="flex cursor-pointer flex-col gap-3 px-4 py-4"
            onClick={() => onEdit(event)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-14 flex-col items-center">
                <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                  {weekday}
                </span>
                <span className="text-text text-2xl leading-tight font-bold">{day}</span>
                <span className="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
                  {month} {year}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={isPerformance ? 'performance' : 'rehearsal'}>{event.type}</Badge>
                  {hasAuditions && <Badge tone="success">🎵 Auditions Open</Badge>}
                  {event.callTime && (
                    <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px text-xs font-bold text-indigo-700">
                      📢 Call: {formatTime12h(event.callTime)}
                    </span>
                  )}
                </div>
                {event.title && (
                  <div className="text-text text-base leading-snug font-semibold">
                    {event.title}
                  </div>
                )}
              </div>
            </div>

            {event.expand?.venue?.name && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.expand?.venue?.address || event.expand?.venue?.name || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-muted hover:text-primary-deep inline-flex w-fit items-center gap-1 text-sm font-medium transition-colors"
              >
                📍{' '}
                <strong className="text-text group-hover:text-primary-deep">
                  {event.expand?.venue?.name}
                </strong>
              </a>
            )}

            <div className="border-border/60 flex items-center justify-end gap-2 border-t pt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewRoster(event);
                }}
                variant={
                  event.type === 'Rehearsal' && !event.isOpenForRSVP ? 'secondary' : 'primary'
                }
                size="small"
                className="font-bold"
              >
                RSVP Roster
              </Button>

              <div className="relative">
                <button
                  type="button"
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-full border text-base font-extrabold transition-colors ${
                    isDropdownOpen
                      ? 'border-primary-light bg-primary-light text-primary-deep'
                      : 'border-border text-text-muted hover:bg-primary-light hover:text-primary-deep bg-transparent'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownId(isDropdownOpen ? null : event.id);
                  }}
                >
                  ⋮
                </button>

                {isDropdownOpen && (
                  <div
                    className="border-border bg-surface absolute right-0 bottom-full z-[250] min-w-[180px] rounded-lg border p-1 shadow-lg"
                    role="menu"
                  >
                    {overflowItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="text-text hover:bg-primary-light flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-[13px] font-medium transition-colors"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(null);
                          item.action(event);
                        }}
                      >
                        <span aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-200" />
                    <button
                      type="button"
                      className="text-primary-deep hover:bg-primary-light flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-[13px] font-semibold transition-colors"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(null);
                        onEdit(event);
                      }}
                    >
                      <span aria-hidden="true">✏️</span>
                      <span>Edit Event</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
};
