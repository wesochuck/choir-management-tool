import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

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

import { runPostEventReportTask } from '../../pocketbase/pb_hooks_src/maintenance/postEventReportTask';
import type { MaintenanceState } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceTypes';

type App = ReturnType<typeof makeApp>;

function makeApp(opts?: {
  events?: Array<{ id: string; data: Record<string, unknown> }>;
  admins?: Array<{ id: string; data: Record<string, unknown> }>;
  eventRosters?: Array<{ id: string; data: Record<string, unknown> }>;
  throwOnSave?: boolean;
}) {
  const savedRecords: unknown[] = [];
  const events = opts?.events ?? [];
  const admins = opts?.admins ?? [
    {
      id: 'admin1',
      data: { name: 'Admin', email: 'admin@test.com' },
      get(f: string) {
        return this.data[f];
      },
    },
  ];

  const findRecordsByFilter = mock.fn((collection: string, filter: string) => {
    if (collection === 'events') return events;
    if (collection === 'users') return admins;
    if (collection === 'eventRosters') return opts?.eventRosters ?? [];
    if (collection === 'profiles') return [];
    return [];
  });

  const findFirstRecordByFilter = mock.fn(() => {
    throw new Error('not found');
  });

  const findCollectionByNameOrId = mock.fn((name: string) => ({ id: name, name }));

  const findRecordById = mock.fn(() => null);

  const save = mock.fn((rec: unknown) => {
    if (opts?.throwOnSave) throw new Error('Save failed');
    savedRecords.push(rec);
  });

  return {
    findRecordsByFilter,
    findFirstRecordByFilter,
    findCollectionByNameOrId,
    findRecordById,
    save,
    savedRecords,
  };
}

const emptyState: MaintenanceState = {};

describe('runPostEventReportTask', () => {
  it('returns ran with zero processed when no events exist', () => {
    const app = makeApp({ events: [] });
    const result = runPostEventReportTask(app as never, emptyState, new Date());
    assert.strictEqual(result.task, 'postEventReport');
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.updated, 0);
    assert.strictEqual(result.errors, 0);
  });

  it('returns ran with zero updated when no admins exist', () => {
    const app = makeApp({
      events: [
        {
          id: 'evt1',
          data: { title: 'Concert', date: '2026-06-26T12:00:00.000Z', type: 'Performance' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
      admins: [],
    });
    const result = runPostEventReportTask(app as never, emptyState, new Date());
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.updated, 0);
    assert.strictEqual(result.errors, 0);
  });

  it('returns failed when save throws', () => {
    const app = makeApp({
      events: [
        {
          id: 'evt1',
          data: { title: 'Concert', date: '2026-06-26T12:00:00.000Z', type: 'Performance' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
      admins: [
        {
          id: 'admin1',
          data: { name: 'Admin', email: 'admin@test.com' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
      eventRosters: [
        {
          id: 'r1',
          data: { event: 'evt1', profile: 'p1', attendance: 'Present' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
      throwOnSave: true,
    });
    const result = runPostEventReportTask(app as never, emptyState, new Date());
    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.errors, 1);
  });

  it('settings parse failure does not throw and task still runs', () => {
    const app = makeApp({
      events: [
        {
          id: 'evt1',
          data: { title: 'Concert', date: '2026-06-26T12:00:00.000Z', type: 'Performance' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
    });
    const result = runPostEventReportTask(app as never, emptyState, new Date());
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 1);
  });

  it('returns counts for processed and updated', () => {
    const app = makeApp({
      events: [
        {
          id: 'evt1',
          data: { title: 'Concert 1', date: '2026-06-26T12:00:00.000Z', type: 'Performance' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
      eventRosters: [
        {
          id: 'r1',
          data: { event: 'evt1', profile: 'p1', attendance: 'Present' },
          get(f: string) {
            return this.data[f];
          },
        },
      ],
    });
    const result = runPostEventReportTask(app as never, emptyState, new Date());
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.updated, 1);
    assert.strictEqual(result.errors, 0);
  });
});
