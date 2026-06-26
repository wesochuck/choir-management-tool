import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mock Record global (Goja PocketBase runtime provides it; Node.js does not)
// ---------------------------------------------------------------------------
interface MockRecordInfo {
  id: string;
  data: Record<string, unknown>;
  set(field: string, value: unknown): void;
  get(field: string): unknown;
}

const mockRecordInstances: MockRecordInfo[] = [];

class MockRecord {
  id: string;
  data: Record<string, unknown>;

  constructor(collection: unknown, data?: Record<string, unknown>) {
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

globalThis.Record = MockRecord as unknown as new (
  collection: unknown,
  data?: unknown
) => {
  id: string;
  set(field: string, value: unknown): void;
  get(field: string): unknown;
};

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------
import {
  getMaintenanceState,
  saveMaintenanceState,
  saveMaintenanceTaskRun,
  isTaskDue,
  hasActiveLock,
  tryAcquireTaskLock,
  releaseTaskLock,
} from '../../pocketbase/pb_hooks_src/maintenance/maintenanceState';

import type { MaintenanceState } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceTypes';

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------
interface App {
  findFirstRecordByFilter: ReturnType<typeof mock.fn>;
  save: ReturnType<typeof mock.fn>;
  findCollectionByNameOrId: ReturnType<typeof mock.fn>;
  savedRecords: unknown[];
  findFirstRecordByFilterCalls: string[];
  findCollectionByNameOrIdCalls: string[];
  storedRecord: {
    data: Record<string, unknown>;
    get(field: string): unknown;
    set(field: string, value: unknown): void;
  };
}

function makeApp(recordValue?: string): App {
  const savedRecords: unknown[] = [];
  const findFirstRecordByFilterCalls: string[] = [];
  const findCollectionByNameOrIdCalls: string[] = [];

  const data: Record<string, unknown> = { value: recordValue };

  const storedRecord = {
    data,
    get(field: string): unknown {
      return data[field];
    },
    set(field: string, value: unknown): void {
      data[field] = value;
    },
  };

  const findFirstRecordByFilter = mock.fn((_collection: string, _filter: string) => {
    findFirstRecordByFilterCalls.push(_filter);
    if (recordValue === undefined) throw new Error('not found');
    return storedRecord;
  });

  const save = mock.fn((rec: unknown) => {
    savedRecords.push(rec);
  });

  const findCollectionByNameOrId = mock.fn((name: string) => {
    findCollectionByNameOrIdCalls.push(name);
    return { id: 'col-id', name };
  });

  return {
    findFirstRecordByFilter,
    save,
    findCollectionByNameOrId,
    savedRecords,
    findFirstRecordByFilterCalls,
    findCollectionByNameOrIdCalls,
    storedRecord,
  };
}

describe('maintenanceState', () => {
  beforeEach(() => {
    mockRecordInstances.length = 0;
  });

  it('missing maintenance_state row returns {} without throwing', () => {
    const app = makeApp();
    const state = getMaintenanceState(app as never);
    assert.deepStrictEqual(state, {});
  });

  it('malformed JSON returns {} and logs a warning', () => {
    const logs: string[] = [];
    mock.method(console, 'log', (msg: string) => {
      logs.push(msg);
    });

    const app = makeApp('{{{not json}}}');
    const state = getMaintenanceState(app as never);
    assert.deepStrictEqual(state, {});
    assert.strictEqual(logs.length, 1);
    assert.ok(logs[0].includes('malformed'));

    mock.restoreAll();
  });

  it('parses valid lastRuns state', () => {
    const app = makeApp('{"lastRuns":{"emailQueue":"2024-06-26T12:00:00.000Z"}}');
    const state = getMaintenanceState(app as never);
    assert.deepStrictEqual(state, {
      lastRuns: { emailQueue: '2024-06-26T12:00:00.000Z' },
    });
  });

  it('parses valid running state', () => {
    const app = makeApp(
      '{"running":{"postEventReport":{"startedAt":"2024-06-26T12:00:00.000Z","expiresAt":"2024-06-26T12:05:00.000Z"}}}'
    );
    const state = getMaintenanceState(app as never);
    assert.deepStrictEqual(state, {
      running: {
        postEventReport: {
          startedAt: '2024-06-26T12:00:00.000Z',
          expiresAt: '2024-06-26T12:05:00.000Z',
        },
      },
    });
  });

  it('isTaskDue returns true when task has never run', () => {
    const state: MaintenanceState = {};
    const now = new Date('2024-06-26T12:00:00.000Z');
    assert.strictEqual(isTaskDue(state, 'x', 60_000, now), true);
  });

  it('isTaskDue returns false when task ran recently', () => {
    const now = new Date('2024-06-26T12:00:00.000Z');
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const state: MaintenanceState = { lastRuns: { x: fiveMinAgo } };
    assert.strictEqual(isTaskDue(state, 'x', 60 * 60 * 1000, now), false);
  });

  it('isTaskDue returns true when task ran long ago', () => {
    const now = new Date('2024-06-26T12:00:00.000Z');
    const twoHrAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const state: MaintenanceState = { lastRuns: { x: twoHrAgo } };
    assert.strictEqual(isTaskDue(state, 'x', 60 * 60 * 1000, now), true);
  });

  it('hasActiveLock returns false when nothing is running', () => {
    const state: MaintenanceState = {};
    const now = new Date('2024-06-26T12:00:00.000Z');
    assert.strictEqual(hasActiveLock(state, 'x', now), false);
  });

  it('hasActiveLock returns true when lock is still active', () => {
    const now = new Date('2024-06-26T12:00:00.000Z');
    const fiveMinFuture = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const state: MaintenanceState = {
      running: { x: { startedAt: now.toISOString(), expiresAt: fiveMinFuture } },
    };
    assert.strictEqual(hasActiveLock(state, 'x', now), true);
  });

  it('hasActiveLock returns false when lock has expired', () => {
    const now = new Date('2024-06-26T12:00:00.000Z');
    const fiveMinPast = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const state: MaintenanceState = {
      running: { x: { startedAt: fiveMinPast, expiresAt: fiveMinPast } },
    };
    assert.strictEqual(hasActiveLock(state, 'x', now), false);
  });

  it('tryAcquireTaskLock acquires and persists a new lock', () => {
    const app = makeApp('{}');
    const state: MaintenanceState = {};
    const now = new Date('2024-06-26T12:00:00.000Z');
    const ttlMs = 60_000;

    const result = tryAcquireTaskLock(app as never, state, 'myTask', ttlMs, now);
    assert.strictEqual(result, true);
    assert.ok(state.running?.myTask);
    assert.strictEqual(state.running!.myTask!.startedAt, now.toISOString());
    assert.strictEqual(
      state.running!.myTask!.expiresAt,
      new Date(now.getTime() + ttlMs).toISOString()
    );
    assert.strictEqual(app.save.mock.callCount(), 1);
  });

  it('tryAcquireTaskLock returns false when a lock is already active', () => {
    const app = makeApp();
    const now = new Date('2024-06-26T12:00:00.000Z');
    const state: MaintenanceState = {
      running: {
        myTask: {
          startedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 60_000).toISOString(),
        },
      },
    };
    const runningBefore = state.running!.myTask;

    const result = tryAcquireTaskLock(app as never, state, 'myTask', 60_000, now);
    assert.strictEqual(result, false);
    assert.strictEqual(state.running!.myTask, runningBefore);
    assert.strictEqual(app.save.mock.callCount(), 0);
  });

  it('releaseTaskLock removes the task lock and persists', () => {
    const app = makeApp('{}');
    const now = new Date('2024-06-26T12:00:00.000Z');
    const state: MaintenanceState = {
      running: {
        myTask: {
          startedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 60_000).toISOString(),
        },
      },
    };

    releaseTaskLock(app as never, state, 'myTask');
    assert.strictEqual(state.running, undefined);
    assert.strictEqual(app.save.mock.callCount(), 1);
  });

  it('saveMaintenanceTaskRun updates only the named key in lastRuns', () => {
    const app = makeApp('{"lastRuns":{"cleanup":"2024-06-26T10:00:00.000Z"}}');
    const ranAtIso = '2024-06-26T12:00:00.000Z';

    saveMaintenanceTaskRun(app as never, 'emailQueue', ranAtIso);

    const updatedRaw = app.storedRecord.get('value') as string;
    const updatedState = JSON.parse(updatedRaw) as MaintenanceState;
    assert.strictEqual(updatedState.lastRuns?.cleanup, '2024-06-26T10:00:00.000Z');
    assert.strictEqual(updatedState.lastRuns?.emailQueue, ranAtIso);
    assert.strictEqual(app.save.mock.callCount(), 1);
  });

  it('saveMaintenanceTaskRun with missing row creates a new appSettings record', () => {
    const app = makeApp();
    const ranAtIso = '2024-06-26T12:00:00.000Z';

    saveMaintenanceTaskRun(app as never, 'emailQueue', ranAtIso);

    assert.strictEqual(app.findCollectionByNameOrIdCalls.length, 1);
    assert.strictEqual(app.findCollectionByNameOrIdCalls[0], 'appSettings');
    assert.strictEqual(app.save.mock.callCount(), 1);
    assert.strictEqual(mockRecordInstances.length, 1);

    const savedRec = mockRecordInstances[0];
    assert.strictEqual(savedRec.data.key, 'maintenance_state');
    const parsedValue = JSON.parse(savedRec.data.value as string) as MaintenanceState;
    assert.strictEqual(parsedValue.lastRuns?.emailQueue, ranAtIso);
  });
});
