import type { PocketBaseApp } from '../email/emailTypes';
import type { MaintenanceState } from './maintenanceTypes';
import { parseJsonField } from '../email/hookJson';

declare const Record: new (
  collection: unknown,
  data?: unknown
) => { id: string; set(field: string, value: unknown): void; get(field: string): unknown };

export function getMaintenanceState(app: PocketBaseApp): MaintenanceState {
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'maintenance_state'");
    if (!record) return {};
    const raw = record.get('value');
    const parsed = parseJsonField<MaintenanceState>(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.log('[Maintenance] maintenance_state is malformed, treating as empty');
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function saveMaintenanceState(app: PocketBaseApp, state: MaintenanceState): void {
  const valueObj = JSON.stringify(state);
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'maintenance_state'");
    record.set('value', valueObj);
    app.save(record);
  } catch {
    const collection = app.findCollectionByNameOrId('appSettings');
    const record = new Record(collection, {
      key: 'maintenance_state',
      value: valueObj,
    });
    app.save(record);
  }
}

export function saveMaintenanceTaskRun(
  app: PocketBaseApp,
  taskName: string,
  ranAtIso: string
): void {
  const state = getMaintenanceState(app);
  if (!state.lastRuns) {
    state.lastRuns = {};
  }
  state.lastRuns[taskName] = ranAtIso;
  saveMaintenanceState(app, state);
}

export function isTaskDue(
  state: MaintenanceState,
  taskName: string,
  intervalMs: number,
  now: Date
): boolean {
  if (!state.lastRuns || !state.lastRuns[taskName]) return true;
  const lastRun = new Date(state.lastRuns[taskName]).getTime();
  if (isNaN(lastRun)) return true;
  return now.getTime() - lastRun >= intervalMs;
}

export function hasActiveLock(state: MaintenanceState, taskName: string, now: Date): boolean {
  const lock = state.running?.[taskName];
  if (!lock?.expiresAt) return false;
  const expiresAt = new Date(lock.expiresAt).getTime();
  if (isNaN(expiresAt)) return false;
  return expiresAt > now.getTime();
}

export function tryAcquireTaskLock(
  app: PocketBaseApp,
  state: MaintenanceState,
  taskName: string,
  ttlMs: number,
  now: Date
): boolean {
  if (hasActiveLock(state, taskName, now)) return false;
  if (!state.running) {
    state.running = {};
  }
  state.running[taskName] = {
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
  saveMaintenanceState(app, state);
  return true;
}

export function releaseTaskLock(
  app: PocketBaseApp,
  state: MaintenanceState,
  taskName: string
): void {
  if (state.running) {
    state.running[taskName] = undefined;
    const keys = Object.keys(state.running).filter((k) => state.running[k] !== undefined);
    if (keys.length === 0) {
      state.running = undefined;
    }
  }
  saveMaintenanceState(app, state);
}
