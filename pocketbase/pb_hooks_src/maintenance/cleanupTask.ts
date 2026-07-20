import type { PocketBaseApp } from '../email/emailTypes';
import type { MaintenanceTaskResult } from './maintenanceTypes';
import { expireStalePendingRecords } from '../checkout/expiration';

export function runCleanupTask(app: PocketBaseApp): MaintenanceTaskResult {
  const collections = ['ticketPurchases', 'donations'] as const;
  let processed = 0;
  let errors = 0;
  for (const collection of collections) {
    try {
      const r = expireStalePendingRecords(app, collection, 'cleanup');
      processed += r.processed;
      errors += r.errors;
    } catch (err: unknown) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log('[Maintenance] cleanup failed for ' + collection + ': ' + message);
    }
  }
  return {
    task: 'cleanup',
    status: errors > 0 ? 'failed' : 'ran',
    processed,
    errors,
  };
}
