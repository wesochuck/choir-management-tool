import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPollDashboardStats, filterArchivedPolls } from '../src/lib/pollDashboard';
import type { PollRecord, PollResponseRecord } from '../src/services/pollService';
import type { Event } from '../src/services/eventService';

const poll = (id: string, eventId?: string): PollRecord => ({ id, question: id, eventId, created: '2026-01-01' } as PollRecord);
const response = (id: string, pollId: string, status: 'Yes' | 'No'): PollResponseRecord => ({ id, pollId, profileId: 'p1', status } as PollResponseRecord);

test('filterArchivedPolls hides polls tied to past events when showArchived=false', () => {
  const polls = [poll('a', 'past'), poll('b', 'future'), poll('c')];
  const events: Event[] = [
    { id: 'past', type: 'Performance', date: '2025-01-01T00:00:00.000Z' } as Event,
    { id: 'future', type: 'Performance', date: '2027-01-01T00:00:00.000Z' } as Event,
  ];

  const filtered = filterArchivedPolls(polls, events, false, new Date('2026-01-01T00:00:00.000Z'));
  assert.deepStrictEqual(filtered.map((x) => x.id), ['b', 'c']);
});

test('buildPollDashboardStats aggregates yes/no and buckets by poll', () => {
  const polls = [poll('a'), poll('b')];
  const responses = [response('r1', 'a', 'Yes'), response('r2', 'a', 'No'), response('r3', 'b', 'No')];

  const stats = buildPollDashboardStats(polls, responses);
  assert.strictEqual(stats.a.yes, 1);
  assert.strictEqual(stats.a.no, 1);
  assert.strictEqual(stats.b.yes, 0);
  assert.strictEqual(stats.b.no, 1);
  assert.strictEqual(stats.a.volunteers.length, 1);
  assert.strictEqual(stats.a.decliners.length, 1);
});
