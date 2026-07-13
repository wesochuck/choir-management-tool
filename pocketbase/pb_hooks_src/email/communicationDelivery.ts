import { parseJsonField } from './hookJson';
import type { PocketBaseRecord, PocketBaseRequestEvent, PocketBaseApp } from './emailTypes';

// Goja global – available at hook runtime but not in TS type scope
declare const $app: PocketBaseApp;

// ---------------------------------------------------------------------------
// Server-side constants
// ---------------------------------------------------------------------------

/** Maximum number of delivery records aggregated per summary request. */
export const DELIVERY_SUMMARY_MAX_ROWS = 10_000;

/** Maximum number of per-recipient failure details returned to the frontend. */
export const MAX_FAILURE_DETAILS = 20;

// ---------------------------------------------------------------------------
// Typed interfaces
// ---------------------------------------------------------------------------

export type QueueState =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'tracking-unavailable';

export type FailureCategory =
  | 'rate-limit'
  | 'authentication'
  | 'timeout'
  | 'invalid-destination'
  | 'provider-rejected'
  | 'unknown';

export interface ChannelCounts {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}

export interface SanitizedFailureDetail {
  maskedDestination: string;
  channel: 'email' | 'sms';
  category: FailureCategory;
  attempts: number;
  lastSeen: string;
}

export interface DeliverySummary {
  messageId: string;
  state: QueueState;
  email: ChannelCounts;
  sms: ChannelCounts;
  total: {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  };
  failures: SanitizedFailureDetail[];
  hasMoreFailures: boolean;
  truncated: boolean;
  lastActivity: string | null;
}

// ---------------------------------------------------------------------------
// Pure aggregation types (internal)
// ---------------------------------------------------------------------------

interface CountBucket {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Derive the display state from raw counts.
 * Must be a pure function with no side-effects.
 */
export function deriveDeliveryState(counts: CountBucket): QueueState {
  const { pending, processing, sent, failed } = counts;
  const total = pending + processing + sent + failed;
  if (total === 0) return 'tracking-unavailable';
  if (pending > 0 && processing === 0 && sent === 0 && failed === 0) return 'queued';
  if (pending > 0 || processing > 0) return 'sending';
  if (failed > 0 && sent > 0) return 'partial';
  if (failed > 0) return 'failed';
  return 'sent';
}

/**
 * Mask a destination so raw emails/phones do not reach the browser.
 * - Email: keep first char + domain (p***@example.com)
 * - SMS:   keep last 4 digits (***4567)
 */
export function maskDestination(destination: string, channel: 'email' | 'sms'): string {
  if (!destination) return '***';
  if (channel === 'email') {
    const atIdx = destination.indexOf('@');
    if (atIdx <= 0) return '***';
    return `${destination.charAt(0)}***${destination.slice(atIdx)}`;
  }
  // Strip all non-digits for phone masking
  const digits = destination.replace(/\D/g, '');
  const last4 = digits.slice(-4) || '****';
  return `***${last4}`;
}

/**
 * Categorise a raw provider error string into a safe, stable enum value.
 * Never returns the raw string so PII and tokens cannot leak.
 */
export function sanitizeFailureCategory(errorMessage: string): FailureCategory {
  const lower = (errorMessage ?? '').toLowerCase();
  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limit') ||
    lower.includes('too many')
  )
    return 'rate-limit';
  if (
    lower.includes('auth') ||
    lower.includes('token') ||
    lower.includes('credential') ||
    lower.includes('unauthorized')
  )
    return 'authentication';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (
    lower.includes('invalid') ||
    lower.includes('unsubscribed') ||
    lower.includes('bounce') ||
    lower.includes('undeliverable')
  )
    return 'invalid-destination';
  if (
    lower.includes('reject') ||
    lower.includes('block') ||
    lower.includes('spam') ||
    lower.includes('provider')
  )
    return 'provider-rejected';
  return 'unknown';
}

/**
 * Determine if a queue record belongs to the SMS channel.
 * Inspects the `filters` JSON field for a `channel: 'sms'` marker.
 */
function isSmsRecord(record: PocketBaseRecord): boolean {
  const filters = parseJsonField<Record<string, unknown>>(record.get('filters')) ?? {};
  return filters['channel'] === 'sms';
}

/**
 * Aggregate an array of queue PocketBase records into a typed DeliverySummary.
 * Deliberately avoids returning raw error strings or destination PII.
 */
