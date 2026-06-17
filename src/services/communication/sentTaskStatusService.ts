import { pb } from '../../lib/pocketbase';
import { chunkArray, mapWithConcurrency, retryOn429 } from '../../lib/networkSafety';
import type {
  AutomatedTaskStatusMap,
  AutomatedTaskType,
  MessageRecord,
  SentTaskStatusOptions,
} from './types';

const EVENT_ID_CHUNK_SIZE = 20;
const EVENT_STATUS_FETCH_CONCURRENCY = 3;
const AUTOMATED_STATUS_FILTERS: Record<
  AutomatedTaskType,
  { typeFilter: string; paramPrefix: string }
> = {
  'RSVP Request': {
    typeFilter: "(filters.type = 'RSVP Invitation' || filters.rsvp = 'Pending')",
    paramPrefix: 'rsvpEventId',
  },
  Reminder: {
    typeFilter: "filters.type = 'Automated Reminder'",
    paramPrefix: 'reminderEventId',
  },
  Report: {
    typeFilter: "(filters.type = 'Automated Report' || filters.type = 'Attendance Report')",
    paramPrefix: 'reportEventId',
  },
  'Ticket Buyer Reminder': {
    typeFilter: "filters.type = 'Ticket Buyer Reminder'",
    paramPrefix: 'ticketReminderEventId',
  },
};

const buildEventIdClause = (eventIds: string[], paramPrefix: string) => {
  const params: Record<string, string> = {};
  const clauses = eventIds.map((eventId, idx) => {
    const key = `${paramPrefix}${idx}`;
    params[key] = eventId;
    return `filters.eventId = {:${key}}`;
  });
  return { clause: clauses.join(' || '), params };
};

const readFilterEventId = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rawEventId = (value as { eventId?: unknown }).eventId;
  return typeof rawEventId === 'string' && rawEventId ? rawEventId : null;
};

export async function getAutomatedTaskStatuses(
  eventIds: string[],
  options: SentTaskStatusOptions = {}
): Promise<AutomatedTaskStatusMap> {
  const uniqueEventIds = [...new Set(eventIds.filter((eventId) => !!eventId))];
  const statusMap: AutomatedTaskStatusMap = {};

  uniqueEventIds.forEach((eventId) => {
    statusMap[`rsvp-${eventId}`] = 'pending';
    statusMap[`reminder-${eventId}`] = 'pending';
    statusMap[`report-${eventId}`] = 'pending';
    statusMap[`ticket-reminder-${eventId}`] = 'pending';
  });

  if (uniqueEventIds.length === 0) {
    return statusMap;
  }

  const resolveTasksForType = async (type: AutomatedTaskType): Promise<void> => {
    const { typeFilter, paramPrefix } = AUTOMATED_STATUS_FILTERS[type];
    const chunks = chunkArray(uniqueEventIds, EVENT_ID_CHUNK_SIZE);

    const keyPrefix =
      type === 'RSVP Request'
        ? 'rsvp'
        : type === 'Reminder'
          ? 'reminder'
          : type === 'Ticket Buyer Reminder'
            ? 'ticket-reminder'
            : 'report';

    await mapWithConcurrency(
      chunks,
      async (chunk, chunkIndex) => {
        const { clause, params } = buildEventIdClause(chunk, `${paramPrefix}${chunkIndex}_`);
        const filterStr = pb.filter(
          `(status = 'Sent' || status = 'Archived') && ${typeFilter} && (${clause})`,
          params
        );

        const records = await retryOn429(
          () =>
            pb.collection('messages').getFullList<MessageRecord>({
              filter: filterStr,
              sort: '-created',
              fields: 'id,status,filters',
            }),
          {
            maxRetries: 3,
            baseDelayMs: 250,
            maxDelayMs: 2000,
            onRetry: options.onRetry,
          }
        );

        records.forEach((record) => {
          const eventId = readFilterEventId(record.filters);
          if (eventId) {
            const key = `${keyPrefix}-${eventId}`;
            // If a real send is already recorded, never overwrite it with an archive record.
            if (statusMap[key] !== 'sent') {
              statusMap[key] = record.status === 'Archived' ? 'archived' : 'sent';
            }
          }
        });
      },
      { concurrency: EVENT_STATUS_FETCH_CONCURRENCY }
    );
  };

  await Promise.all([
    resolveTasksForType('RSVP Request'),
    resolveTasksForType('Reminder'),
    resolveTasksForType('Report'),
    resolveTasksForType('Ticket Buyer Reminder'),
  ]);

  return statusMap;
}

/** @deprecated Use getAutomatedTaskStatuses instead */
export async function getSentTaskStatuses(
  eventIds: string[],
  options: SentTaskStatusOptions = {}
): Promise<Record<string, boolean>> {
  const statuses = await getAutomatedTaskStatuses(eventIds, options);
  const result: Record<string, boolean> = {};
  Object.keys(statuses).forEach((key) => {
    result[key] = statuses[key] === 'sent';
  });
  return result;
}

export async function wasMessageSent(filter: {
  eventId?: string;
  type?: AutomatedTaskType;
}): Promise<boolean> {
  if (!filter.eventId || !filter.type) return false;
  try {
    const statuses = await getAutomatedTaskStatuses([filter.eventId]);
    const keyPrefix =
      filter.type === 'RSVP Request'
        ? 'rsvp'
        : filter.type === 'Reminder'
          ? 'reminder'
          : filter.type === 'Ticket Buyer Reminder'
            ? 'ticket-reminder'
            : 'report';
    return statuses[`${keyPrefix}-${filter.eventId}`] === 'sent';
  } catch {
    return false;
  }
}
