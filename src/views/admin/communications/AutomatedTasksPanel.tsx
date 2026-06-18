import { useState } from 'react';
import {
  renderCommunicationTemplate,
  type CommunicationSettings,
} from '../../../services/settingsService';
import type { AutomatedTask } from './types';
import { Button, DataTable, type ColumnDef } from '../../../components/ui';

interface AutomatedTasksPanelProps {
  upcomingTasks: AutomatedTask[];
  onDraftTaskMessage: (subjectText: string, bodyText: string, task: AutomatedTask) => void;
  onTriggerReport: (task: AutomatedTask) => Promise<void>;
  onArchiveTask: (task: AutomatedTask) => Promise<void>;
  onViewTaskRecipients: (task: AutomatedTask) => Promise<void>;
  commSettings: CommunicationSettings;
  isSending: boolean;
}

export function AutomatedTasksPanel({
  upcomingTasks,
  onDraftTaskMessage,
  onTriggerReport,
  onArchiveTask,
  onViewTaskRecipients,
  commSettings,
  isSending,
}: AutomatedTasksPanelProps) {
  const [isArchiving, setIsArchiving] = useState<string | null>(null);

  const handleArchive = async (task: AutomatedTask) => {
    if (isArchiving) return;
    setIsArchiving(task.id);
    try {
      await onArchiveTask(task);
    } finally {
      setIsArchiving(null);
    }
  };

  const typeColors: Record<string, string> = {
    Reminder: 'bg-amber-100 text-amber-800',
    Report: 'bg-blue-100 text-blue-800',
    'RSVP Request': 'bg-green-100 text-green-800',
    'Ticket Buyer Reminder': 'bg-purple-100 text-purple-800',
  };

  const statusColors: Record<string, string> = {
    Scheduled: 'bg-primary-light text-primary-deep',
    Sent: 'bg-success-bg text-success-text',
    Archived: 'bg-gray-100 text-gray-600',
  };

  const columns: ColumnDef<AutomatedTask>[] = [
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.scheduledTime.toLocaleString()}</span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Scheduled',
      },
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${typeColors[row.original.type] || 'bg-gray-100 text-gray-700'}`}
        >
          {row.original.type}
        </span>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'event',
      header: 'Event',
      cell: ({ row }) => (
        <span className="block max-w-[280px] truncate font-semibold">
          {row.original.event.title || row.original.event.type}
        </span>
      ),
      meta: {
        cellClassName: 'min-w-0 max-w-[280px]',
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'eventDate',
      header: 'Event Date',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {new Date(row.original.event.date).toLocaleString()}
        </span>
      ),
      meta: {
        hideBelow: 'xl',
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'Event',
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${statusColors[row.original.status] || 'bg-gray-100 text-gray-700'}`}
        >
          {row.original.status}
        </span>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div
          className="flex max-w-[360px] flex-wrap justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="small"
            disabled={isSending || isArchiving === row.original.id}
            onClick={() => handleArchive(row.original)}
          >
            {isArchiving === row.original.id ? 'Archiving…' : 'Archive'}
          </Button>
          <Button
            variant="outline"
            size="small"
            disabled={isSending || isArchiving === row.original.id}
            onClick={() => onViewTaskRecipients(row.original)}
          >
            <span className="hidden xl:inline">
              {row.original.type === 'Report' ? 'View Admins' : 'Recipients'}
            </span>
            <span className="xl:hidden">
              {row.original.type === 'Report' ? 'Admins' : 'Recipients'}
            </span>
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={isSending || isArchiving === row.original.id}
            onClick={async () => {
              if (row.original.type === 'Report') {
                await onTriggerReport(row.original);
              } else {
                const values = {
                  eventTitle: row.original.event.title || row.original.event.type,
                  eventType: row.original.event.type,
                  eventDate: new Date(row.original.event.date).toLocaleString(),
                  eventLocation: row.original.event.expand?.venue?.name || 'TBD',
                  eventDetails: row.original.event.details || '',
                  singerName: '{singerName}',
                  rsvpLinks: '{{RSVP_LINKS}}',
                  playerLink: '{{PLAYER_LINK}}',
                };
                const subjectText = renderCommunicationTemplate(
                  commSettings.reminderSubjectTemplate,
                  values
                );
                const bodyText = renderCommunicationTemplate(
                  commSettings.reminderBodyTemplate,
                  values
                );
                onDraftTaskMessage(subjectText, bodyText, row.original);
              }
            }}
          >
            <span className="hidden xl:inline">
              {row.original.type === 'Report' ? 'Send Now' : 'Open Compose'}
            </span>
            <span className="xl:hidden">{row.original.type === 'Report' ? 'Send' : 'Compose'}</span>
          </Button>
        </div>
      ),
      meta: {
        align: 'right',
        headerClassName: 'w-[360px] max-w-[360px]',
        cellClassName: 'whitespace-normal w-[360px] max-w-[360px]',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-text text-lg font-semibold">Upcoming Automated Tasks</h3>
      <DataTable
        columns={columns}
        data={upcomingTasks}
        isLoading={false}
        emptyState={{
          title: 'No upcoming automated tasks found.',
          icon: (
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          ),
        }}
        hidePagination
      />
    </div>
  );
}
