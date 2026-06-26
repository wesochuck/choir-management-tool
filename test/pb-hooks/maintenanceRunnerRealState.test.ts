import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ----------------------------------------------------------------
// Mock Record global (Goja-provided in production)
// ----------------------------------------------------------------
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
// Mock Goja globals needed by imported modules
// ----------------------------------------------------------------
globalThis.$os = {
  getenv: () => '',
};
globalThis.$security = {
  equal: (a: string, b: string) => a === b,
  hs256: (payload: string, secret: string) => payload + ':' + secret,
  randomString: (length: number) => 'x'.repeat(length),
};

// ----------------------------------------------------------------
// Module imports — task business functions are mocked; state
// helpers (getMaintenanceState, tryAcquireTaskLock, etc.) are real.
// ----------------------------------------------------------------
import { getMaintenanceState } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceState';
import * as emailQueueTask from '../../pocketbase/pb_hooks_src/maintenance/emailQueueTask';
import * as postEventReportTask from '../../pocketbase/pb_hooks_src/maintenance/postEventReportTask';
import * as ticketBuyerReminderTask from '../../pocketbase/pb_hooks_src/maintenance/ticketBuyerReminderTask';
import * as cleanupTask from '../../pocketbase/pb_hooks_src/maintenance/cleanupTask';
import { runMaintenance } from '../../pocketbase/pb_hooks_src/maintenance/maintenanceRunner';

// ----------------------------------------------------------------
// Mock task business functions so they don't query real data
// ----------------------------------------------------------------
mock.method(emailQueueTask, 'runEmailQueueTask', () => ({
  task: 'emailQueue',
  status: 'ran',
}));
mock.method(postEventReportTask, 'runPostEventReportTask', () => ({
  task: 'postEventReport',
  status: 'ran',
}));
mock.method(ticketBuyerReminderTask, 'runTicketBuyerReminderTask', () => ({
  task: 'ticketBuyerReminder',
  status: 'ran',
  queued: 0,
}));
mock.method(cleanupTask, 'runCleanupTask', () => ({
  task: 'cleanup',
  status: 'ran',
}));

// ----------------------------------------------------------------
// In-memory app that persists a single maintenance_state record
// through the real getMaintenanceState / saveMaintenanceState / etc.
// ----------------------------------------------------------------
function makeApp(): Record<string, unknown> {
  let storedValue: string | null = null;

  return {
    findFirstRecordByFilter(_collection: string, filter: string) {
      if (!filter.includes('maintenance_state')) {
        throw new Error('not found');
      }
      if (storedValue === null) {
        throw new Error('not found');
      }
      const parsed = JSON.parse(storedValue);
      return new MockRecord({ id: 'appSettings' }, { key: 'maintenance_state', value: parsed });
    },
    save(rec: unknown) {
      const record = rec as { get: (f: string) => unknown };
      storedValue = JSON.stringify(record.get('value'));
    },
    findCollectionByNameOrId(_name: string) {
      return { id: 'appSettings' };
    },
  };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
describe('runMaintenance with real state helpers', () => {
  afterEach(() => {
    mockRecordInstances.length = 0;
  });

  it('persists lastRuns.postEventReport and clears running lock after successful run', () => {
    const app = makeApp();

    runMaintenance(app as never);

    const state = getMaintenanceState(app as never);
    const reportRun = state.lastRuns?.postEventReport;
    assert.ok(reportRun, 'lastRuns.postEventReport should be set');
    assert.ok(
      !Number.isNaN(new Date(reportRun).getTime()),
      'lastRuns.postEventReport should be a valid ISO date'
    );
    assert.ok(!state.running, 'running should be empty after lock release');
  });

  it('persists lastRuns for all three scheduled tasks', () => {
    const app = makeApp();

    runMaintenance(app as never);

    const state = getMaintenanceState(app as never);
    assert.ok(state.lastRuns?.postEventReport, 'postEventReport lastRuns set');
    assert.ok(state.lastRuns?.ticketBuyerReminder, 'ticketBuyerReminder lastRuns set');
    assert.ok(state.lastRuns?.cleanup, 'cleanup lastRuns set');
    assert.ok(!state.running, 'running should be empty');
  });
});
