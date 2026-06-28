import type { PocketBaseApp } from '../email/emailTypes';
import type {
  MaintenanceState,
  MaintenanceRunSummary,
  MaintenanceTaskResult,
} from './maintenanceTypes';
import {
  getMaintenanceState,
  isTaskDue,
  hasActiveLock,
  tryAcquireTaskLock,
  releaseTaskLock,
} from './maintenanceState';
import { runEmailQueueTask } from './emailQueueTask';
import { runPostEventReportTask } from './postEventReportTask';
import { runTicketBuyerReminderTask } from './ticketBuyerReminderTask';
import { runCleanupTask } from './cleanupTask';
import { runEventReminderTask } from './eventReminderTask';

const TASK_DUE_INTERVALS_MS: Record<string, number> = {
  postEventReport: 60 * 60 * 1000,
  ticketBuyerReminder: 60 * 60 * 1000,
  cleanup: 24 * 60 * 60 * 1000,
  eventReminder: 5 * 60 * 1000, // Check reminders every 5 minutes
};

const TASK_LOCK_TTL_MS: Record<string, number> = {
  postEventReport: 10 * 60 * 1000,
  ticketBuyerReminder: 10 * 60 * 1000,
  cleanup: 30 * 60 * 1000,
  eventReminder: 4 * 60 * 1000,
};

function safeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function runMaintenance(app: PocketBaseApp): MaintenanceRunSummary {
  const startedAt = new Date().toISOString();
  let state = getMaintenanceState(app);
  const now = new Date();
  const results: MaintenanceTaskResult[] = [];

  results.push(runEmailQueueTask(app));

  const scheduledTasks: Array<{
    name: 'postEventReport' | 'ticketBuyerReminder' | 'cleanup' | 'eventReminder';
    fn: (app: PocketBaseApp, state: MaintenanceState, now: Date) => MaintenanceTaskResult;
  }> = [
    { name: 'postEventReport', fn: runPostEventReportTask },
    { name: 'ticketBuyerReminder', fn: runTicketBuyerReminderTask },
    { name: 'cleanup', fn: runCleanupTask },
    { name: 'eventReminder', fn: runEventReminderTask },
  ];

  for (const { name, fn } of scheduledTasks) {
    if (!isTaskDue(state, name, TASK_DUE_INTERVALS_MS[name], now)) {
      results.push({ task: name, status: 'skipped', message: 'Not due' });
      continue;
    }
    if (hasActiveLock(state, name, now)) {
      results.push({ task: name, status: 'skipped', message: 'Already running' });
      continue;
    }
    if (!tryAcquireTaskLock(app, state, name, TASK_LOCK_TTL_MS[name], now)) {
      results.push({ task: name, status: 'skipped', message: 'Could not acquire lock' });
      continue;
    }
    let result: MaintenanceTaskResult;
    try {
      result = fn(app, state, now);
    } catch (err: unknown) {
      result = { task: name, status: 'failed', errors: 1, message: safeError(err) };
    }
    state = getMaintenanceState(app);
    if (result.status === 'ran' && (result.errors ?? 0) === 0) {
      if (!state.lastRuns) state.lastRuns = {};
      state.lastRuns[name] = now.toISOString();
    }
    releaseTaskLock(app, state, name);
    results.push(result);
  }

  const anyQueued = results.some((r) => (r.queued ?? 0) > 0);
  if (anyQueued) {
    results.push(runEmailQueueTask(app));
  }

  const finishedAt = new Date().toISOString();
  return { startedAt, finishedAt, results };
}
