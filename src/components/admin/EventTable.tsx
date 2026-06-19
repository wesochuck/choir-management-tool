import React from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';
import {
  Button,
  Badge,
  DataTable,
  Dropdown,
  DropdownMenu,
  DropdownMenuItem,
  type ColumnDef,
} from '../ui';

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

            <Dropdown
              trigger={
                <button
                  type="button"
                  className="border-border text-text-muted hover:bg-primary-light hover:text-primary-deep flex size-8 cursor-pointer items-center justify-center rounded-full border bg-transparent text-base font-extrabold transition-colors"
                >
                  ⋮
                </button>
              }
            >
              <DropdownMenu>
                {overflowItems.map((item) => (
                  <DropdownMenuItem key={item.label} onClick={() => item.action(row.original)}>
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
                <div className="my-1 border-t border-slate-200" />
                <DropdownMenuItem
                  className="text-primary-deep font-semibold"
                  onClick={() => onEdit(row.original)}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">✏️</span>
                    <span>Edit Event</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenu>
            </Dropdown>
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
    />
  );
};
