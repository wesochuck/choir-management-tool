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
    <div className="flex-col comm-automated-container">
      <div className="flex-col comm-automated-section">
        <h3 className="text-headline comm-automated-section-title">
          Upcoming Automated Tasks
        </h3>
        <div className="automated-grid">
          {upcomingTasks.length === 0 && (
            <div className="card comm-automated-empty">
              <p className="text-muted">No upcoming automated tasks found.</p>
            </div>
          )}
          {upcomingTasks.map((task) => (
            <div key={task.id} className="card automated-task-card comm-automated-card-active">
              <div className="automated-task-header">
                <span className="automated-task-status-group">
                  <span
                    className={`badge automated-task-type-badge ${
                      task.type === 'Report'
                        ? 'badge-concert'
                        : task.type === 'RSVP Request'
                        ? 'badge-concert'
                        : 'badge-rehearsal'
                    }`}
                  >
                    {task.type}
                  </span>
                  <span className="badge automated-task-resolution-badge automated-task-resolution-scheduled">
                    Scheduled
                  </span>
                </span>
                <span className="automated-task-timestamp text-muted text-xs">
                  {task.type === 'RSVP Request'
                    ? 'Pending since:'
                    : task.type === 'Report'
                    ? 'Scheduled for:'
                    : 'Next run:'}{' '}
                  {task.scheduledTime.toLocaleString()}
                </span>
              </div>
              <div className="flex-col comm-automated-info">
                <strong className="comm-automated-name">
                  {task.event.title || task.event.type}
                </strong>
                <span className="text-muted text-xs">
                  {new Date(task.event.date).toLocaleString()}
                </span>
                {task.type === 'Report' && (
                  <p className="text-muted text-xs comm-automated-desc">
                    Sent only to admins who have opted in to attendance reports.
                  </p>
                )}
              </div>
              <div className="automated-task-footer">
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

      <div className="flex-col comm-automated-section">
        <h3 className="text-headline comm-automated-section-title-inactive">
          Sent / Past Automated Tasks
        </h3>
        <div className="automated-grid">
          {pastTasks.length === 0 && (
            <p className="text-muted text-sm comm-automated-empty">
              No past automated tasks found in the logs.
            </p>
          )}
          {pastTasks.map((task) => (
            <div
              key={task.id}
              className="card automated-task-card comm-automated-card-inactive"
            >
              <div className="automated-task-header">
                <span className="automated-task-status-group">
                  <span
                    className={`badge automated-task-type-badge ${
                      task.status === 'Sent'
                        ? 'badge-concert'
                        : task.status === 'Archived'
                        ? 'badge-muted'
                        : 'badge-rehearsal'
                    }`}
                  >
                    {task.type}
                  </span>

                  <span
                    className={`badge automated-task-resolution-badge automated-task-resolution-${task.status.toLowerCase()}`}
                  >
                    {task.status === 'Sent'
                      ? 'Sent'
                      : task.status === 'Archived'
                      ? 'Archived'
                      : 'Passed'}
                  </span>
                </span>
                <span className="automated-task-timestamp text-muted text-xs">
                  {task.status === 'Sent'
                    ? 'Processed at:'
                    : task.status === 'Archived'
                    ? 'Resolved scheduled task:'
                    : 'Scheduled for:'}{' '}
                  {task.scheduledTime.toLocaleString()}
                </span>
              </div>
              <div className="flex-col comm-automated-info">
                <strong className="comm-automated-name">
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