export function summarizeDeliveryRecords(
  messageId: string,
  records: PocketBaseRecord[]
): DeliverySummary {
  const truncated = records.length >= DELIVERY_SUMMARY_MAX_ROWS;

  const email: ChannelCounts = { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
  const sms: ChannelCounts = { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
  const failures: SanitizedFailureDetail[] = [];
  let hasMoreFailures = false;
  let lastActivity: string | null = null;

  for (const rec of records) {
    const status = String(rec.get('status') ?? '');
    const channel: 'email' | 'sms' = isSmsRecord(rec) ? 'sms' : 'email';
    const bucket = channel === 'sms' ? sms : email;

    if (status === 'Pending') {
      bucket.pending++;
    } else if (status === 'Processing') {
      bucket.processing++;
    } else if (status === 'Sent') {
      bucket.sent++;
    } else if (status === 'Failed') {
      bucket.failed++;
    }

    const updated = rec.get('updated');
    if (updated && typeof updated === 'string') {
      if (!lastActivity || updated > lastActivity) lastActivity = updated;
    }

    if (status === 'Failed') {
      if (failures.length < MAX_FAILURE_DETAILS) {
        const rawDest = String(rec.get('recipientEmail') ?? '');
        const rawError = String(rec.get('errorMessage') ?? '');
        const rawAttempts = rec.get('attempts');
        const attempts = typeof rawAttempts === 'number' ? rawAttempts : Number(rawAttempts ?? 1);

        failures.push({
          maskedDestination: maskDestination(rawDest, channel),
          channel,
          category: sanitizeFailureCategory(rawError),
          attempts,
          lastSeen: String(rec.get('updated') ?? ''),
        });
      } else {
        hasMoreFailures = true;
      }
    }
  }

  email.total = email.pending + email.processing + email.sent + email.failed;
  sms.total = sms.pending + sms.processing + sms.sent + sms.failed;

  const totalBucket = {
    pending: email.pending + sms.pending,
    processing: email.processing + sms.processing,
    sent: email.sent + sms.sent,
    failed: email.failed + sms.failed,
    total: email.total + sms.total,
  };

  return {
    messageId,
    state: deriveDeliveryState(totalBucket),
    email,
    sms,
    total: totalBucket,
    failures,
    hasMoreFailures,
    truncated,
    lastActivity,
  };
}

// ---------------------------------------------------------------------------
// Endpoint handler helpers
// ---------------------------------------------------------------------------

/** Maximum number of message IDs allowed per summary request. */
const MAX_MESSAGE_IDS = 10;

/**
 * Validate and return the de-duplicated message IDs from a request body.
 * Returns null if validation fails.
 */
function validatedMessageIds(body: Record<string, unknown>): string[] | null {
  if (!Array.isArray(body.messageIds)) return null;
  const ids: string[] = [...new Set(body.messageIds as unknown[])];
  if (ids.length === 0 || ids.length > MAX_MESSAGE_IDS) return null;
  if (!ids.every((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id))) {
    return null;
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Endpoint: POST /api/admin/communications/delivery-summary
// ---------------------------------------------------------------------------

/**
 * Admin-only endpoint. Aggregates delivery queue state for up to 10 message IDs.
 * Each message query is hard-capped at DELIVERY_SUMMARY_MAX_ROWS records.
 * Raw destinations and error text are never returned.
 */
export function handleCommunicationDeliverySummary(e: PocketBaseRequestEvent): unknown {
  if (!e.auth || e.auth.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const messageIds = validatedMessageIds(e.requestInfo().body);
  if (!messageIds) {
    return e.json(400, { error: `messageIds must contain 1-${MAX_MESSAGE_IDS} valid IDs` });
  }

  const summaries: Record<string, DeliverySummary> = {};
  for (const messageId of messageIds) {
    const records = $app.findRecordsByFilter(
      'emailQueue',
      'messageRef = {:messageId}',
      '-updated',
      DELIVERY_SUMMARY_MAX_ROWS + 1,
      0,
      { messageId }
    );
    const truncated = records.length > DELIVERY_SUMMARY_MAX_ROWS;
    const summary = summarizeDeliveryRecords(
      messageId,
      records.slice(0, DELIVERY_SUMMARY_MAX_ROWS)
    );
    summaries[messageId] = truncated
      ? { ...summary, state: 'tracking-unavailable' as QueueState, truncated: true }
      : summary;
  }

  return e.json(200, { summaries });
}

// ---------------------------------------------------------------------------
// Endpoint: POST /api/admin/communications/retry-failed
// ---------------------------------------------------------------------------

/**
 * Admin-only endpoint. Resets only Failed emailQueue rows for one message back
 * to Pending so the maintenance runner can re-attempt them.
 * Successful rows are never touched.
 */
export function handleRetryFailedDeliveries(e: PocketBaseRequestEvent): unknown {
  if (!e.auth || e.auth.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const rawMessageId = e.requestInfo().body.messageId;
  const messageId = typeof rawMessageId === 'string' ? rawMessageId : '';
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(messageId)) {
    return e.json(400, { error: 'Invalid messageId' });
  }

  let message: PocketBaseRecord;
  try {
    message = $app.findRecordById('messages', messageId);
  } catch {
    return e.json(404, { error: 'Message not found' });
  }
  if (message.get('status') !== 'Sent') {
    return e.json(409, { error: 'Only sent messages can retry failed deliveries' });
  }

  const failed = $app.findRecordsByFilter(
    'emailQueue',
    "messageRef = {:messageId} && status = 'Failed'",
    'created',
    DELIVERY_SUMMARY_MAX_ROWS + 1,
    0,
    { messageId }
  );
  if (failed.length > DELIVERY_SUMMARY_MAX_ROWS) {
    return e.json(409, { error: 'Too many failed deliveries to retry in one request' });
  }

  let retriedCount = 0;
  for (const record of failed) {
    if (record.get('status') !== 'Failed') continue;
    record.set('status', 'Pending');
    record.set('attempts', 0);
    record.set('errorMessage', '');
    record.set('processingRunId', null);
    record.set('processingStartedAt', null);
    record.set('sentAt', null);
    $app.save(record);
    retriedCount += 1;
  }

  console.log(`[Delivery Retry] message=${messageId} queued=${retriedCount}`);
  return e.json(200, { retriedCount });
}
