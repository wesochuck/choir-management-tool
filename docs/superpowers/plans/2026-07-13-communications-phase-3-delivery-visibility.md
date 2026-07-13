# Communications Phase 3 Delivery Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show honest per-message queue progress in History and let administrators retry only failed deliveries without resending successful ones.

**Architecture:** Add two authenticated, bounded PocketBase hook endpoints: one aggregates the existing per-recipient `emailQueue` rows for the visible history page, and one resets only failed rows for one message. The frontend stores no derived delivery status; it queries page-scoped summaries through TanStack Query, polls only active pages, and presents the results through dedicated status/detail components.

**Tech Stack:** PocketBase 0.36.9 JS hooks and Goja, generated hook bundling, React 19, TypeScript, TanStack Query v5, app UI wrappers, responsive DataTable, React Testing Library, Vitest through `node:test` compatibility.

---

**Design source:** `docs/superpowers/specs/2026-07-13-communications-ui-ux-polish-design.md`

**Depends on:** Phases 1 and 2 merged. History empty-state and mobile-card work from Phase 2 should be present before this phase.

## File responsibility map

### Create

- `pocketbase/pb_hooks_src/email/communicationDelivery.ts` — validation, queue aggregation, masking, failure categorization, summary endpoint, and retry endpoint.
- `test/pb-hooks/communicationDelivery.test.ts` — pure aggregation plus authenticated endpoint tests.
- `src/services/communication/deliveryService.ts` — frontend endpoint client.
- `src/views/admin/communications/useDeliverySummaries.ts` — page query, active-state polling, and retry mutation.
- `src/views/admin/communications/deliveryPresentation.ts` — lifecycle/queue display-state resolution and progress copy.
- `src/views/admin/communications/DeliveryStatusBadge.tsx` — consistent delivery status chip.
- `src/views/admin/communications/DeliverySummaryPanel.tsx` — channel counts, sanitized failures, and retry action.
- `src/views/admin/communications/MessageDetailsModal.tsx` — message content plus delivery details.
- `test/views/admin/communications/useDeliverySummaries.test.tsx` — polling and invalidation tests.
- `test/views/admin/communications/deliveryPresentation.test.ts` — derived display-state tests.
- `test/views/admin/communications/MessageDetailsModal.test.tsx` — retry confirmation/detail tests.

### Modify

- `pocketbase/pb_hooks_src/generate-main-pb-js.ts` — add the communication-delivery bundle, module guards, and two routes.
- `pocketbase/pb_hooks_src/email/messageHookRules.ts` — remove recipient-bearing debug logs.
- `test/pb-hooks/messageHookRules.test.ts` — verify aggregate-only logging behavior.
- `test/pb-hooks/integrity.test.ts` — register and isolate the two generated routes.
- `pocketbase/pb_hooks/main.pb.js` — regenerate only; never edit directly.
- `src/services/communication/types.ts` — delivery response contracts.
- `src/services/communicationService.ts` — export delivery types and methods.
- `src/lib/queryKeys.ts` — shared delivery query keys.
- `src/views/admin/communications/HistoryPanel.tsx` — own delivery query, status filter, details selection, and retry flow.
- `src/components/admin/MessageHistory.tsx` — status/progress column, page-local status filter, and custom mobile card.
- `src/views/admin/CommunicationView.tsx` — remove message-detail state now owned by HistoryPanel.
- `src/views/admin/communications/CommunicationModals.tsx` — remove the old message-details modal.
- `test/components/admin/MessageHistory.test.tsx` — queue states, page filter, and mobile details action.

## Critical AGENTS.md Compliance Checklist

Before starting implementation, mentally verify and incorporate the following rules (based on previous oversights):
- [ ] **React Imports:** Always use `import type React from 'react'` instead of value imports.
- [ ] **PocketBase Errors:** Use `formatPocketBaseError(err)` in UI dialogues. Do not use `err instanceof Error ? err.message : String(err)`.
- [ ] **Accessibility:** Ensure all form controls are natively semantic. Add `id` and `htmlFor` for `<label>`s. Use native `<input type="radio">` inside labels rather than div/button ARIA hacks.
- [ ] **Responsiveness:** Ensure responsive classes (e.g., `sm:hidden`, `hidden sm:inline`) are applied precisely as required.
- [ ] **File Responsibility Map:** Verify *every single detail* from the File Responsibility Map before declaring a task complete.

## Task 1: Define queue aggregation and privacy helpers

**Files:**
- Create: `pocketbase/pb_hooks_src/email/communicationDelivery.ts`
- Create: `test/pb-hooks/communicationDelivery.test.ts`

- [ ] **Step 1: Write failing pure-helper tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveDeliveryState,
  maskDestination,
  sanitizeFailureCategory,
  summarizeDeliveryRecords,
} from '../../pocketbase/pb_hooks_src/email/communicationDelivery';
import type { PocketBaseRecord } from '../../pocketbase/pb_hooks_src/email/emailTypes';

