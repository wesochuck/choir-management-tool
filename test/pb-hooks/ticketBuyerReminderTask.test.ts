import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

globalThis.$os = {
  getenv: () => '',
};
globalThis.$security = {
  equal: (a: string, b: string) => a === b,
  hs256: (payload: string, secret: string) => payload + ':' + secret,
  randomString: (length: number) => 'x'.repeat(length),
};

const mockRecordInstances: Array<{
  id: string;
  data: Record<string, unknown>;
  set: (...args: unknown[]) => void;
  get: (f: string) => unknown;
}> = [];

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
(globalThis as Record<string, unknown>).Record = MockRecord;

import { runTicketBuyerReminderTask } from '../../pocketbase/pb_hooks_src/maintenance/ticketBuyerReminderTask';
import type { MaintenanceState } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceTypes';
import type { PocketBaseApp } from '../../pocketbase/pb_hooks_src/email/emailTypes';

type App = PocketBaseApp & { savedRecords: unknown[]; findCollectionByNameOrIdCalls: string[] };

function makeApp(opts?: {
  events?: Array<{ id: string; data: Record<string, unknown>; get: (f: string) => unknown }>;
  template?: { data: Record<string, unknown>; get: (f: string) => unknown } | null;
  purchases?: Array<{
    id: string;
    data: Record<string, unknown>;
    get: (f: string) => unknown;
    set: (f: string, v: unknown) => void;
  }>;
  throwOnEmailSave?: boolean;
}) {
  const savedRecords: unknown[] = [];
  const findCollectionByNameOrIdCalls: string[] = [];

  const app = {
    findRecordsByFilter: mock.fn((collection: string, filter: string) => {
      if (collection === 'events') return opts?.events ?? [];
      if (collection === 'ticketPurchases') return opts?.purchases ?? [];
      return [];
    }),
    findFirstRecordByFilter: mock.fn((collection: string, filter: string) => {
      if (collection === 'messageTemplates' && opts?.template !== undefined) {
        if (opts.template === null) throw new Error('not found');
        return opts.template;
      }
      throw new Error('not found');
    }),
    findCollectionByNameOrId: mock.fn((name: string) => {
      findCollectionByNameOrIdCalls.push(name);
      return { id: name, name };
    }),
    findRecordById: mock.fn(() => null),
    save: mock.fn((rec: unknown) => {
      if (opts?.throwOnEmailSave) {
        const r = rec as { data?: Record<string, unknown> };
        const isEmailSave = r?.data?.recipientId?.toString()?.startsWith('buyer_');
        if (isEmailSave) throw new Error('Email save failed');
      }
      savedRecords.push(rec);
    }),
    settings: mock.fn(() => ({ meta: { appUrl: 'https://test.com' }, smtp: { enabled: true } })),
    savedRecords,
    findCollectionByNameOrIdCalls,
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

describe('runTicketBuyerReminderTask', () => {
  it('no events returns ran with zero counts', () => {
    const app = makeApp({ events: [] });
    const result = runTicketBuyerReminderTask(app as never, emptyState, new Date());
    assert.strictEqual(result.task, 'ticketBuyerReminder');
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.queued, 0);
    assert.strictEqual(result.updated, 0);
    assert.strictEqual(result.errors, 0);
  });

  it('no template found returns ran with skipped events', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');
    const app = makeApp({
      events: [
        makeRecord('evt1', {
          title: 'Concert',
          date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          type: 'Performance',
          isArchived: false,
          isTicketingEnabled: true,
        }),
      ],
      template: null,
    });
    const result = runTicketBuyerReminderTask(app as never, emptyState, now);
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.skipped, 1);
  });

  it('due with purchases enqueues email and flips reminderSent', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');
    const purchase = makeRecord('p1', {
      event: 'evt1',
      status: 'paid',
      buyerName: 'John',
      buyerEmail: 'john@test.com',
      quantity: 2,
      stripeSessionId: 'cs_test',
      reminderSent: false,
    });
    const app = makeApp({
      events: [
        makeRecord('evt1', {
          title: 'Concert',
          date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          type: 'Performance',
          isArchived: false,
          isTicketingEnabled: true,
        }),
      ],
      template: makeRecord('t1', {
        title: 'Ticket Concert Reminder',
        content: 'Hello {buyerName}',
        subject: 'Reminder',
      }),
      purchases: [purchase],
    });

    const result = runTicketBuyerReminderTask(app as never, emptyState, now);
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.queued, 1);
    assert.strictEqual(result.updated, 1);
    assert.strictEqual(result.errors, 0);
  });

  it('save failure on one purchase continues with the rest', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');
    const purchase1 = makeRecord('p1', {
      event: 'evt1',
      status: 'paid',
      buyerName: 'A',
      buyerEmail: 'a@test.com',
      quantity: 1,
      stripeSessionId: 'cs_1',
      reminderSent: false,
    });
    const purchase2 = makeRecord('p2', {
      event: 'evt1',
      status: 'paid',
      buyerName: 'B',
      buyerEmail: 'b@test.com',
      quantity: 1,
      stripeSessionId: 'cs_2',
      reminderSent: false,
    });
    const app = makeApp({
      events: [
        makeRecord('evt1', {
          title: 'Concert',
          date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          type: 'Performance',
          isArchived: false,
          isTicketingEnabled: true,
        }),
      ],
      template: makeRecord('t1', {
        title: 'Ticket Concert Reminder',
        content: 'Hello {buyerName}',
        subject: 'Reminder',
      }),
      purchases: [purchase1, purchase2],
      throwOnEmailSave: true,
    });

    const result = runTicketBuyerReminderTask(app as never, emptyState, now);
    assert.strictEqual(result.errors, 2);
    assert.strictEqual(result.status, 'failed');
  });

  it('returns queued > 0 so runner can decide on second queue pass', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');
    const purchase = makeRecord('p1', {
      event: 'evt1',
      status: 'paid',
      buyerName: 'John',
      buyerEmail: 'john@test.com',
      quantity: 2,
      stripeSessionId: 'cs_test',
      reminderSent: false,
    });
    const app = makeApp({
      events: [
        makeRecord('evt1', {
          title: 'Concert',
          date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          type: 'Performance',
          isArchived: false,
          isTicketingEnabled: true,
        }),
      ],
      template: makeRecord('t1', {
        title: 'Ticket Concert Reminder',
        content: 'Hello {buyerName}',
        subject: 'Reminder',
      }),
      purchases: [purchase],
    });
    const result = runTicketBuyerReminderTask(app as never, emptyState, now);
    assert.ok(result.queued > 0);
  });
});
