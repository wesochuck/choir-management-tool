import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ----------------------------------------------------------------
// Mock Record global (Goja-provided in production)
// ----------------------------------------------------------------
const mockRecordInstances: Array<{
  id: string;
  data: Record<string, unknown>;
  set: (field: string, value: unknown) => void;
  get: (field: string) => unknown;
}> = [];

class MockRecord {
  id: string;
  data: Record<string, unknown>;

  constructor(_collection: unknown, data?: Record<string, unknown>) {
    this.id = `rec-${mockRecordInstances.length + 1}`;
    this.data = { ...data };
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

// ----------------------------------------------------------------
// Module imports (these load before our mocks are set up, but
// vi.spyOn / mock.method on namespace objects intercepts calls
// retroactively once vitest's proxy is in place).
// ----------------------------------------------------------------
import type {
  MaintenanceRunSummary,
  MaintenanceState,
  MaintenanceTaskResult,
} from '../../pocketbase/pb_hooks_src/maintenance/maintenanceTypes';

import * as maintenanceState from '../../pocketbase/pb_hooks_src/maintenance/maintenanceState';
import * as emailQueueTask from '../../pocketbase/pb_hooks_src/maintenance/emailQueueTask';
import * as postEventReportTask from '../../pocketbase/pb_hooks_src/maintenance/postEventReportTask';
import * as ticketBuyerReminderTask from '../../pocketbase/pb_hooks_src/maintenance/ticketBuyerReminderTask';
import * as cleanupTask from '../../pocketbase/pb_hooks_src/maintenance/cleanupTask';
import * as eventReminderTask from '../../pocketbase/pb_hooks_src/maintenance/eventReminderTask';

import { runMaintenance } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceRunner';

// ----------------------------------------------------------------
// Shared mutable state – the runner's mocks operate on the same
// object so state transitions (lock acquire / release, lastRuns)
// are visible across successive mock calls.
// ----------------------------------------------------------------
const sharedState: MaintenanceState = {
  lastRuns: {},
  running: {},
};

function resetSharedState(): void {
  sharedState.lastRuns = {};
  sharedState.running = {};
}

// ----------------------------------------------------------------
// Mock every function the runner imports.  Because these are
// applied with mock.method on the module namespace, vitest
// intercepts calls made by maintenanceRunner.
// ----------------------------------------------------------------
const mockGetMaintenanceState = mock.method(
  maintenanceState,
  'getMaintenanceState',
  () => sharedState
);
const mockSaveMaintenanceTaskRun = mock.method(
  maintenanceState,
  'saveMaintenanceTaskRun',
  (_app: unknown, name: string, iso: string) => {
    if (sharedState.lastRuns) sharedState.lastRuns[name] = iso;
  }
);
const mockIsTaskDue = mock.method(
  maintenanceState,
  'isTaskDue',
  (s: MaintenanceState, name: string, intervalMs: number, now: Date) => {
    if (!s.lastRuns || !s.lastRuns[name]) return true;
    const lastRun = new Date(s.lastRuns[name]).getTime();
    if (isNaN(lastRun)) return true;
    return now.getTime() - lastRun >= intervalMs;
  }
);
const mockHasActiveLock = mock.method(
  maintenanceState,
  'hasActiveLock',
  (s: MaintenanceState, name: string, now: Date) => {
    const lock = s.running?.[name];
    if (!lock?.expiresAt) return false;
    const expiresAt = new Date(lock.expiresAt).getTime();
    if (isNaN(expiresAt)) return false;
    return expiresAt > now.getTime();
  }
);
const mockTryAcquireTaskLock = mock.method(
  maintenanceState,
  'tryAcquireTaskLock',
  (_app: unknown, s: MaintenanceState, name: string, ttlMs: number, now: Date): boolean => {
    if (mockHasActiveLock(s, name, now)) return false;
    if (!s.running) s.running = {};
    s.running[name] = {
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    };
    return true;
  }
);
const mockReleaseTaskLock = mock.method(
  maintenanceState,
  'releaseTaskLock',
  (_app: unknown, s: MaintenanceState, name: string) => {
    if (!s.running) return;
    (s.running as Record<string, unknown>)[name] = undefined;
    const keys = Object.keys(s.running).filter(
      (k) => (s.running as Record<string, unknown>)[k] !== undefined
    );
    if (keys.length === 0) {
      s.running = undefined as unknown as Record<string, { startedAt: string; expiresAt: string }>;
    }
  }
);

const mockRunEmailQueueTask = mock.method(
  emailQueueTask,
  'runEmailQueueTask',
  (): MaintenanceTaskResult => ({ task: 'emailQueue', status: 'ran' })
);
const mockRunPostEventReportTask = mock.method(
  postEventReportTask,
  'runPostEventReportTask',
  (): MaintenanceTaskResult => ({ task: 'postEventReport', status: 'ran' })
);
const mockRunTicketBuyerReminderTask = mock.method(
  ticketBuyerReminderTask,
  'runTicketBuyerReminderTask',
  (): MaintenanceTaskResult => ({
    task: 'ticketBuyerReminder',
    status: 'ran',
    queued: 0,
  })
);
const mockRunCleanupTask = mock.method(
  cleanupTask,
  'runCleanupTask',
  (): MaintenanceTaskResult => ({ task: 'cleanup', status: 'ran' })
);
const mockRunEventReminderTask = mock.method(
  eventReminderTask,
  'runEventReminderTask',
  (): MaintenanceTaskResult => ({ task: 'eventReminder', status: 'ran' })
);

/** All mocks that hold call-state we reset between tests. */
const allMocks = [
  mockGetMaintenanceState,
  mockSaveMaintenanceTaskRun,
  mockIsTaskDue,
  mockHasActiveLock,
  mockTryAcquireTaskLock,
  mockReleaseTaskLock,
  mockRunEmailQueueTask,
  mockRunPostEventReportTask,
  mockRunTicketBuyerReminderTask,
  mockRunCleanupTask,
  mockRunEventReminderTask,
] as const;

function reinstallDefaults(): void {
  mockGetMaintenanceState.mock.mockImplementation(() => sharedState);
  mockSaveMaintenanceTaskRun.mock.mockImplementation((_app: unknown, name: string, iso: string) => {
    if (sharedState.lastRuns) sharedState.lastRuns[name] = iso;
  });
  mockIsTaskDue.mock.mockImplementation(
    (s: MaintenanceState, name: string, intervalMs: number, now: Date) => {
      if (!s.lastRuns || !s.lastRuns[name]) return true;
      const lastRun = new Date(s.lastRuns[name]).getTime();
      if (isNaN(lastRun)) return true;
      return now.getTime() - lastRun >= intervalMs;
    }
  );
  mockHasActiveLock.mock.mockImplementation((s: MaintenanceState, name: string, now: Date) => {
    const lock = s.running?.[name];
    if (!lock?.expiresAt) return false;
    return new Date(lock.expiresAt).getTime() > now.getTime();
  });
  mockTryAcquireTaskLock.mock.mockImplementation(
    (_app: unknown, s: MaintenanceState, name: string, ttlMs: number, now: Date) => {
      if (mockHasActiveLock(s, name, now)) return false;
      if (!s.running) s.running = {};
      s.running[name] = {
        startedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      };
      return true;
    }
  );
  mockReleaseTaskLock.mock.mockImplementation(
    (_app: unknown, s: MaintenanceState, name: string) => {
      if (!s.running) return;
      (s.running as Record<string, unknown>)[name] = undefined;
      const keys = Object.keys(s.running).filter(
        (k) => (s.running as Record<string, unknown>)[k] !== undefined
      );
      if (keys.length === 0) {
        s.running = undefined as unknown as Record<
          string,
          { startedAt: string; expiresAt: string }
        >;
      }
    }
  );
  mockRunEmailQueueTask.mock.mockImplementation(
    (): MaintenanceTaskResult => ({
      task: 'emailQueue',
      status: 'ran',
    })
  );
  mockRunPostEventReportTask.mock.mockImplementation(
    (): MaintenanceTaskResult => ({
      task: 'postEventReport',
      status: 'ran',
    })
  );
  mockRunTicketBuyerReminderTask.mock.mockImplementation(
    (): MaintenanceTaskResult => ({
      task: 'ticketBuyerReminder',
      status: 'ran',
      queued: 0,
    })
  );
  mockRunCleanupTask.mock.mockImplementation(
    (): MaintenanceTaskResult => ({
      task: 'cleanup',
      status: 'ran',
    })
  );
  mockRunEventReminderTask.mock.mockImplementation(
    (): MaintenanceTaskResult => ({
      task: 'eventReminder',
      status: 'ran',
    })
  );
}

// ----------------------------------------------------------------
// makeApp – the runner only passes `app` to mocked functions that
// ignore it, so an empty object is sufficient.
// ----------------------------------------------------------------
function makeApp(): Record<string, unknown> {
  return {};
}

// ----------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------
afterEach(() => {
  resetSharedState();
  for (const m of allMocks) m.mock.resetCalls();
  reinstallDefaults();
});

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
describe('runMaintenance', () => {
  it('returns startedAt, finishedAt, and 5 results (1 emailQueue + 4 scheduled)', () => {
    const summary: MaintenanceRunSummary = runMaintenance(makeApp() as never);

    assert.ok(summary.startedAt);
    assert.ok(summary.finishedAt);
    assert.strictEqual(summary.results.length, 5);

    for (const r of summary.results) {
      assert.strictEqual(r.status, 'ran');
    }
  });

  it('emailQueue is always the first result', () => {
    const summary = runMaintenance(makeApp() as never);
    assert.strictEqual(summary.results[0].task, 'emailQueue');
  });

  it('postEventReport not due => returns skipped, task fn NOT called', () => {
    sharedState.lastRuns = {
      postEventReport: new Date(Date.now() + 10000).toISOString(),
    };

    const summary = runMaintenance(makeApp() as never);
    const pr = summary.results.find((r) => r.task === 'postEventReport');
    assert.ok(pr);
    assert.strictEqual(pr.status, 'skipped');
    assert.strictEqual(pr.message, 'Not due');
    assert.strictEqual(mockRunPostEventReportTask.mock.calls.length, 0);
  });

  it('postEventReport due + lock acquired + success => runs, lastRuns saved', () => {
    mockRunPostEventReportTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'postEventReport',
        status: 'ran',
      })
    );

    const summary = runMaintenance(makeApp() as never);
    const pr = summary.results.find((r) => r.task === 'postEventReport');
    assert.ok(pr);
    assert.strictEqual(pr.status, 'ran');
    assert.ok(mockRunPostEventReportTask.mock.calls.length >= 1);

    assert.ok(
      sharedState.lastRuns?.postEventReport,
      'lastRuns.postEventReport was set after successful run'
    );
  });

