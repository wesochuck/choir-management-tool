import type { Event } from '../services/eventService';
import type { PollRecord, PollResponseRecord, PollStats } from '../services/pollService';

export function filterArchivedPolls(
  polls: PollRecord[],
  events: Event[],
  showArchived: boolean,
  now: Date = new Date(),
): PollRecord[] {
  if (showArchived) return polls;

  return polls.filter((poll) => {
    if (!poll.eventId) return true;
    const event = events.find((candidate) => candidate.id === poll.eventId);
    if (!event) return true;
    return new Date(event.date) > now;
  });
}

export function buildPollDashboardStats(
  polls: PollRecord[],
  responses: PollResponseRecord[],
): Record<string, PollStats> {
  const stats: Record<string, PollStats> = {};

  for (const poll of polls) {
    stats[poll.id] = { yes: 0, no: 0, volunteers: [], decliners: [] };
  }

  for (const response of responses) {
    const bucket = stats[response.pollId];
    if (!bucket) continue;

    if (response.status === 'Yes') {
      bucket.yes += 1;
      bucket.volunteers.push(response);
    } else {
      bucket.no += 1;
      bucket.decliners.push(response);
    }
  }

  return stats;
}
