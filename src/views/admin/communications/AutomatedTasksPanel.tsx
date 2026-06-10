import { useState } from 'react';
import { renderCommunicationTemplate, type CommunicationSettings } from '../../../services/settingsService';
import type { AutomatedTask } from './types';

interface AutomatedTasksPanelProps {
  upcomingTasks: AutomatedTask[];
  pastTasks: AutomatedTask[];
  onDraftTaskMessage: (subjectText: string, bodyText: string, task: AutomatedTask) => void;
  onTriggerReport: (task: AutomatedTask) => Promise<void>;
  onArchiveTask: (task: AutomatedTask) => Promise<void>;
  onViewTaskRecipients: (task: AutomatedTask) => Promise<void>;
  commSettings: CommunicationSettings;
  isSending: boolean;
}

export function AutomatedTasksPanel({
  upcomingTasks,
  pastTasks,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-text">
          Upcoming Automated Tasks
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingTasks.length === 0 && (
            <div className="card">
              <p className="text-muted">No upcoming automated tasks found.</p>
            </div>
          )}
          {upcomingTasks.map((task) => (
            <div key={task.id} className="card border-l-4 border-l-primary">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${
                      task.type === 'Report'
                        ? 'bg-performance-bg text-performance-text'
                        : task.type === 'RSVP Request'
                        ? 'bg-performance-bg text-performance-text'
                        : 'bg-primary-light text-primary-deep'
                    }`}
                  >
                    {task.type}
                  </span>
                  <span className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase">
                    Scheduled
                  </span>
                </span>
                <span className="text-muted text-xs">
                  {task.type === 'RSVP Request'
                    ? 'Pending since:'
                    : task.type === 'Report'
                    ? 'Scheduled for:'
                    : 'Next run:'}{' '}
                  {task.scheduledTime.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <strong className="text-sm font-semibold text-text">
                  {task.event.title || task.event.type}
                </strong>
                <span className="text-muted text-xs">
                  {new Date(task.event.date).toLocaleString()}
                </span>
                {task.type === 'Report' && (
                  <p className="text-muted text-xs">
                    Sent only to admins who have opted in to attendance reports.
                  </p>
                )}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={isSending || isArchiving === task.id}
                  onClick={() => handleArchive(task)}
                >
                  {isArchiving === task.id ? 'Archiving…' : 'Archive'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={isSending || isArchiving === task.id}
                  onClick={() => onViewTaskRecipients(task)}
                >
                  {task.type === 'Report' ? 'View Admin Recipients' : 'View Recipients'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
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
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-text-muted">
          Sent / Past Automated Tasks
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pastTasks.length === 0 && (
            <p className="text-muted text-sm">
              No past automated tasks found in the logs.
            </p>
          )}
          {pastTasks.map((task) => (
            <div
              key={task.id}
              className="card opacity-60"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${
                      task.status === 'Sent'
                        ? 'bg-performance-bg text-performance-text'
                        : task.status === 'Archived'
                        ? 'border border-gray-500/20 bg-gray-500/10 text-gray-600'
                        : 'bg-primary-light text-primary-deep'
                    }`}
                  >
                    {task.type}
                  </span>

                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase`}
                  >
                    {task.status === 'Sent'
                      ? 'Sent'
                      : task.status === 'Archived'
                      ? 'Archived'
                      : 'Passed'}
                  </span>
                </span>
                <span className="text-muted text-xs">
                  {task.status === 'Sent'
                    ? 'Processed at:'
                    : task.status === 'Archived'
                    ? 'Resolved scheduled task:'
                    : 'Scheduled for:'}{' '}
                  {task.scheduledTime.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <strong className="text-sm font-semibold text-text">
                  {task.event.title || task.event.type}
                </strong>
                <span className="text-muted text-xs">
                  {new Date(task.event.date).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
