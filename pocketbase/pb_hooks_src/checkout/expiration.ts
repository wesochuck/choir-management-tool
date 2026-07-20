import type { PocketBaseApp, PocketBaseRecord } from '../email/emailTypes';

export type ExpireResult =
  | 'expired'
  | 'noop-already-paid'
  | 'noop-already-refunded'
  | 'noop-already-expired'
  | 'noop-not-found'
  | 'noop-missing-id'
  | 'noop-error';

export function expirePendingPaymentRecord(
  app: PocketBaseApp,
  collectionName: string,
  stripeSessionId: string,
  source: string
): ExpireResult {
  if (!stripeSessionId) {
    console.log('[expirePendingPaymentRecord] ' + source + ': missing stripeSessionId');
    return 'noop-missing-id';
  }

  let record: PocketBaseRecord;
  try {
    record = app.findFirstRecordByFilter(collectionName, 'stripeSessionId = {:stripeSessionId}', {
      stripeSessionId,
    });
  } catch {
    console.log(
      '[expirePendingPaymentRecord] ' +
        source +
        ': no row found collection=' +
        collectionName +
        ' sessionId=' +
        stripeSessionId
    );
    return 'noop-not-found';
  }

  const currentStatus = String(record.get('status') || '');
  if (currentStatus === 'paid') return 'noop-already-paid';
  if (currentStatus === 'refunded') return 'noop-already-refunded';
  if (currentStatus === 'expired') return 'noop-already-expired';

  record.set('status', 'expired');
  record.set('expiredAt', new Date().toISOString());

  try {
    app.save(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(
      '[expirePendingPaymentRecord] ' +
        source +
        ': save failed collection=' +
        collectionName +
        ' sessionId=' +
        stripeSessionId +
        ' error=' +
        message
    );
    return 'noop-error';
  }

  return 'expired';
}

export interface ExpireStaleSummary {
  processed: number;
  errors: number;
  skippedNoSessionId: number;
  pagesProcessed: number;
  hitMaxPages: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CRON_PAGE_SIZE = 100;
const CRON_MAX_PAGES = 50;
const CRON_SKIPPED_PAGE_SIZE = 25;

export function expireStalePendingRecords(
  app: PocketBaseApp,
  collectionName: string,
  source: string,
  nowMs?: number
): ExpireStaleSummary {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const cutoff = new Date(now - SEVEN_DAYS_MS).toISOString();

  let missing = 0;
  try {
    const missingRows = app.findRecordsByFilter(
      collectionName,
      "status = 'pending' && created < {:cutoff} && stripeSessionId = ''",
      '',
      CRON_SKIPPED_PAGE_SIZE,
      0,
      { cutoff }
    );
    missing = missingRows.length;
    for (let i = 0; i < missingRows.length; i++) {
      const record = missingRows[i];
      const id = record && record.id ? record.id : '<unknown>';
      console.log(
        '[Backstop] ' + collectionName + ': stale pending row missing stripeSessionId id=' + id
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('[Backstop] ' + collectionName + ': diagnostic query failed: ' + message);
  }

  let processed = 0;
  let errors = 0;
  let pagesProcessed = 0;
  let hitMaxPages = false;

  for (let page = 0; page < CRON_MAX_PAGES; page++) {
    let batch: PocketBaseRecord[];
    try {
      batch = app.findRecordsByFilter(
        collectionName,
        "status = 'pending' && created < {:cutoff} && stripeSessionId != ''",
        '',
        CRON_PAGE_SIZE,
        0,
        { cutoff }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log('[Backstop] ' + collectionName + ': query failed: ' + message);
      break;
    }
    if (!batch || batch.length === 0) break;

    pagesProcessed += 1;
    for (let i = 0; i < batch.length; i++) {
      const record = batch[i];
      const sessionId = record && record.get ? String(record.get('stripeSessionId') || '') : '';
      const result = expirePendingPaymentRecord(app, collectionName, sessionId, source);
      if (result === 'expired') processed += 1;
      else errors += 1;
    }
    if (batch.length < CRON_PAGE_SIZE) break;
  }
  if (pagesProcessed >= CRON_MAX_PAGES) hitMaxPages = true;

  console.log(
    '[Backstop] ' +
      collectionName +
      ' processed=' +
      processed +
      ' errors=' +
      errors +
      ' skippedNoSessionId=' +
      missing +
      ' pages=' +
      pagesProcessed +
      (hitMaxPages ? ' hitMaxPages=true' : '')
  );

  return { processed, errors, skippedNoSessionId: missing, pagesProcessed, hitMaxPages };
}
