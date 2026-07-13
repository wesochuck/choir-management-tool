import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveDeliveryState,
  maskDestination,
  sanitizeFailureCategory,
  summarizeDeliveryRecords,
  handleCommunicationDeliverySummary,
  handleRetryFailedDeliveries,
} from '../../pocketbase/pb_hooks_src/email/communicationDelivery';
import type { PocketBaseRecord } from '../../pocketbase/pb_hooks_src/email/emailTypes';

class MockRecord implements PocketBaseRecord {
  id: string;
  private readonly data: Record<string, unknown>;

  constructor(id: string, data: Record<string, unknown>) {
    this.id = id;
    this.data = data;
  }

  get(field: string): unknown {
    return this.data[field];
  }
  set(field: string, value: unknown): void {
    this.data[field] = value;
  }
}

const queueRecord = (
  id: string,
  status: 'Pending' | 'Processing' | 'Sent' | 'Failed',
  channel: 'email' | 'sms',
  errorMessage = ''
) =>
  new MockRecord(id, {
    status,
    recipientName: `Recipient ${id}`,
    recipientEmail: channel === 'sms' ? '5551234567' : `${id}@example.com`,
    attempts: status === 'Failed' ? 3 : 1,
    errorMessage,
    filters: JSON.stringify(channel === 'sms' ? { channel: 'sms' } : {}),
    updated: '2026-07-13T12:00:00Z',
  });

describe('communicationDelivery helpers', () => {
  it('derives queued, sending, sent, partial, failed, and untracked states', () => {
    assert.equal(deriveDeliveryState({ pending: 1, processing: 0, sent: 0, failed: 0 }), 'queued');
    assert.equal(deriveDeliveryState({ pending: 0, processing: 1, sent: 1, failed: 0 }), 'sending');
    assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 2, failed: 0 }), 'sent');
    assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 1, failed: 1 }), 'partial');
    assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 0, failed: 2 }), 'failed');
    assert.equal(
      deriveDeliveryState({ pending: 0, processing: 0, sent: 0, failed: 0 }),
      'tracking-unavailable'
    );
  });

  it('summarizes channels without returning raw errors or destinations', () => {
    const summary = summarizeDeliveryRecords('message-1', [
      queueRecord('ok', 'Sent', 'email'),
      queueRecord('bad', 'Failed', 'sms', '429 provider token abc-secret'),
    ]);
    assert.equal(summary.state, 'partial');
    assert.equal(summary.email.sent, 1);
    assert.equal(summary.sms.failed, 1);
    assert.equal(summary.failures[0]?.category, 'rate-limit');
    assert.equal(summary.failures[0]?.maskedDestination, '***4567');
    assert.equal(JSON.stringify(summary).includes('abc-secret'), false);
  });

  it('masks destinations and categorizes provider failures', () => {
    assert.equal(maskDestination('person@example.com', 'email'), 'p***@example.com');
    assert.equal(maskDestination('+1 555 123 4567', 'sms'), '***4567');
    assert.equal(sanitizeFailureCategory('authentication failed'), 'authentication');
    assert.equal(sanitizeFailureCategory('request timed out'), 'timeout');
  });

  it('caps sanitized failure details', () => {
    const records = Array.from({ length: 21 }, (_, index) =>
      queueRecord(`failed-${index}`, 'Failed', 'email', 'provider rejected')
    );
    const summary = summarizeDeliveryRecords('message-1', records);
    assert.equal(summary.failures.length, 20);
    assert.equal(summary.hasMoreFailures, true);
  });
});

// ---------------------------------------------------------------------------
// Endpoint tests — requires a mock $app in global scope
// ---------------------------------------------------------------------------

type JsonResult = { code: number; body: unknown };

class MockEventRecord implements PocketBaseRecord {
  id: string;
  private data: Record<string, unknown>;
  constructor(id: string, data: Record<string, unknown>) {
    this.id = id;
    this.data = data;
  }
  get(field: string): unknown {
    return this.data[field];
  }
  set(field: string, value: unknown): void {
    this.data[field] = value;
  }
}

function makeEvent(opts: {
  role?: string | null;
  body?: Record<string, unknown>;
  queueRecords?: MockEventRecord[];
  messageRecord?: MockEventRecord | null;
  savedRecords?: MockEventRecord[];
}): { event: ReturnType<typeof buildEvent>; app: ReturnType<typeof buildApp> } {
  const saved: PocketBaseRecord[] = opts.savedRecords ?? [];
  const app = buildApp(opts.queueRecords ?? [], opts.messageRecord ?? null, saved);
  const event = buildEvent(opts.role, opts.body ?? {}, app);
  return { event, app };
}

function buildApp(
  queueRecords: MockEventRecord[],
  messageRecord: MockEventRecord | null,
  savedRecords: PocketBaseRecord[]
) {
  return {
    findRecordsByFilter: (_collection: string, filter: string, _sort: string, limit: number) => {
      if (filter.includes("status = 'Failed'")) {
        return queueRecords.filter((r) => r.get('status') === 'Failed').slice(0, limit);
      }
      return queueRecords.slice(0, limit);
    },
    findRecordById: (_collection: string, _id: string) => {
      if (!messageRecord) throw new Error('Not found');
      return messageRecord;
    },
    save: (record: PocketBaseRecord) => {
      savedRecords.push(record);
    },
  };
}

