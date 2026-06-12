import { useState } from 'react';
import { renderCommunicationTemplate, type CommunicationSettings } from '../../../services/settingsService';
import type { AutomatedTask } from './types';
import { Button } from '../../../components/ui';

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

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-text">Upcoming Automated Tasks</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
              <th className="p-3 px-4 text-left">Date</th>
              <th className="p-3 px-4 text-left">Type</th>
              <th className="p-3 px-4 text-left">Event</th>
              <th className="p-3 px-4 text-left">Event Date</th>
              <th className="p-3 px-4 text-left">Status</th>
              <th className="p-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {upcomingTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No upcoming automated tasks found.
                </td>
              </tr>
            ) : (
              upcomingTasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-200 text-sm">
                  <td className="p-3 px-4 whitespace-nowrap">
                    {task.scheduledTime.toLocaleString()}
                  </td>
                  <td className="p-3 px-4">
                    <span className="inline-flex w-fit items-center rounded bg-danger-bg px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-danger-text uppercase">
                      {task.type}
                    </span>
                  </td>
                  <td className="max-w-[250px] truncate p-3 px-4 font-semibold">
                    {task.event.title || task.event.type}
                  </td>
                  <td className="p-3 px-4 whitespace-nowrap">
                    {new Date(task.event.date).toLocaleString()}
                  </td>
                  <td className="p-3 px-4">
                    <span className="inline-flex w-fit items-center rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary-deep uppercase">
                      {task.status}
                    </span>
                  </td>
                  <td className="p-3 px-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
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
                              values,
                            );
                            const bodyText = renderCommunicationTemplate(
                              commSettings.reminderBodyTemplate,
                              values,
                            );
                            onDraftTaskMessage(subjectText, bodyText, task);
                          }
                        }}
                      >
                        {task.type === 'Report' ? 'Send Now' : 'Open Compose'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
