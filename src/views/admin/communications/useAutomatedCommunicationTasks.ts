import { useEffect, useMemo, useState } from 'react';
import { communicationService } from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';
import { useRateLimitRetryToast } from '../../../hooks/useRateLimitRetryToast';
import type { AutomatedTask } from './types';

interface UseAutomatedCommunicationTasksArgs {
  events: Event[];
  commSettings: CommunicationSettings;
}

export function useAutomatedCommunicationTasks({
  events,
  commSettings,
}: UseAutomatedCommunicationTasksArgs) {
  const [sentTaskStatus, setSentTaskStatus] = useState<Record<string, boolean>>({});

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

    const checkSentStatuses = async () => {
      const cache = await communicationService.getSentTaskStatuses(
        events.map((event) => event.id),
        { onRetry: onStatusRateLimitRetry },
      );

      if (isCurrent) setSentTaskStatus(cache);
    };

    void checkSentStatuses();

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
        const alreadySent = sentTaskStatus[`rsvp-${event.id}`] || false;

        if (!alreadySent) {
          upcoming.push({
            id: `rsvp-${event.id}`,
            type: 'RSVP Request',
            event,
            scheduledTime: new Date(event.created),
            status: 'Scheduled',
          });
        }
      }

      if (commSettings.reminderEnabled) {
        const scheduledTime = new Date(
          eventDate.getTime() - commSettings.reminderHoursBefore * 60 * 60 * 1000,
        );
        const alreadySent = sentTaskStatus[`reminder-${event.id}`] || false;

        const task: AutomatedTask = {
          id: `reminder-${event.id}`,
          type: 'Reminder',
          event,
          scheduledTime,
          status: alreadySent ? 'Sent' : 'Scheduled',
        };

        if (alreadySent || scheduledTime < now) past.push(task);
        else upcoming.push(task);
      }

      if (commSettings.reportEnabled) {
        const scheduledTime = new Date(
          eventDate.getTime() + commSettings.reportHoursAfter * 60 * 60 * 1000,
        );
        const alreadySent = sentTaskStatus[`report-${event.id}`] || false;

        const task: AutomatedTask = {
          id: `report-${event.id}`,
          type: 'Report',
          event,
          scheduledTime,
          status: alreadySent ? 'Sent' : 'Scheduled',
        };

        if (alreadySent || scheduledTime < now) past.push(task);
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
  }, [events, commSettings, sentTaskStatus]);

  return {
    sentTaskStatus,
    setSentTaskStatus,
    upcomingTasks,
    pastTasks,
  };
}
