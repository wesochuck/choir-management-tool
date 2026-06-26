import type { PocketBaseApp } from '../email/emailTypes';
import type { MaintenanceTaskResult } from './maintenanceTypes';
import { processEmailQueue } from '../email/queueProcessor';

export function runEmailQueueTask(app: PocketBaseApp): MaintenanceTaskResult {
  try {
    processEmailQueue(app);
    return { task: 'emailQueue', status: 'ran' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { task: 'emailQueue', status: 'failed', errors: 1, message };
  }
}