function buildEvent(
  role: string | null | undefined,
  body: Record<string, unknown>,
  app: ReturnType<typeof buildApp>
) {
  const auth = role != null ? new MockEventRecord('auth-id', { role }) : null;

  const event = {
    auth,
    requestInfo: () => ({ body, query: {}, headers: {} }),
    json: (code: number, body: unknown): JsonResult => ({ code, body }),
    response: { header: () => ({ set: () => {} }) },
    string: (code: number, content: string) => ({ code, body: content }),
  };

  // Install mock $app into global scope (Goja pattern)
  (globalThis as unknown as Record<string, unknown>)['$app'] = app;
  return event;
}

describe('handleCommunicationDeliverySummary endpoint', () => {
  it('rejects anonymous requests', () => {
    const { event } = makeEvent({ role: null, body: { messageIds: ['abc123'] } });
    const result = handleCommunicationDeliverySummary(event) as JsonResult;
    assert.equal(result.code, 403);
  });

  it('rejects non-admin roles', () => {
    const { event } = makeEvent({ role: 'singer', body: { messageIds: ['abc123'] } });
    const result = handleCommunicationDeliverySummary(event) as JsonResult;
    assert.equal(result.code, 403);
  });

  it('rejects more than 10 IDs', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `msg-${i.toString().padStart(2, '0')}`);
    const { event } = makeEvent({ role: 'admin', body: { messageIds: ids } });
    const result = handleCommunicationDeliverySummary(event) as JsonResult;
    assert.equal(result.code, 400);
  });

  it('rejects non-string IDs', () => {
    const { event } = makeEvent({ role: 'admin', body: { messageIds: [123] } });
    const result = handleCommunicationDeliverySummary(event) as JsonResult;
    assert.equal(result.code, 400);
  });

  it('returns summaries for valid IDs', () => {
    const queue = [
      queueRecord('q1', 'Sent', 'email'),
      queueRecord('q2', 'Failed', 'sms', 'timeout'),
    ];
    const { event } = makeEvent({
      role: 'admin',
      body: { messageIds: ['msg-1', 'msg-2'] },
      queueRecords: queue,
    });
    const result = handleCommunicationDeliverySummary(event) as JsonResult;
    assert.equal(result.code, 200);
    const body = result.body as { summaries: Record<string, unknown> };
    assert.ok('msg-1' in body.summaries);
    assert.ok('msg-2' in body.summaries);
  });

  it('marks truncated when limit is exceeded and forces tracking-unavailable', () => {
    // Simulate 10_001 records returned
    const hugeQueue = Array.from({ length: 10_001 }, (_, i) =>
      queueRecord(`r${i}`, 'Sent', 'email')
    );
    const { event } = makeEvent({
      role: 'admin',
      body: { messageIds: ['msg-big'] },
      queueRecords: hugeQueue,
    });
    const result = handleCommunicationDeliverySummary(event) as JsonResult;
    assert.equal(result.code, 200);
    const body = result.body as {
      summaries: Record<string, { state: string; truncated: boolean }>;
    };
    assert.equal(body.summaries['msg-big']?.state, 'tracking-unavailable');
    assert.equal(body.summaries['msg-big']?.truncated, true);
  });
});

describe('handleRetryFailedDeliveries endpoint', () => {
  it('rejects anonymous requests', () => {
    const { event } = makeEvent({ role: null, body: { messageId: 'msg1' } });
    const result = handleRetryFailedDeliveries(event) as JsonResult;
    assert.equal(result.code, 403);
  });

  it('rejects malformed messageId', () => {
    const { event } = makeEvent({ role: 'admin', body: { messageId: '../bad' } });
    const result = handleRetryFailedDeliveries(event) as JsonResult;
    assert.equal(result.code, 400);
  });

  it('returns 404 when message not found', () => {
    const { event } = makeEvent({
      role: 'admin',
      body: { messageId: 'missing1' },
      messageRecord: null,
    });
    const result = handleRetryFailedDeliveries(event) as JsonResult;
    assert.equal(result.code, 404);
  });

  it('returns 409 when message is not Sent', () => {
    const msg = new MockEventRecord('draft1', { status: 'Draft' });
    const { event } = makeEvent({
      role: 'admin',
      body: { messageId: 'draft1' },
      messageRecord: msg,
    });
    const result = handleRetryFailedDeliveries(event) as JsonResult;
    assert.equal(result.code, 409);
  });

  it('resets only Failed rows and returns retriedCount', () => {
    const msg = new MockEventRecord('sent1', { status: 'Sent' });
    const failedRec = queueRecord('fail1', 'Failed', 'email', 'timeout');
    const sentRec = queueRecord('sent-row', 'Sent', 'email');
    const savedRecords: PocketBaseRecord[] = [];
    const { event } = makeEvent({
      role: 'admin',
      body: { messageId: 'sent1' },
      messageRecord: msg,
      queueRecords: [failedRec, sentRec],
      savedRecords,
    });
    const result = handleRetryFailedDeliveries(event) as JsonResult;
    assert.equal(result.code, 200);
    const body = result.body as { retriedCount: number };
    assert.equal(body.retriedCount, 1);
    // Successful row must not have been saved
    assert.equal(savedRecords.length, 1);
    assert.equal(savedRecords[0]?.get('status'), 'Pending');
    assert.equal(savedRecords[0]?.get('attempts'), 0);
  });

  it('returns retriedCount 0 when no failed rows exist', () => {
    const msg = new MockEventRecord('sent2', { status: 'Sent' });
    const { event } = makeEvent({
      role: 'admin',
      body: { messageId: 'sent2' },
      messageRecord: msg,
      queueRecords: [],
    });
    const result = handleRetryFailedDeliveries(event) as JsonResult;
    assert.equal(result.code, 200);
    assert.equal((result.body as { retriedCount: number }).retriedCount, 0);
  });
});