class MockRecord implements PocketBaseRecord {
  id: string;
  private readonly data: Record<string, unknown>;

  constructor(id: string, data: Record<string, unknown>) {
    this.id = id;
    this.data = data;
  }

  get(field: string): unknown { return this.data[field]; }
  set(field: string, value: unknown): void { this.data[field] = value; }
}

const queueRecord = (
  id: string,
  status: 'Pending' | 'Processing' | 'Sent' | 'Failed',
  channel: 'email' | 'sms',
  errorMessage = ''
) => new MockRecord(id, {
  status,
  recipientName: `Recipient ${id}`,
  recipientEmail: channel === 'sms' ? '5551234567' : `${id}@example.com`,
  attempts: status === 'Failed' ? 3 : 1,
  errorMessage,
  filters: JSON.stringify(channel === 'sms' ? { channel: 'sms' } : {}),
  updated: '2026-07-13T12:00:00Z',
});

test('derives queued, sending, sent, partial, failed, and untracked states', () => {
  assert.equal(deriveDeliveryState({ pending: 1, processing: 0, sent: 0, failed: 0 }), 'queued');
  assert.equal(deriveDeliveryState({ pending: 0, processing: 1, sent: 1, failed: 0 }), 'sending');
  assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 2, failed: 0 }), 'sent');
  assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 1, failed: 1 }), 'partial');
  assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 0, failed: 2 }), 'failed');
  assert.equal(deriveDeliveryState({ pending: 0, processing: 0, sent: 0, failed: 0 }), 'tracking-unavailable');
});