  it('postEventReport due + throws => returns failed with errors:1', () => {
    mockRunPostEventReportTask.mock.mockImplementation((): MaintenanceTaskResult => {
      throw new Error('DB timeout');
    });

    const summary = runMaintenance(makeApp() as never);
    const pr = summary.results.find((r) => r.task === 'postEventReport');
    assert.ok(pr);
    assert.strictEqual(pr.status, 'failed');
    assert.strictEqual(pr.errors, 1);
    assert.ok(pr.message);
  });

  it('postEventReport returns ran with errors:1 => lastRuns NOT saved', () => {
    mockRunPostEventReportTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'postEventReport',
        status: 'ran',
        errors: 1,
      })
    );

    runMaintenance(makeApp() as never);
    assert.ok(
      !sharedState.lastRuns?.postEventReport,
      'lastRuns.postEventReport should not be set when errors > 0'
    );
  });

  it('active lock for postEventReport => skipped with Already running', () => {
    sharedState.running = {
      postEventReport: {
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    };

    const summary = runMaintenance(makeApp() as never);
    const pr = summary.results.find((r) => r.task === 'postEventReport');
    assert.ok(pr);
    assert.strictEqual(pr.status, 'skipped');
    assert.strictEqual(pr.message, 'Already running');
  });

  it('ticketBuyerReminder queued > 0 => second emailQueue pass (6 results)', () => {
    mockRunTicketBuyerReminderTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'ticketBuyerReminder',
        status: 'ran',
        queued: 3,
      })
    );

    const summary = runMaintenance(makeApp() as never);
    assert.strictEqual(summary.results.length, 6);
    assert.strictEqual(summary.results[5].task, 'emailQueue');
  });

  it('ticketBuyerReminder queued === 0 => no second emailQueue pass (5 results)', () => {
    mockRunTicketBuyerReminderTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'ticketBuyerReminder',
        status: 'ran',
        queued: 0,
      })
    );

    const summary = runMaintenance(makeApp() as never);
    assert.strictEqual(summary.results.length, 5);
  });

  it('cleanup returns failed (errors:1) => lastRuns NOT saved', () => {
    mockRunCleanupTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'cleanup',
        status: 'failed',
        errors: 1,
      })
    );

    runMaintenance(makeApp() as never);
    assert.ok(
      !sharedState.lastRuns?.cleanup,
      'lastRuns.cleanup should not be set when status is failed'
    );
  });

  it('cleanup returns ran with errors:1 => lastRuns NOT saved', () => {
    mockRunCleanupTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'cleanup',
        status: 'ran',
        errors: 1,
      })
    );

    runMaintenance(makeApp() as never);
    assert.ok(!sharedState.lastRuns?.cleanup, 'lastRuns.cleanup should not be set when errors > 0');
  });

  it('cleanup returns ran with errors:0 => lastRuns saved', () => {
    mockRunCleanupTask.mock.mockImplementation(
      (): MaintenanceTaskResult => ({
        task: 'cleanup',
        status: 'ran',
        errors: 0,
      })
    );

    runMaintenance(makeApp() as never);
    assert.ok(sharedState.lastRuns?.cleanup, 'lastRuns.cleanup was set after successful run');
  });

  it('JSON.stringify(summary) does not leak MAINTENANCE_SECRET or token strings', () => {
    mockRunPostEventReportTask.mock.mockImplementation((): MaintenanceTaskResult => {
      throw new Error('generic error');
    });

    const summary = runMaintenance(makeApp() as never);
    const json = JSON.stringify(summary);

    assert.doesNotThrow(() => JSON.parse(json));

    const suspicious = ['MAINTENANCE_SECRET', 'secret=', 'signedToken='];
    for (const pat of suspicious) {
      assert.ok(!json.includes(pat), `summary should not contain "${pat}"`);
    }
  });
});
