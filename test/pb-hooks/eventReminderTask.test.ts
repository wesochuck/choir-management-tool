import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

class MockRecord {
  id: string;
  data: Record<string, unknown>;
  constructor(_collection: unknown, data?: Record<string, unknown>) {
    this.id = `rec-${mockRecordInstances.length + 1}`;
    this.data = { ...(data ?? {}) };
    mockRecordInstances.push(this);
  }
  set(field: string, value: unknown): void {
    this.data[field] = value;
  }
  get(field: string): unknown {
    return this.data[field];
  }
}

const mockRecordInstances: MockRecord[] = [];

(globalThis as Record<string, unknown>).$os = {
  getenv: () => '',
};
(globalThis as Record<string, unknown>).$security = {
  equal: (a: string, b: string) => a === b,
  hs256: (payload: string, secret: string) => payload + ':' + secret,
  randomString: (length: number) => 'x'.repeat(length),
};

(globalThis as Record<string, unknown>).Record = MockRecord;

import { runEventReminderTask } from '../../pocketbase/pb_hooks_src/maintenance/eventReminderTask';
import type { MaintenanceState } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceTypes';
import type { PocketBaseApp } from '../../pocketbase/pb_hooks_src/email/emailTypes';

type App = PocketBaseApp & { savedRecords: unknown[] };

function makeApp(opts?: {
  events?: any[];
  profiles?: any[];
  users?: any[];
  rosters?: any[];
  template?: any | null;
}) {
  const savedRecords: unknown[] = [];

  const app = {
    findRecordsByFilter: mock.fn((collection: string, filter: string) => {
      if (collection === 'events') return opts?.events ?? [];
      if (collection === 'profiles') return opts?.profiles ?? [];
      if (collection === 'users') return opts?.users ?? [];
      if (collection === 'eventRosters') {
        // Simple mock implementation of filtering rosters:
        // Filter format is: event = {:targetEventId} && rsvp = "Yes"
        const eventIdMatch = filter.match(/event = \{:targetEventId\}/);
        if (eventIdMatch && opts?.rosters) {
          // If we pass parameters (e.g. `{ targetEventId }`), we can retrieve it from the arguments.
          // Wait, the mock.fn receives arguments. The filter arguments in Goja findRecordsByFilter are:
          // collection, filter, sort, limit, offset, params
          return opts.rosters;
        }
        return opts?.rosters ?? [];
      }
      return [];
    }),
    findFirstRecordByFilter: mock.fn((collection: string, filter: string) => {
      if (collection === 'messageTemplates') {
        if (opts?.template === null) throw new Error('not found');
        return opts?.template ?? makeRecord('t1', { content: 'Content', subject: 'Subject' });
      }
      throw new Error('not found');
    }),
    findCollectionByNameOrId: mock.fn((name: string) => {
      return { id: name, name };
    }),
    findRecordById: mock.fn(() => null),
    save: mock.fn((rec: unknown) => {
      savedRecords.push(rec);
    }),
    settings: mock.fn(() => ({ meta: { appUrl: 'https://test.com' }, smtp: { enabled: true } })),
    savedRecords,
  };

  return app as unknown as App & ReturnType<typeof mock.fn>;
}

function makeRecord(id: string, fields: Record<string, unknown>) {
  const data = { ...fields };
  return {
    id,
    data,
    get(f: string) {
      return data[f];
    },
    set(f: string, v: unknown) {
      data[f] = v;
    },
  };
}

const emptyState: MaintenanceState = {};

describe('runEventReminderTask', () => {
  it('sends reminder ONLY to those with Yes RSVP', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');

    const event = makeRecord('evt1', {
      title: 'Concert',
      date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      type: 'Performance',
      enableAutomatedReminder: true,
      reminderLeadTimeHours: 24,
      reminderSentAt: null,
      isArchived: false,
    });

    const profile1 = makeRecord('prof1', {
      name: 'Singer A',
      voicePart: 'S1',
      globalStatus: 'Active',
      user: 'user1',
    });
    const profile2 = makeRecord('prof2', {
      name: 'Singer B',
      voicePart: 'A1',
      globalStatus: 'Active',
      user: 'user2',
    });

    const user1 = makeRecord('user1', { email: 'a@test.com' });
    const user2 = makeRecord('user2', { email: 'b@test.com' });

    // Only prof1 has RSVP'd "Yes"
    const roster = makeRecord('rost1', { event: 'evt1', profile: 'prof1', rsvp: 'Yes' });

    const app = makeApp({
      events: [event],
      profiles: [profile1, profile2],
      users: [user1, user2],
      rosters: [roster],
      template: makeRecord('t1', { content: 'Hello {singerName}', subject: 'Concert Reminder' }),
    });

    const result = runEventReminderTask(app as never, emptyState, now);
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.queued, 1); // Only 1 email enqueued (for prof1)

    const queuedEmail = app.savedRecords.find(
      (r) => r instanceof MockRecord && r.data.recipientId === 'prof1'
    ) as any;
    assert.ok(queuedEmail);
    assert.strictEqual(queuedEmail.data.recipientEmail, 'a@test.com');
  });

  it('uses parent Performance RSVP for Rehearsal reminders', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');

    const rehearsal = makeRecord('rehearsal1', {
      title: 'Rehearsal',
      date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      type: 'Rehearsal',
      enableAutomatedReminder: true,
      reminderLeadTimeHours: 24,
      reminderSentAt: null,
      isArchived: false,
      parentPerformanceId: 'perf1', // Tied to perf1
    });

    const profile1 = makeRecord('prof1', {
      name: 'Singer A',
      voicePart: 'S1',
      globalStatus: 'Active',
      user: 'user1',
    });
    const profile2 = makeRecord('prof2', {
      name: 'Singer B',
      voicePart: 'A1',
      globalStatus: 'Active',
      user: 'user2',
    });

    const user1 = makeRecord('user1', { email: 'a@test.com' });
    const user2 = makeRecord('user2', { email: 'b@test.com' });

    // Only prof2 has RSVP'd "Yes" for the Performance (perf1)
    const roster = makeRecord('rost1', { event: 'perf1', profile: 'prof2', rsvp: 'Yes' });

    const app = makeApp({
      events: [rehearsal],
      profiles: [profile1, profile2],
      users: [user1, user2],
      rosters: [roster],
      template: makeRecord('t2', {
        content: 'Rehearsal {singerName}',
        subject: 'Rehearsal Reminder',
      }),
    });

    const result = runEventReminderTask(app as never, emptyState, now);
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.queued, 1); // Only 1 email enqueued (for prof2, who is Yes for Performance)

    const queuedEmail = app.savedRecords.find(
      (r) => r instanceof MockRecord && r.data.recipientId === 'prof2'
    ) as any;
    assert.ok(queuedEmail);
    assert.strictEqual(queuedEmail.data.recipientEmail, 'b@test.com');
  });
});