test('summarizes channels without returning raw errors or destinations', () => {
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

test('masks destinations and categorizes provider failures', () => {
  assert.equal(maskDestination('person@example.com', 'email'), 'p***@example.com');
  assert.equal(maskDestination('+1 555 123 4567', 'sms'), '***4567');
  assert.equal(sanitizeFailureCategory('authentication failed'), 'authentication');
  assert.equal(sanitizeFailureCategory('request timed out'), 'timeout');
});

test('caps sanitized failure details', () => {
  const records = Array.from({ length: 21 }, (_, index) =>
    queueRecord(`failed-${index}`, 'Failed', 'email', 'provider rejected')
  );
  const summary = summarizeDeliveryRecords('message-1', records);
  assert.equal(summary.failures.length, 20);
  assert.equal(summary.hasMoreFailures, true);
});
```

- [ ] **Step 2: Run tests and verify the missing-module failure**

Run: `rtk npx vitest run test/pb-hooks/communicationDelivery.test.ts`

Expected: FAIL because the delivery module does not exist.

- [ ] **Step 3: Define server-side contracts and constants**

```ts
import { parseJsonField } from './hookJson';
import type { PocketBaseRecord, PocketBaseRequestEvent, PocketBaseApp } from './emailTypes';

declare const $app: PocketBaseApp;

export type DeliveryState =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'tracking-unavailable';

export type FailureCategory =
  | 'authentication'
  | 'rate-limit'
  | 'invalid-destination'
  | 'provider-rejected'
  | 'timeout'
  | 'unknown';

export interface DeliveryCounts {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export interface DeliveryFailureDetail {
  recipientName: string;
  maskedDestination: string;
  channel: 'email' | 'sms';
  attempts: number;
  category: FailureCategory;
}

export interface DeliverySummary {
  messageId: string;
  state: DeliveryState;
  total: DeliveryCounts;
  email: DeliveryCounts;
  sms: DeliveryCounts;
  failures: DeliveryFailureDetail[];
  hasMoreFailures: boolean;
  lastActivity: string | null;
  truncated: boolean;
}

const MAX_MESSAGE_IDS = 10;
const MAX_QUEUE_ROWS_PER_MESSAGE = 10_000;
const MAX_FAILURE_DETAILS = 20;
```

- [ ] **Step 4: Implement derivation, masking, and sanitization**

Implement the three pure helpers. Failure categorization inspects the raw server-only string but returns only the fixed enum:

```ts
export function deriveDeliveryState(counts: Omit<DeliveryCounts, 'total'>): DeliveryState {
  const total = counts.pending + counts.processing + counts.sent + counts.failed;
  if (total === 0) return 'tracking-unavailable';
  if (counts.processing > 0 || (counts.pending > 0 && counts.sent + counts.failed > 0)) return 'sending';
  if (counts.pending === total) return 'queued';
  if (counts.sent === total) return 'sent';
  if (counts.failed === total) return 'failed';
  return 'partial';
}

export function maskDestination(
  destination: string,
  channel: 'email' | 'sms'
): string {
  if (channel === 'email') {
    const separator = destination.indexOf('@');
    if (separator <= 0 || separator === destination.length - 1) return '***';
    return `${destination[0]}***${destination.slice(separator)}`;
  }

  const digits = destination.replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}

export function sanitizeFailureCategory(message: string): FailureCategory {
  const normalized = message.toLowerCase();
  if (/auth|unauthor|forbidden|\b401\b|\b403\b/.test(normalized)) return 'authentication';
  if (/\b429\b|rate.?limit|too many requests/.test(normalized)) return 'rate-limit';
  if (/invalid.*(address|email|phone|number|destination)|malformed/.test(normalized)) {
    return 'invalid-destination';
  }
  if (/timeout|timed out|deadline/.test(normalized)) return 'timeout';
  if (/reject|bounce|blocked|denied/.test(normalized)) return 'provider-rejected';
  return 'unknown';
}
```

- [ ] **Step 5: Implement one-record-pass aggregation**

Implement a single record pass. Parsing the existing JSON `filters` field determines SMS; every other row is email. Unknown status values contribute to no status counter, keeping the display conservative:

```ts
function emptyCounts(): DeliveryCounts {
  return { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 };
}

export function summarizeDeliveryRecords(
  messageId: string,
  records: PocketBaseRecord[]
): DeliverySummary {
  const total = emptyCounts();
  const email = emptyCounts();
  const sms = emptyCounts();
  const failures: DeliveryFailureDetail[] = [];
  let lastActivity: string | null = null;

  for (const record of records) {
    const filters = parseJsonField<Record<string, unknown>>(record.get('filters')) ?? {};
    const channel: 'email' | 'sms' = filters.channel === 'sms' ? 'sms' : 'email';
    const channelCounts = channel === 'sms' ? sms : email;
    const status = String(record.get('status') || '').toLowerCase();
    const countKey =
      status === 'pending' ||
      status === 'processing' ||
      status === 'sent' ||
      status === 'failed'
        ? status
        : null;

    if (countKey) {
      total.total += 1;
      total[countKey] += 1;
      channelCounts.total += 1;
      channelCounts[countKey] += 1;
    }

    const updated = String(record.get('updated') || '');
    if (updated && (!lastActivity || updated > lastActivity)) lastActivity = updated;

    if (countKey === 'failed' && failures.length < MAX_FAILURE_DETAILS) {
      failures.push({
        recipientName: String(record.get('recipientName') || 'Recipient'),
        maskedDestination: maskDestination(
          String(record.get('recipientEmail') || ''),
          channel
        ),
        channel,
        attempts: Number(record.get('attempts') || 0),
        category: sanitizeFailureCategory(String(record.get('errorMessage') || '')),
      });
    }
  }

  return {
    messageId,
    state: deriveDeliveryState(total),
    total,
    email,
    sms,
    failures,
    hasMoreFailures: total.failed > failures.length,
    lastActivity,
    truncated: false,
  };
}
```

The endpoint marks truncation when its bounded read returns the sentinel 10,001st row.

- [ ] **Step 6: Run pure-helper tests**

Run: `rtk npx vitest run test/pb-hooks/communicationDelivery.test.ts`

Expected: PASS for helper tests; endpoint tests are added next.

- [ ] **Step 7: Commit aggregation helpers**

```bash
rtk git add pocketbase/pb_hooks_src/email/communicationDelivery.ts test/pb-hooks/communicationDelivery.test.ts
rtk git commit -m "feat(communications): aggregate delivery queue state"
```

## Task 2: Add the bounded delivery-summary endpoint

**Files:**
- Modify: `pocketbase/pb_hooks_src/email/communicationDelivery.ts`
- Modify: `test/pb-hooks/communicationDelivery.test.ts`

- [ ] **Step 1: Write failing authorization and bounds tests**

Create a mock event with `requestInfo().body`, `auth`, and `json(code, body)` returning `{ code, body }`. Set `(global as unknown as Record<string, unknown>).$app` to a bounded mock app. Assert:

```ts
assert.equal(handleCommunicationDeliverySummary(anonymousEvent).code, 403);
assert.equal(handleCommunicationDeliverySummary(eventWithElevenIds).code, 400);
assert.equal(handleCommunicationDeliverySummary(eventWithNonStringId).code, 400);
```

For two valid IDs, assert exactly two `findRecordsByFilter` calls, each uses `messageRef = {:messageId}`, limit `10_001`, and the response contains both summaries.

Add a sentinel test whose queue mock returns 10,001 records. Assert the handler summarizes only 10,000, sets `truncated: true`, and forces `state: 'tracking-unavailable'` so the UI never overclaims a partial read.

- [ ] **Step 2: Run tests and verify endpoint failures**

Run: `rtk npx vitest run test/pb-hooks/communicationDelivery.test.ts`

Expected: FAIL because the handler is absent.

- [ ] **Step 3: Implement strict request validation**

```ts
function validatedMessageIds(body: Record<string, unknown>): string[] | null {
  if (!Array.isArray(body.messageIds)) return null;
  const ids = [...new Set(body.messageIds)];
  if (ids.length === 0 || ids.length > MAX_MESSAGE_IDS) return null;
  if (!ids.every((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id))) {
    return null;
  }
  return ids as string[];
}
```

- [ ] **Step 4: Implement the admin-only endpoint**

```ts
export function handleCommunicationDeliverySummary(e: PocketBaseRequestEvent): unknown {
  if (!e.auth || e.auth.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const messageIds = validatedMessageIds(e.requestInfo().body);
  if (!messageIds) {
    return e.json(400, { error: `messageIds must contain 1-${MAX_MESSAGE_IDS} valid IDs` });
  }

  const summaries: Record<string, ReturnType<typeof summarizeDeliveryRecords>> = {};
  for (const messageId of messageIds) {
    const records = $app.findRecordsByFilter(
      'emailQueue',
      'messageRef = {:messageId}',
      '-updated',
      MAX_QUEUE_ROWS_PER_MESSAGE + 1,
      0,
      { messageId }
    );
    const truncated = records.length > MAX_QUEUE_ROWS_PER_MESSAGE;
    const summary = summarizeDeliveryRecords(messageId, records.slice(0, MAX_QUEUE_ROWS_PER_MESSAGE));
    summaries[messageId] = truncated
      ? { ...summary, state: 'tracking-unavailable', truncated: true }
      : summary;
  }

  return e.json(200, { summaries });
}
```

The loop is hard-bounded to ten message IDs and runs entirely server-side; no recipient destinations or raw errors leave the handler.

- [ ] **Step 5: Run endpoint tests**

Run: `rtk npx vitest run test/pb-hooks/communicationDelivery.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the summary endpoint**

```bash
rtk git add pocketbase/pb_hooks_src/email/communicationDelivery.ts test/pb-hooks/communicationDelivery.test.ts
rtk git commit -m "feat(communications): add delivery summary endpoint"
```

## Task 3: Add idempotent failed-delivery retry

**Files:**
- Modify: `pocketbase/pb_hooks_src/email/communicationDelivery.ts`
- Modify: `test/pb-hooks/communicationDelivery.test.ts`

- [ ] **Step 1: Write failing retry tests**

Test anonymous access returns 403, malformed ID returns 400, missing message returns 404, non-Sent message returns 409, and a valid message updates only Failed rows. Include a Sent row in the mocked query result and assert all of its fields remain unchanged. After one successful call, change the mock query result to no Failed rows and assert the second call returns `{ retriedCount: 0 }`.

For each retried record assert:

```ts
assert.equal(record.get('status'), 'Pending');
assert.equal(record.get('attempts'), 0);
assert.equal(record.get('errorMessage'), '');
assert.equal(record.get('processingRunId'), null);
assert.equal(record.get('processingStartedAt'), null);
assert.equal(record.get('sentAt'), null);
```

- [ ] **Step 2: Run tests and verify retry failures**

Run: `rtk npx vitest run test/pb-hooks/communicationDelivery.test.ts`

Expected: FAIL because retry is absent.

- [ ] **Step 3: Implement the retry handler**

```ts
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
    MAX_QUEUE_ROWS_PER_MESSAGE + 1,
    0,
    { messageId }
  );
  if (failed.length > MAX_QUEUE_ROWS_PER_MESSAGE) {
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
```

The route does not call the processor synchronously. The maintenance runner picks up Pending rows using the existing three-attempt bound.

- [ ] **Step 4: Run backend delivery tests**

Run: `rtk npx vitest run test/pb-hooks/communicationDelivery.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit retry behavior**

```bash
rtk git add pocketbase/pb_hooks_src/email/communicationDelivery.ts test/pb-hooks/communicationDelivery.test.ts
rtk git commit -m "feat(communications): retry only failed deliveries"
```

## Task 4: Register generated routes and remove recipient-bearing logs

**Files:**
- Modify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Modify: `pocketbase/pb_hooks_src/email/messageHookRules.ts`
- Modify: `test/pb-hooks/integrity.test.ts`
- Modify: `test/pb-hooks/messageHookRules.test.ts`
- Regenerate: `pocketbase/pb_hooks/main.pb.js`

- [ ] **Step 1: Add failing integrity assertions**

Add both routes to `requiredRoutes`:

```ts
['POST', '/api/admin/communications/delivery-summary'],
['POST', '/api/admin/communications/retry-failed'],
```

Assert each extracted callback contains its handler and `function parseJsonField`, and does not contain `function processEmailQueue`. Update exact generated totals from 39 to 41 routes and from 278 to 282 `CALLBACK-LOCAL UTILITIES` occurrences.

Add a source assertion that `messageHookRules.ts` does not contain `rawRecipients=` or `recipient phone=`.

- [ ] **Step 2: Run integrity tests and verify they fail**

Run: `rtk npx vitest run test/pb-hooks/integrity.test.ts test/pb-hooks/messageHookRules.test.ts`

Expected: FAIL because routes are absent and PII-bearing debug logs remain.

- [ ] **Step 3: Add the utility bundle**

Add `'communicationDelivery'` to `UtilityBundleName` and:

```ts
communicationDelivery: {
  files: ['email/communicationDelivery.ts'],
  symbols: [
    'handleCommunicationDeliverySummary',
    'handleRetryFailedDeliveries',
  ],
  dependsOn: ['hookJson'],
},
```

- [ ] **Step 4: Guard and register both routes**

Add both paths to `routeModuleGuards` with module `communications`, then register:

```ts
${renderRoute('POST', '/api/admin/communications/delivery-summary', 'return handleCommunicationDeliverySummary(e);')}
${renderRoute('POST', '/api/admin/communications/retry-failed', 'return handleRetryFailedDeliveries(e);')}
```

- [ ] **Step 5: Remove detailed enqueue logs**

Delete the log that serializes `record.get('recipients')` and the per-recipient normalized-phone log. Replace the final statement with this aggregate-only form:

```ts
console.log(
  '[Email Queue] message=' + record.id + ' sms=' + smsCount + ' email=' + emailCount
);
```

Do not log names, addresses, phones, raw content, filters, tokens, or errors that can contain credentials.

- [ ] **Step 6: Regenerate and verify hooks**

Run: `rtk npm run generate:pb-hooks`

Expected: generated `pocketbase/pb_hooks/main.pb.js` contains both routes exactly once.

Run: `rtk npm run check:pb-hooks`

Expected: PASS, including regeneration and integrity tests.

- [ ] **Step 7: Commit source plus regenerated output**

```bash
rtk git add pocketbase/pb_hooks_src/generate-main-pb-js.ts pocketbase/pb_hooks_src/email/messageHookRules.ts pocketbase/pb_hooks/main.pb.js test/pb-hooks/integrity.test.ts test/pb-hooks/messageHookRules.test.ts
rtk git commit -m "feat(communications): register delivery admin routes"
```

## Task 5: Add typed frontend delivery services and query keys

**Files:**
- Modify: `src/services/communication/types.ts`
- Create: `src/services/communication/deliveryService.ts`
- Modify: `src/services/communicationService.ts`
- Modify: `src/lib/queryKeys.ts`
- Create: `test/views/admin/communications/deliveryPresentation.test.ts`
- Create: `src/views/admin/communications/deliveryPresentation.ts`

- [ ] **Step 1: Write failing presentation tests**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDeliveryProgress,
  resolveDeliveryDisplayState,
} from '../../../../src/views/admin/communications/deliveryPresentation';
import type { DeliverySummary, MessageRecord } from '../../../../src/services/communicationService';

const message = (status: 'Sent' | 'Archived') => ({ status } as MessageRecord);
const summary = (state: DeliverySummary['state']): DeliverySummary => ({
  messageId: 'message-1',
  state,
  total: { total: 3, pending: 0, processing: 0, sent: 2, failed: 1 },
  email: { total: 2, pending: 0, processing: 0, sent: 2, failed: 0 },
  sms: { total: 1, pending: 0, processing: 0, sent: 0, failed: 1 },
  lastActivity: '2026-07-13T12:00:00Z',
  failures: [],
  hasMoreFailures: false,
  truncated: false,
});

describe('delivery presentation', () => {
  it('prefers archived lifecycle and handles legacy messages', () => {
    assert.equal(resolveDeliveryDisplayState(message('Archived'), summary('failed')), 'archived');
    assert.equal(resolveDeliveryDisplayState(message('Sent'), undefined), 'tracking-unavailable');
  });
  it('formats terminal progress', () => {
    assert.equal(formatDeliveryProgress(summary('partial')), '2 of 3 sent · 1 failed');
  });
});
```

- [ ] **Step 2: Run the test and verify missing types/module**

Run: `rtk npx vitest run test/views/admin/communications/deliveryPresentation.test.ts`

Expected: FAIL.

- [ ] **Step 3: Add exact frontend contracts**

```ts
export type DeliveryState =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'tracking-unavailable';

export type DeliveryFailureCategory =
  | 'authentication'
  | 'rate-limit'
  | 'invalid-destination'
  | 'provider-rejected'
  | 'timeout'
  | 'unknown';

export interface DeliveryCounts {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export interface DeliveryFailure {
  recipientName: string;
  maskedDestination: string;
  channel: 'email' | 'sms';
  attempts: number;
  category: DeliveryFailureCategory;
}

export interface DeliverySummary {
  messageId: string;
  state: DeliveryState;
  total: DeliveryCounts;
  email: DeliveryCounts;
  sms: DeliveryCounts;
  lastActivity: string | null;
  failures: DeliveryFailure[];
  hasMoreFailures: boolean;
  truncated: boolean;
}

export interface DeliverySummaryResponse {
  summaries: Record<string, DeliverySummary>;
}

export interface RetryFailedDeliveriesResponse {
  retriedCount: number;
}
```

- [ ] **Step 4: Implement the endpoint client without wrapping errors**

```ts
import { pb } from '../../lib/pocketbase';
import type { DeliverySummaryResponse, RetryFailedDeliveriesResponse } from './types';

export function getDeliverySummaries(messageIds: string[]): Promise<DeliverySummaryResponse> {
  return pb.send<DeliverySummaryResponse>('/api/admin/communications/delivery-summary', {
    method: 'POST',
    body: { messageIds },
  });
}

export function retryFailedDeliveries(messageId: string): Promise<RetryFailedDeliveriesResponse> {
  return pb.send<RetryFailedDeliveriesResponse>('/api/admin/communications/retry-failed', {
    method: 'POST',
    body: { messageId },
  });
}

export const deliveryService = { getDeliverySummaries, retryFailedDeliveries };
```

Export the types and spread `deliveryService` into `communicationService`, adding exact methods to its `satisfies` contract.

- [ ] **Step 5: Add shared query keys**

```ts
delivery: () => [...queryKeys.communications.all, 'delivery'] as const,
deliverySummaries: (messageIds: string[]) =>
  [...queryKeys.communications.delivery(), ...messageIds] as const,
```

- [ ] **Step 6: Implement pure presentation helpers**

```ts
import type {
  DeliveryState,
  DeliverySummary,
  MessageRecord,
} from '../../../services/communicationService';

export type DeliveryDisplayState = DeliveryState | 'archived';

export function resolveDeliveryDisplayState(
  message: MessageRecord,
  summary: DeliverySummary | undefined
): DeliveryDisplayState {
  if (message.status === 'Archived') return 'archived';
  return summary?.state ?? 'tracking-unavailable';
}

export function formatDeliveryProgress(summary: DeliverySummary): string {
  const { total } = summary;
  switch (summary.state) {
    case 'queued':
      return 'Queued';
    case 'sending':
      return `Sending: ${total.sent} of ${total.total} sent`;
    case 'sent':
      return `${total.sent} of ${total.total} sent`;
    case 'partial':
      return `${total.sent} of ${total.total} sent · ${total.failed} failed`;
    case 'failed':
      return `${total.failed} failed`;
    case 'tracking-unavailable':
      return 'Tracking unavailable';
  }
}
```

- [ ] **Step 7: Run presentation tests**

Run: `rtk npx vitest run test/views/admin/communications/deliveryPresentation.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit frontend delivery contracts**

```bash
rtk git add src/services/communication/types.ts src/services/communication/deliveryService.ts src/services/communicationService.ts src/lib/queryKeys.ts src/views/admin/communications/deliveryPresentation.ts test/views/admin/communications/deliveryPresentation.test.ts
rtk git commit -m "feat(communications): add typed delivery summary client"
```

## Task 6: Query and poll only active visible history pages

**Files:**
- Create: `src/views/admin/communications/useDeliverySummaries.ts`
- Create: `test/views/admin/communications/useDeliverySummaries.test.tsx`

- [ ] **Step 1: Write failing page query and polling tests**

Render the hook in a fresh QueryClientProvider with message IDs `['m1', 'm2']`. Mock `communicationService.getDeliverySummaries` to return Queued on call 1 and Sent on call 2. Assert IDs are sent in one call, tick 15 seconds, expect call 2, tick another 15 seconds, and expect no third call.

Mock `retryFailedDeliveries` to return `{ retriedCount: 2 }`; call the returned mutation, let TanStack Query settle, and assert the summary service mock's call count increases by one after invalidation.

- [ ] **Step 2: Run the test and verify missing-hook failure**

Run: `rtk npx vitest run test/views/admin/communications/useDeliverySummaries.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement one page-scoped query**

```ts
export function useDeliverySummaries(messageIds: string[]) {
  const queryClient = useQueryClient();
  const summariesQuery = useQuery({
    queryKey: queryKeys.communications.deliverySummaries(messageIds),
    queryFn: () => communicationService.getDeliverySummaries(messageIds),
    enabled: messageIds.length > 0,
    refetchInterval: (query) => {
      const summaries = Object.values(query.state.data?.summaries ?? {});
      return summaries.some((summary) =>
        summary.state === 'queued' || summary.state === 'sending'
      )
        ? 15_000
        : false;
    },
    refetchOnWindowFocus: true,
  });

  const retryMutation = useMutation({
    mutationFn: (messageId: string) => communicationService.retryFailedDeliveries(messageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.communications.delivery() });
    },
  });

  return {
    summaries: summariesQuery.data?.summaries ?? {},
    isLoading: summariesQuery.isLoading,
    error: summariesQuery.error,
    retryFailed: (messageId: string) => retryMutation.mutateAsync(messageId),
    isRetrying: retryMutation.isPending,
  };
}
```

The hook is mounted only by HistoryPanel, so leaving History unmounts it and stops polling.

- [ ] **Step 4: Run hook tests**

Run: `rtk npx vitest run test/views/admin/communications/useDeliverySummaries.test.tsx`

Expected: PASS with fake timers.

- [ ] **Step 5: Commit the bounded query**

```bash
rtk git add src/views/admin/communications/useDeliverySummaries.ts test/views/admin/communications/useDeliverySummaries.test.tsx
rtk git commit -m "feat(communications): poll active delivery summaries"
```

## Task 7: Show queue state and progress in desktop and mobile History

**Files:**
- Create: `src/views/admin/communications/DeliveryStatusBadge.tsx`
- Modify: `src/views/admin/communications/HistoryPanel.tsx`
- Modify: `src/components/admin/MessageHistory.tsx`
- Modify: `test/components/admin/MessageHistory.test.tsx`

- [ ] **Step 1: Add status, progress, filter, and mobile-card tests**

Render one Partial message with summary counts and assert:

```ts
assert.ok(screen.getAllByText('Partial').length > 0);
assert.ok(screen.getAllByText('2 of 3 sent · 1 failed').length > 0);
assert.ok(screen.getByLabelText('Delivery status'));
assert.ok(screen.getAllByRole('button', { name: 'Message details' }).length > 0);
```

Change the status filter to Failed and assert the Partial row disappears. Add Archived and legacy messages and assert `Archived` and `Tracking unavailable` respectively.

- [ ] **Step 2: Run tests and verify status failures**

Run: `rtk npx vitest run test/components/admin/MessageHistory.test.tsx`

Expected: FAIL because History still renders every non-archived message as Sent.

- [ ] **Step 3: Implement DeliveryStatusBadge**

Map display states to approved labels and existing semantic colors. Use fixed readable text, not color alone. `tracking-unavailable` displays `Tracking unavailable`; add `aria-label` containing label plus progress.

- [ ] **Step 4: Own query and status filter in HistoryPanel**

```tsx
const messageIds = useMemo(
  () => history.filter((message) => message.status !== 'Archived').map((message) => message.id),
  [history]
);
const delivery = useDeliverySummaries(messageIds);
const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('all');
```

Pass summaries, loading state, status filter, and setter to MessageHistory.

- [ ] **Step 5: Replace the old status cell and add page-local filtering**

Export:

```ts
export type DeliveryStatusFilter = 'all' | DeliveryDisplayState;
```

Filter the currently loaded page by `resolveDeliveryDisplayState(message, summaries[message.id])`. Because state is intentionally not denormalized, label the Select `Delivery status on this page`; its visible label remains `Delivery status`. Reset the filter to `all` when `currentPage` changes.

The status cell renders `DeliveryStatusBadge` plus `formatDeliveryProgress`. While the page summary query is initially loading, render `Checking…` rather than falsely showing untracked.

- [ ] **Step 6: Use DataTable renderMobileCard**

Render subject and badge in the first row, progress and date below, then one default-height `Message details` Button. Do not show Copy to Draft as a second primary mobile action; place it inside details in Task 8. Desktop retains Copy to Draft.

- [ ] **Step 7: Run History tests**

Run: `rtk npx vitest run test/components/admin/MessageHistory.test.tsx test/views/admin/communications/deliveryPresentation.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit status presentation**

```bash
rtk git add src/views/admin/communications/DeliveryStatusBadge.tsx src/views/admin/communications/HistoryPanel.tsx src/components/admin/MessageHistory.tsx test/components/admin/MessageHistory.test.tsx
rtk git commit -m "feat(communications): show delivery progress in history"
```

## Task 8: Add delivery details and confirmed retry

**Files:**
- Create: `src/views/admin/communications/DeliverySummaryPanel.tsx`
- Create: `src/views/admin/communications/MessageDetailsModal.tsx`
- Create: `test/views/admin/communications/MessageDetailsModal.test.tsx`
- Modify: `src/views/admin/communications/HistoryPanel.tsx`
- Modify: `src/views/admin/CommunicationView.tsx`
- Modify: `src/views/admin/communications/CommunicationModals.tsx`

- [ ] **Step 1: Write failing details and retry tests**

Render a Partial summary with one sanitized failure. Assert Email/SMS totals, masked destination, category label, attempts, and `Retry 1 failed delivery`. Click retry, capture the dialog options, and assert:

```ts
assert.equal(options.variant, 'danger');
assert.equal(options.confirmLabel, 'Retry failed deliveries');
assert.match(String(options.message), /Successful deliveries will not be resent/);
```

Resolve confirmation false and assert no retry call; resolve true and assert one call with the message ID. Assert a visible Close button remains in the modal.

- [ ] **Step 2: Run the test and verify missing components**

Run: `rtk npx vitest run test/views/admin/communications/MessageDetailsModal.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement DeliverySummaryPanel**

Render state/progress, last activity, Email and SMS counters, then failures. Convert category enum values to safe labels such as `Rate limited`, `Invalid destination`, and `Provider rejected`. Never accept or render a raw error field. If `hasMoreFailures`, show `Additional failures are not shown.` If `truncated`, show `Tracking is unavailable for this unusually large message.`

The retry button is present only when `summary.total.failed > 0`, the message is not Archived, and `summary.truncated === false`; partial summaries cannot supply an accurate retry confirmation count.

- [ ] **Step 4: Implement MessageDetailsModal**

Move the existing Subject/Sent To/Archived/Content markup from CommunicationModals into this file, add DeliverySummaryPanel, move Copy to Draft into the footer beside Close, and keep a visible Close button. Props:

```ts
interface MessageDetailsModalProps {
  message: MessageRecord | null;
  summary?: DeliverySummary;
  events: Event[];
  commSettings: CommunicationSettings;
  isRetrying: boolean;
  onClose: () => void;
  onCopyDraft: (message: MessageRecord) => void;
  onRetryFailed: (message: MessageRecord, failedCount: number) => Promise<void>;
}
```

- [ ] **Step 5: Own selected message and retry confirmation in HistoryPanel**

```ts
const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);

const handleRetryFailed = async (message: MessageRecord, failedCount: number) => {
  const confirmed = await dialog.confirm({
    title: 'Retry Failed Deliveries?',
    message: `Retry ${failedCount} failed ${failedCount === 1 ? 'delivery' : 'deliveries'} for “${message.subject || 'SMS message'}”? Successful deliveries will not be resent.`,
    confirmLabel: 'Retry failed deliveries',
    cancelLabel: 'Cancel',
    variant: 'danger',
  });
  if (!confirmed) return;
  const result = await delivery.retryFailed(message.id);
  dialog.showToast(`${result.retriedCount} failed ${result.retriedCount === 1 ? 'delivery' : 'deliveries'} queued for retry.`);
};
```

Pass `setSelectedMessage` to MessageHistory and render MessageDetailsModal in HistoryPanel.

- [ ] **Step 6: Remove the old global details modal**

Delete selected-message state and props from CommunicationView and CommunicationModals. Keep recipient preview and poll selection behavior unchanged.

- [ ] **Step 7: Run detail and History tests**

Run: `rtk npx vitest run test/views/admin/communications/MessageDetailsModal.test.tsx test/components/admin/MessageHistory.test.tsx test/views/admin/communications/useDeliverySummaries.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit details and retry UI**

```bash
rtk git add src/views/admin/communications/DeliverySummaryPanel.tsx src/views/admin/communications/MessageDetailsModal.tsx src/views/admin/communications/HistoryPanel.tsx src/views/admin/communications/CommunicationModals.tsx src/views/admin/CommunicationView.tsx test/views/admin/communications/MessageDetailsModal.test.tsx
rtk git commit -m "feat(communications): add failed delivery retry UI"
```

## Task 9: Phase 3 verification

**Files:**
- No source changes expected; fix only failures introduced by this phase.

- [ ] **Step 1: Run delivery frontend tests**

Run: `rtk npx vitest run test/views/admin/communications/ test/components/admin/MessageHistory.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run all PocketBase hook checks**

Run: `rtk npm run generate:pb-hooks`

Expected: generated output changes only according to hook sources.

Run: `rtk npm run check:pb-hooks`

Expected: PASS.

- [ ] **Step 3: Run lint on changed source files**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/services/communication/ src/services/communicationService.ts src/lib/queryKeys.ts src/views/admin/CommunicationView.tsx src/views/admin/communications/ src/components/admin/MessageHistory.tsx pocketbase/pb_hooks_src/email/communicationDelivery.ts pocketbase/pb_hooks_src/email/messageHookRules.ts pocketbase/pb_hooks_src/generate-main-pb-js.ts`

Expected: PASS with no warnings.

- [ ] **Step 4: Run the full build**

Run: `rtk npm run build`

Expected: PASS, including hook integrity, TypeScript, Vite, and high-severity audit.

- [ ] **Step 5: Smoke test terminal and active states**

Start: `rtk npm run dev` while a local PocketBase 0.36.9 instance containing the regenerated hooks is running.

At desktop and 390 × 844 widths, verify:

- a new message begins Queued/Sending and polls every 15 seconds;
- the browser network panel shows one bounded summary request for the visible page, not one request per message;
- polling stops once visible messages are terminal and stops when leaving History;
- Sent never says Delivered;
- Both shows separate Email and SMS totals;
- mixed terminal rows show Partial and masked failure details;
- Archived and legacy messages display without queue errors;
- cancelling retry makes no request;
- confirmed retry moves only Failed rows to Pending;
- successful rows are not resent;
- a second immediate retry returns zero and does not duplicate work.

- [ ] **Step 6: Inspect generated and migration scope**

Run: `rtk git status --short`

Expected: the generated `main.pb.js` is changed only through regeneration, no historical migration is modified, and no new migration exists unless implementation discovery explicitly proved one necessary and documented it.

## Phase 3 completion report requirements

Report endpoint limits, queue-state terminology, retry semantics, polling behavior, focused frontend tests, hook checks, lint, build, and manual state coverage. Confirm generated output was regenerated rather than hand-edited, signed-token formats stayed unchanged, queue logs contain only aggregate information, raw failures/destinations do not reach the browser, and successful deliveries cannot be retried.
