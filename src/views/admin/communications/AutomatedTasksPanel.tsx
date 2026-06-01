import { communicationService } from '../../../services/communicationService';
import { renderCommunicationTemplate, type CommunicationSettings } from '../../../services/settingsService';
import type { AutomatedTask } from './types';
import type { CommunicationRecipient } from '../../../services/communicationService';

interface AutomatedTasksPanelProps {
  upcomingTasks: AutomatedTask[];
  pastTasks: AutomatedTask[];
  onDraftTaskMessage: (subjectText: string, bodyText: string, task: AutomatedTask) => void;
  onTriggerReport: (task: AutomatedTask) => Promise<void>;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  commSettings: CommunicationSettings;
  isSending: boolean;
}

export function AutomatedTasksPanel({
  upcomingTasks,
  pastTasks,
  onDraftTaskMessage,
  onTriggerReport,
  onViewRecipients,
  commSettings,
  isSending,
}: AutomatedTasksPanelProps) {
  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <h3
          className="text-headline"
          style={{ fontSize: '1.1rem', color: 'var(--primary-deep)' }}
        >
          Upcoming Automated Tasks
        </h3>
        <div className="automated-grid">
          {upcomingTasks.length === 0 && (
            <div
              className="card"
              style={{
                padding: 'var(--space-xl)',
                textAlign: 'center',
                gridColumn: '1 / -1',
                border: '1px dashed var(--border)',
              }}
            >
              <p className="text-muted">No upcoming automated tasks found.</p>
            </div>
          )}
          {upcomingTasks.map((task) => (
            <div key={task.id} className="card automated-task-card">
              <div className="automated-task-header">
                <span
                  className={`badge ${
                    task.type === 'Report'
                      ? 'badge-concert'
                      : task.type === 'RSVP Request'
                      ? 'badge-concert'
                      : 'badge-rehearsal'
                  }`}
                  style={{
                    backgroundColor: task.type === 'RSVP Request' ? '#3b82f6' : undefined,
                    color: task.type === 'RSVP Request' ? 'white' : undefined,
                  }}
                >
                  {task.type}
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
              <div className="flex-col" style={{ gap: '2px' }}>
                <strong style={{ fontSize: '1rem' }}>
                  {task.event.title || task.event.type}
                </strong>
                <span className="text-muted text-xs">
                  {new Date(task.event.date).toLocaleString()}
                </span>
              </div>
              <div className="automated-task-footer">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    const r = await communicationService.resolveRecipients({
                      eventId: task.event.id,
                      rsvp: task.type === 'RSVP Request' ? 'Pending' : 'All',
                      voiceParts: [],
                      globalStatus: 'Active',
                    });
                    onViewRecipients(
                      r,
                      `Expected Recipients for ${task.event.title || task.event.type}`
                    );
                  }}
                >
                  View Recipients
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={isSending}
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

      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <h3
          className="text-headline"
          style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}
        >
          Sent / Past Automated Tasks
        </h3>
        <div className="automated-grid">
          {pastTasks.length === 0 && (
            <p className="text-muted text-sm" style={{ gridColumn: '1 / -1' }}>
              No past automated tasks found in the logs.
            </p>
          )}
          {pastTasks.map((task) => (
            <div
              key={task.id}
              className="card automated-task-card"
              style={{ opacity: 0.8 }}
            >
              <div className="automated-task-header">
                <span
                  className={`badge ${
                    task.status === 'Sent' ? 'badge-concert' : 'badge-rehearsal'
                  }`}
                  style={{
                    backgroundColor: task.status === 'Sent' ? undefined : 'var(--border)',
                  }}
                >
                  {task.type} {task.status === 'Sent' ? '(Sent)' : '(Passed)'}
                </span>
                <span className="text-muted text-xs">
                  {task.status === 'Sent' ? 'Processed at:' : 'Scheduled for:'}{' '}
                  {task.scheduledTime.toLocaleString()}
                </span>
              </div>
              <div className="flex-col" style={{ gap: '2px' }}>
                <strong style={{ fontSize: '1rem' }}>
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
