import { pb } from '../../lib/pocketbase';
import {
  chunkArray,
  mapWithConcurrency,
  retryOn429,
} from '../../lib/networkSafety';
import type {
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
    typeFilter: '(filters.type = "RSVP Invitation" || filters.rsvp = "Pending")',
    paramPrefix: 'rsvpEventId',
  },
  Reminder: {
    typeFilter: 'filters.type = "Automated Reminder"',
    paramPrefix: 'reminderEventId',
  },
  Report: {
    typeFilter: '(filters.type = "Automated Report" || filters.type = "Attendance Report")',
    paramPrefix: 'reportEventId',
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

export async function getSentTaskStatuses(
  eventIds: string[],
  options: SentTaskStatusOptions = {}
): Promise<Record<string, boolean>> {
  const uniqueEventIds = [...new Set(eventIds.filter((eventId) => !!eventId))];
  const statusMap: Record<string, boolean> = {};

  uniqueEventIds.forEach((eventId) => {
    statusMap[`rsvp-${eventId}`] = false;
    statusMap[`reminder-${eventId}`] = false;
    statusMap[`report-${eventId}`] = false;
  });

  if (uniqueEventIds.length === 0) {
    return statusMap;
  }

  const getEventIdsForType = async (type: AutomatedTaskType): Promise<Set<string>> => {
    const seenEventIds = new Set<string>();
    const { typeFilter, paramPrefix } = AUTOMATED_STATUS_FILTERS[type];
    const chunks = chunkArray(uniqueEventIds, EVENT_ID_CHUNK_SIZE);

    await mapWithConcurrency(
      chunks,
      async (chunk, chunkIndex) => {
        const { clause, params } = buildEventIdClause(chunk, `${paramPrefix}${chunkIndex}_`);
        const filterStr = pb.filter(`status = "Sent" && ${typeFilter} && (${clause})`, params);

        const records = await retryOn429(
          () =>
            pb.collection('messages').getFullList<MessageRecord>({
              filter: filterStr,
              fields: 'id,filters',
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
          if (eventId) seenEventIds.add(eventId);
        });
      },
      { concurrency: EVENT_STATUS_FETCH_CONCURRENCY }
    );

    return seenEventIds;
  };

  const [rsvpEventIds, reminderEventIds, reportEventIds] = await Promise.all([
    getEventIdsForType('RSVP Request'),
    getEventIdsForType('Reminder'),
    getEventIdsForType('Report'),
  ]);

  rsvpEventIds.forEach((eventId) => {
    statusMap[`rsvp-${eventId}`] = true;
  });
  reminderEventIds.forEach((eventId) => {
    statusMap[`reminder-${eventId}`] = true;
  });
  reportEventIds.forEach((eventId) => {
    statusMap[`report-${eventId}`] = true;
  });

  return statusMap;
}

export async function wasMessageSent(filter: {
  eventId?: string;
  type?: AutomatedTaskType;
}): Promise<boolean> {
  if (!filter.eventId || !filter.type) return false;
  try {
    const statuses = await getSentTaskStatuses([filter.eventId]);
    const keyPrefix =
      filter.type === 'RSVP Request'
        ? 'rsvp'
        : filter.type === 'Reminder'
        ? 'reminder'
        : 'report';
    return statuses[`${keyPrefix}-${filter.eventId}`] || false;
  } catch {
    return false;
  }
}
