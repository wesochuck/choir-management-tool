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
      cell: (_, task) => (
        <span className="whitespace-nowrap">{task.scheduledTime.toLocaleString()}</span>
      ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Scheduled',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (_, task) => (
        <span
          className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${typeColors[task.type] || 'bg-gray-100 text-gray-700'}`}
        >
          {task.type}
        </span>
      ),
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'event',
      header: 'Event',
      cell: (_, task) => (
        <span className="max-w-[250px] truncate font-semibold">
          {task.event.title || task.event.type}
        </span>
      ),
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'eventDate',
      header: 'Event Date',
      cell: (_, task) => (
        <span className="whitespace-nowrap">{new Date(task.event.date).toLocaleString()}</span>
      ),
      cardSection: 1,
      cardSide: 'right',
      cardLabel: 'Event',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (_, task) => (
        <span
          className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${statusColors[task.status] || 'bg-gray-100 text-gray-700'}`}
        >
          {task.status}
        </span>
      ),
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (_, task) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="small"
            disabled={isSending || isArchiving === task.id}
            onClick={() => handleArchive(task)}
          >
            {isArchiving === task.id ? 'Archiving…' : 'Archive'}
          </Button>
          <Button
            variant="outline"
            size="small"
            disabled={isSending || isArchiving === task.id}
            onClick={() => onViewTaskRecipients(task)}
          >
            {task.type === 'Report' ? 'View Admins' : 'Recipients'}
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={isSending || isArchiving === task.id}
            onClick={async () => {
              if (task.type === 'Report') {
                await onTriggerReport(task);
              } else {
                const values = {
                  eventTitle: task.event.title || task.event.type,
                  eventType: task.event.type,
                  eventDate: new Date(task.event.date).toLocaleString(),
                  eventLocation: task.event.expand?.venue?.name || 'TBD',
                  eventDetails: task.event.details || '',
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
                onDraftTaskMessage(subjectText, bodyText, task);
              }
            }}
          >
            {task.type === 'Report' ? 'Send Now' : 'Open Compose'}
          </Button>
        </div>
      ),
      cardSection: 1,
      cardSide: 'right',
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
