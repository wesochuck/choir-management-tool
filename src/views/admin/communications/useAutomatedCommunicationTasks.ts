import { useEffect, useMemo, useState } from 'react';
import { communicationService } from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';
import { useRateLimitRetryToast } from '../../../hooks/useRateLimitRetryToast';
import type { AutomatedTask } from './types';
import type { AutomatedTaskStatusMap } from '../../../services/communication/types';

interface UseAutomatedCommunicationTasksArgs {
  events: Event[];
  commSettings: CommunicationSettings;
}

export function useAutomatedCommunicationTasks({
  events,
  commSettings,
}: UseAutomatedCommunicationTasksArgs) {
  const [automatedTaskStatus, setAutomatedTaskStatus] = useState<AutomatedTaskStatusMap>({});

  const {
    onRetry: onStatusRateLimitRetry,
    reset: resetStatusRateLimitToast,
  } = useRateLimitRetryToast(
    'Communications status checks are rate-limited; retrying automatically...',
  );

  useEffect(() => {
    let isCurrent = true;
    if (events.length === 0) return;

    resetStatusRateLimitToast();

    const checkStatuses = async () => {
      const cache = await communicationService.getAutomatedTaskStatuses(
        events.map((event) => event.id),
        { onRetry: onStatusRateLimitRetry },
      );

      if (isCurrent) setAutomatedTaskStatus(cache);
    };

    void checkStatuses();

    return () => {
      isCurrent = false;
    };
  }, [events, onStatusRateLimitRetry, resetStatusRateLimitToast]);

  const { upcomingTasks, pastTasks } = useMemo(() => {
    const upcoming: AutomatedTask[] = [];
    const past: AutomatedTask[] = [];
    const now = new Date();

    events.forEach((event) => {
      const eventDate = new Date(event.date);

      if (event.isOpenForRSVP && eventDate > now) {
        const resolution = automatedTaskStatus[`rsvp-${event.id}`] || 'pending';

        const taskStatus =
          resolution === 'sent'
            ? 'Sent'
            : resolution === 'archived'
            ? 'Archived'
            : 'Scheduled';

        const task: AutomatedTask = {
          id: `rsvp-${event.id}`,
          type: 'RSVP Request',
          event,
          scheduledTime: event.created
            ? new Date(event.created)
            : event.date
            ? new Date(event.date)
            : new Date(),
          status: taskStatus,
        };

        if (resolution === 'pending') {
          upcoming.push(task);
        } else {
          past.push(task);
        }
      }

      if (commSettings.reminderEnabled) {
        const scheduledTime = new Date(
          eventDate.getTime() - commSettings.reminderHoursBefore * 60 * 60 * 1000,
        );
        const resolution = automatedTaskStatus[`reminder-${event.id}`] || 'pending';
        const isResolved = resolution !== 'pending';

        const taskStatus =
          resolution === 'sent'
            ? 'Sent'
            : resolution === 'archived'
            ? 'Archived'
            : 'Scheduled';

        const task: AutomatedTask = {
          id: `reminder-${event.id}`,
          type: 'Reminder',
          event,
          scheduledTime,
          status: taskStatus,
        };

        if (isResolved || scheduledTime < now) past.push(task);
        else upcoming.push(task);
      }

      if (commSettings.reportEnabled) {
        const scheduledTime = new Date(
          eventDate.getTime() + commSettings.reportHoursAfter * 60 * 60 * 1000,
        );
        const resolution = automatedTaskStatus[`report-${event.id}`] || 'pending';
        const isResolved = resolution !== 'pending';

        const taskStatus =
          resolution === 'sent'
            ? 'Sent'
            : resolution === 'archived'
            ? 'Archived'
            : 'Scheduled';

        const task: AutomatedTask = {
          id: `report-${event.id}`,
          type: 'Report',
          event,
          scheduledTime,
          status: taskStatus,
        };

        if (isResolved || scheduledTime < now) past.push(task);
        else upcoming.push(task);
      }
    });

    return {
      upcomingTasks: upcoming.sort(
        (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime(),
      ),
      pastTasks: past.sort(
        (a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime(),
      ),
    };
  }, [events, commSettings, automatedTaskStatus]);

  return {
    automatedTaskStatus,
    setAutomatedTaskStatus,
    upcomingTasks,
    pastTasks,
  };
}
