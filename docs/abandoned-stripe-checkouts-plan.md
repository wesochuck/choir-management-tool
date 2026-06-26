# Abandoned Stripe Checkouts Plan

Target: `ticketPurchases` and `donations` rows that sit in `status: 'pending'`
indefinitely because the user walked away from the Stripe Checkout tab
without completing or cancelling the payment.

## Goal

Mark such rows as `status: 'expired'` so:

- Admin views display them as expired through an explicit status mapping
  (not a generic badge fallback).
- Capacity queries that filter `status = 'paid'` are unaffected.
- Operators and any future analytics can distinguish "pending for 5
  minutes" from "abandoned 3 weeks ago."
- The `expiredAt` timestamp records when the transition happened.
- Stripe `checkout.session.completed` always wins over an expiration
  signal, so a payment that completes during the abandonment window
  is not lost. Crucially, `refunded` is treated as terminal — a late or
  replayed `completed` event after a refund must NOT overwrite the row
  back to `paid` (this is a pre-existing bug in the current handler).

## Decisions

- **Status name**: `expired` — matches Stripe's
  `checkout.session.expired` event terminology.
- **Window**: 24 hours. Stripe's default Checkout session lifetime is
  24 hours, so the webhook fires at approximately the same time the
  user would be considered to have abandoned.
- **Field name**: `expiredAt` (Date) — the timestamp records when
  this app marked the row expired, not the user's actual abandon
  time.
- **Detection**: Stripe `checkout.session.expired` webhook as the
  primary path, plus a daily backstop cron for missed webhooks.
- **Backstop cron**: runs daily, marks only `pending` rows older than
  7 days as `expired`.
- **State precedence**:
  - `pending → expired` allowed (webhook or cron).
  - `expired → paid` allowed (a late `completed` event after Stripe
    expiry but before the cron ran).
  - `paid → expired` is not allowed.
  - `paid → paid` from duplicate `completed` events is a no-op.
  - `paid → refunded` remains allowed through the existing refund
    flow (`charge.refunded` handler in `stripeWebhook.ts:396`).
  - `refunded → paid` NOT allowed (a bug in the current completed
    handler; this plan fixes it).
  - `refunded → expired` not allowed.
  - `expired → expired` not allowed (idempotent no-op).
- **No silent data loss**: every transition is logged with
  `collection`, `recordId`, `stripeSessionId`, and the new status.

## State transitions

| From status  | Trigger                                | To status | Notes                                                                 |
| ------------ | -------------------------------------- | --------- | --------------------------------------------------------------------- |
| `pending`    | Stripe `checkout.session.expired`       | `expired` | Primary path. Set `expiredAt`.                                        |
| `pending`    | Backstop cron (`created < cutoff`)        | `expired` | Backstop. Set `expiredAt`.                                            |
| `expired`    | Stripe `checkout.session.completed`      | `paid`    | A late completion wins. Clear `expiredAt`.                            |
| `pending`    | Stripe `checkout.session.completed`      | `paid`    | Normal completion. Clear `expiredAt` (should already be empty).      |
| `paid`       | Stripe `checkout.session.completed` duplicate | no-op | Already paid.                                                     |
| `paid`       | any expiration signal                    | no-op     | Terminal.                                                              |
| `paid`       | `charge.refunded`                        | `refunded` | Existing refund flow in `stripeWebhook.ts:396`. Unchanged.         |
| `refunded`   | any `completed` event                    | no-op     | Terminal. **This fixes a pre-existing bug** in the completed handler. |
| `refunded`   | any expiration signal                    | no-op     | Terminal.                                                              |
| (missing)    | any                                    | log + no-op | No matching row, defensive log.                                     |
| (any)        | Missing `metadata.paymentType`            | log + no-op | Bad event.                                                          |
| (any)        | Unsupported `paymentType` value          | log + no-op | Bad event.                                                          |
| (any)        | Missing `stripeSessionId`/`session.id`  | log + no-op | Bad event.                                                          |

## Files to add

### `pocketbase/pb_migrations/1719600000_add_expired_status.js`

Forward migration. **Includes a down migration** to remove the new
status and field, matching the pattern in `1719200000_add_season_tickets.js`.

**Up migration:**
1. Add `'expired'` to the `status` enum on `pbc_ticketPurchases_001`.
2. Add `'expired'` to the `status` enum on `pbc_donations_001`.
3. Add `expiredAt` DateField (non-required) to
   `pbc_ticketPurchases_001`.
4. Add `expiredAt` DateField (non-required) to
   `pbc_donations_001`.

**Down migration:**
1. Remove `expiredAt` from both collections.
2. Filter `'expired'` out of the `status` enum on both collections.

**Caveat**: the down migration will fail if any existing row has
`status = 'expired'`, because PocketBase will reject the truncated
enum. The down must run after either `status = 'paid'`-ing or
deleting the expired rows. Documented in the migration file.

### `test/pb-hooks/expirePendingPaymentRecord.test.ts`

State-transition tests for the expired webhook branch. Uses the
`node:test` / `node:assert` pattern (no direct vitest imports) per
AGENTS.md. Imports the helper directly from
`pocketbase/pb_hooks_src/checkout/stripeWebhook.ts` (the helper
must be exported — see the modifications section below). Mocks
`$app.findFirstRecordByFilter` and `$app.save` like the existing
`hmacTokens.test.ts` does for `$security` and `$os`.

Required cases (one per row of the state-transition table above,
plus edge cases):

1. `pending` ticket + expired event → `expired`, `expiredAt` set.
2. `pending` bundle + expired event → `expired`, `expiredAt` set.
3. `pending` donation + expired event → `expired`, `expiredAt` set.
4. `paid` ticket + expired event → no-op, `expiredAt` not set.
5. `refunded` ticket + expired event → no-op.
6. `expired` ticket + duplicate expired event → no-op, `expiredAt` unchanged.
7. Missing `metadata` → no-op, log warning.
8. Missing `paymentType` → no-op, log warning.
9. `paymentType = 'unknown'` → no-op, log warning.
10. Missing `stripeSessionId` → no-op, log warning.
11. Missing `session.id` → no-op, log warning.
12. No matching row → no-op, log info.
13a. **Race test (ticket)**: `expired` ticket + completed event → `paid`, `expiredAt` cleared.
13b. **Race test (bundle)**: `expired` bundle + completed event → `paid`, `expiredAt` cleared.
13c. **Race test (donation)**: `expired` donation + completed event → `paid`, `expiredAt` cleared.
14. **Bug-fix test**: `refunded` row + completed event → no-op, status remains `refunded`.

### `test/pb-hooks/expireStalePendingRecords.test.ts`

Cron behavior tests. Same pattern. Required cases:

1. `pending` older than cutoff → `expired`, `expiredAt` set.
2. `pending` newer than cutoff → unchanged.
3. `paid` older than cutoff → unchanged.
4. `refunded` older than cutoff → unchanged.
5. `expired` older than cutoff → unchanged.
6. `pending` older than cutoff with empty `stripeSessionId` → not
   selected by the expiration query; diagnostic warning logged
   separately.
7. Save failure on one row → logged, others still processed.
8. Pagination: first page returns 100 stale records, second page
   returns 0 → loop terminates.

## Files to modify

### `pocketbase/pb_hooks_src/checkout/stripeWebhook.ts`

This is the canonical source for both the webhook body and the
exported helper. (The previous plan referenced
`pocketbase/pb_hooks_src/stripeWebhook.ts`, but the file actually
lives under `checkout/`.)

Three changes:

**A. Export a new helper `expirePendingPaymentRecord(...)`** at module
scope. It is the function the webhook body and the cron body both
call. To keep the helper testable without depending on the global
`$app`, it takes `$app` as its first argument:

```ts
expirePendingPaymentRecord(app, collectionName, stripeSessionId, source)
```

The webhook body calls it as `expirePendingPaymentRecord($app, ...)`
inside the inlined Goja body. The cron body does the same. The
tests can construct a fake `app` and pass it in.

Returns one of:

- `'expired'` — row was `pending`, now `expired`, `expiredAt` set.
- `'noop-already-paid'`, `'noop-already-refunded'`,
  `'noop-already-expired'`, `'noop-not-found'`,
  `'noop-missing-id'`, `'noop-error'`.

The helper uses `findFirstRecordByFilter` and `save`. It does NOT
defensively query for duplicates — the unique index on
`stripeSessionId` (verified in `1719000000_add_ticketing.js:37` and
`1719300000_add_donations_collection.js:11`) makes that impossible.

**B. Extend the inlined Goja body with `checkout.session.expired`**
handling. Inside the existing `handleStripeWebhook(...)` function
body (still inlined in `main.pb.js` after generation), add an
`else if` branch:

```
} else if (eventObj.type === 'checkout.session.expired') {
  const session = eventObj.data && eventObj.data.object;
  if (!session) {
    console.log('[Stripe Webhook] expired: missing session object');
    return e.json(200, { success: true, message: 'No session' });
  }
  const stripeSessionId = session.id || '';
  if (!stripeSessionId) {
    console.log('[Stripe Webhook] expired: missing session id');
    return e.json(200, { success: true, message: 'No session id' });
  }
  const paymentType = (session.metadata && session.metadata.paymentType) || '';
  if (paymentType !== 'ticket' && paymentType !== 'bundle' && paymentType !== 'donation') {
    console.log('[Stripe Webhook] expired: unsupported paymentType=' + paymentType);
    return e.json(200, { success: true, message: 'Unsupported paymentType' });
  }
  const collectionName = paymentType === 'donation' ? 'donations' : 'ticketPurchases';
  const result = expirePendingPaymentRecord($app, collectionName, stripeSessionId, 'webhook');
  console.log('[Stripe Webhook] expired: ' + result + ' collection=' + collectionName + ' sessionId=' + stripeSessionId);
  return e.json(200, { success: true, message: result });
}
```

The body uses `e.json(200, ...)` (not error codes) because Stripe
treats non-2xx as a delivery failure and retries. We always ack.

**C. Fix the `refunded → paid` bug in the existing completed handler.**
For each of the three `paymentType` branches (`ticket`, `bundle`,
`donation`), the current code only short-circuits on `status ===
'paid'`. Add a `refunded` short-circuit that returns 200 with a
log. When transitioning to `paid`, also clear `expiredAt`.

Concretely, at `stripeWebhook.ts:132-139`, replace:

```ts
if (record.get('status') === 'paid') {
  return e.json(200, { success: true, message: 'Duplicate event ignored' });
}
// Update existing pending record
record.set('status', 'paid');
record.set('stripePaymentIntentId', session.payment_intent || '');
record.set('stripeCustomerId', session.customer || '');
record.set('fulfilledAt', new Date().toISOString());
```

with:

```ts
const existingStatus = record.get('status') || '';
if (existingStatus === 'paid') {
  return e.json(200, { success: true, message: 'Duplicate event ignored' });
}
if (existingStatus === 'refunded') {
  console.log('[Stripe Webhook] completed: ignoring event for refunded record sessionId=' + stripeSessionId);
  return e.json(200, { success: true, message: 'Refunded record not overwritten' });
}
// pending or expired → paid
record.set('status', 'paid');
record.set('stripePaymentIntentId', session.payment_intent || '');
record.set('stripeCustomerId', session.customer || '');
record.set('fulfilledAt', new Date().toISOString());
record.set('expiredAt', ''); // clear any prior expiration timestamp
```

Apply the same change to the `bundle` and `donation` branches in the
same file.

**D. For the "no matching record" path in the completed handler**
(the `catch` block that creates a new record), do not set
`expiredAt` (it's a new record).

### `pocketbase/pb_hooks_src/generate-main-pb-js.ts`

Three changes:

**A. Add the new helper symbol to the `checkoutEndpoints` bundle.**
In the `checkoutEndpoints` bundle config (around line 159), extend
the `symbols` array to include the new helper:

```ts
checkoutEndpoints: {
  files: [
    'checkout/checkoutHelpers.ts',
    'checkout/emailHelpers.ts',
    'checkout/createTicketsSession.ts',
    'checkout/createBundleSession.ts',
    'checkout/createDonationSession.ts',
    'checkout/stripeWebhook.ts',
    'checkout/adminRefundTicket.ts',
    'checkout/adminRefundBundle.ts',
    'checkout/adminRefundDonation.ts',
    'checkout/adminResendConfirmation.ts',
  ],
  symbols: [
    'handleCreateTicketsSession',
    'handleStripeWebhook',
    'expirePendingPaymentRecord',  // <-- new
    'handleAdminRefundTicket',
    'handleCreateBundleSession',
    'handleAdminRefundBundle',
    'handleCreateDonationSession',
    'handleAdminRefundDonation',
    'handleAdminResendTicketConfirmation',
  ],
  ...
}
```

This is the bundle that the generator inlines into `main.pb.js`. The
`stripeWebhook.ts` file is already in the `files` array (line 166),
so the generator will inline the new exported helper into
`main.pb.js` for both the webhook body and the cron body.

The detection algorithm in `generate-main-pb-js.ts` uses these
symbol names to decide which source files to inline. The
`checkoutEndpoints` bundle's `detectBundles()` already
covers `stripeWebhook.ts` because `handleStripeWebhook` is in the
symbols array; adding `expirePendingPaymentRecord` keeps it covered.

**B. Add a new cron body and register it.** The cron body uses
`expirePendingPaymentRecord` for each stale row. The cron body lives
in `generate-main-pb-js.ts` (consistent with the existing three
crons) and is inlined into `main.pb.js`.

**Schedule**: `30 3 * * *` (3:30am UTC daily, offset from the other
crons which run at `0 * * * *` and `*/2 * * * *` so they don't pile
up on the minute boundary).

**Cron body algorithm:**

1. Compute `cutoffIso` = `now - 7 days` as ISO string.
2. For each of `ticketPurchases`, `donations`:
   - **Diagnostic query** (separate, run once per collection):
     find stale pending rows missing `stripeSessionId`:
     ```
     $app.findRecordsByFilter(
       collectionName,
       "status = 'pending' && created < {:cutoff} && stripeSessionId = ''",
       '', 25, 0, { cutoff: cutoffIso }
     )
     ```
     Log the count and IDs (defensively — record could be null in
     pathological cases) as a warning. These rows are
     intentionally excluded from the main expiration loop
     because they cannot be processed.
   - Set `processed = 0`, `errors = 0`.
   - Repeatedly call
     `$app.findRecordsByFilter(collectionName,
     "status = 'pending' && created < {:cutoff} && stripeSessionId != ''",
     '', 100, 0, { cutoff: cutoffIso })`.
   - The `stripeSessionId != ''` filter is critical: it prevents the
     cron from repeatedly selecting the same bad records that
     were intentionally skipped, which would otherwise cause the
     cron to loop on the same first page until the
     max-iterations guard fires.
   - Per AGENTS.md §4 ("Avoid sorting by `created` or `updated`
     inside Goja hooks/endpoints unless the schema is verified"),
     use empty sort `''`. Do not offset-page through a mutating
     result set.
   - For each result, call
     `expirePendingPaymentRecord($app, collectionName,
     record.get('stripeSessionId'), 'cron')`.
   - Track `processed` and `errors` counts.
   - **Continue until the result set is empty** (returned 0 records,
     not until a partial page is returned). This avoids the
     partial-page-on-a-mutating-set trap where a cron could re-visit
     records it just processed if those rows still matched after
     their status was updated and the cron was offsetting.
   - Use a maximum-iterations guard (say, 50 pages of 100 = 5000
     rows) to bound the cron in pathological cases.
3. Log a summary per collection:
   `"[Backstop] " + collectionName + " processed=" + processed +
    " errors=" + errors + " skippedNoSessionId=" + missingCount`.

Per AGENTS.md §4, "Logging must be defensive." No `JSON.stringify`
on a possibly-`null` record.

**C. Per AGENTS.md §4, defensive logging throughout.** Every log
statement uses string concatenation with explicit null/default
handling. No exceptions thrown from the log path.

### `src/services/ticketService.ts`

Extend the `status` union on `TicketPurchase` (line 55) to include
`'expired'`. Add `expiredAt?: string` to the interface.

### `src/services/donationService.ts`

Extend the `status` union on `DonationRecord` (line 20) to include
`'expired'`. Add `expiredAt?: string` to the interface.

### `src/views/admin/ticketing/TicketingWillCallTab.tsx`

Find the existing status `Badge` mapping (around line 280) and add
an explicit `'expired'` branch. Default styling: muted/secondary
variant, distinct from `paid` (success) and `pending` (warning/info).
This prevents relying on a default badge color fallback.

### `src/views/admin/donations/donationColumns.tsx`

The previous plan targeted `DonationsView.tsx`, but the badge
mapping actually lives in `donationColumns.tsx` (around line 92-105).
The current code:

```ts
tone={
  row.original.status === 'paid'
    ? 'success'
    : row.original.status === 'refunded'
      ? 'danger'
      : 'neutral'
}
```

falls through to `neutral` for `expired`, which is technically
tolerant but not product-ready. Add an explicit `'expired'`
branch. Recommended styling: muted/warning/secondary variant,
distinct from `paid` and `refunded`.

## Files NOT touched

- `src/components/admin/SingerPatronageHistoryTab.tsx` — the existing
  status filter is `paid`-only; expired rows simply won't show up
  there, which is correct.
- Other admin views beyond the two above — none currently render
  the status of a ticketPurchase or donation row.
- No new UI for "show me abandoned checkouts in the last 7 days."
  The `expiredAt` field is captured for future use.

## Tests in detail

The two new test files above are required for production. They
follow the patterns in `test/pb-hooks/hmacTokens.test.ts` and
`test/pb-hooks/ticketing.test.ts` (use `node:test` / `node:assert`,
mock `$app` and `$os` directly, no vitest imports).

The race test (case 13) and bug-fix test (case 14) are critical
regression guards:

- Case 13 confirms a late `checkout.session.completed` after Stripe
  expiration transitions `expired → paid` correctly and clears
  `expiredAt`.
- Case 14 confirms a replayed or late `checkout.session.completed`
  after a refund does NOT overwrite `refunded → paid`.

## Manual ops after deploy (hard dependencies, not nice-to-haves)

These are deployment-blocking:

1. **Stripe dashboard**: enable `checkout.session.expired` on the
   live webhook endpoint. Verify the event appears in Stripe's
   webhook delivery logs after the first deployment.
2. **Stripe test mode**: if the app uses separate webhook endpoints
   for test and live, ensure `checkout.session.expired` is enabled
   on both.
3. **Stripe API version**: confirm the pinned API version emits the
   expected Checkout Session payload shape
   (`session.id`, `session.metadata.paymentType`).

## Database verification queries

These are **logical checks** expressed in SQL-like syntax for clarity.
Run the equivalent against the deployment environment: PocketBase
admin UI filters, a SQLite query against the `pb_data/data.db` file,
or the PocketBase data browser, depending on the operational setup.

Run these against the production database after deploy to confirm the
new state transitions are working as expected.

```text
// Find pending rows older than 24 hours (should be 0 within a day
// of deploy if the webhook is firing)
SELECT * FROM ticketPurchases WHERE status = 'pending' AND created < <now - 24h>;
SELECT * FROM donations WHERE status = 'pending' AND created < <now - 24h>;

// Find expired rows with empty expiredAt (should be 0)
SELECT * FROM ticketPurchases WHERE status = 'expired' AND (expiredAt IS NULL OR expiredAt = '');
SELECT * FROM donations WHERE status = 'expired' AND (expiredAt IS NULL OR expiredAt = '');

// Find paid rows with expiredAt unexpectedly set (should be 0;
// if non-zero, the completed handler is not clearing it)
SELECT * FROM ticketPurchases WHERE status = 'paid' AND expiredAt IS NOT NULL AND expiredAt != '';
SELECT * FROM donations WHERE status = 'paid' AND expiredAt IS NOT NULL AND expiredAt != '';

// Find rows that the cron expired in the last 7 days
SELECT * FROM ticketPurchases WHERE status = 'expired' AND expiredAt > <now - 7d>;
SELECT * FROM donations WHERE status = 'expired' AND expiredAt > <now - 7d>;

// Find refunded rows (verify the bug fix: they should still be refunded
// even if a late completed event arrived)
SELECT * FROM ticketPurchases WHERE status = 'refunded' AND updated > <deployment time>;
SELECT * FROM donations WHERE status = 'refunded' AND updated > <deployment time>;
```

## Risks (explicit)

- **High risk: completed-vs-expired event ordering.** Stripe may
  deliver `checkout.session.completed` and `checkout.session.expired`
  out of order near the 24h boundary. The completed handler now
  allows `pending → paid` and `expired → paid` and clears `expiredAt`
  on the transition. Confirmed by test case 13.
- **High risk: `refunded → paid` overwriting.** The previous code
  was vulnerable: a late or replayed `completed` event after a
  refund would silently flip the row back to `paid`, breaking the
  refund. The plan fixes this with an explicit `refunded`
  short-circuit in the completed handler. Confirmed by test case 14.
- **Medium risk: cron misclassification.** The cron marks old
  `pending` rows as `expired` without checking Stripe. Mitigation:
  every row the cron touches is logged with its `stripeSessionId`
  and `created` for manual audit. A future improvement (out of
  scope) is to call `retrieveCheckoutSession` on each row before
  expiring, but that adds Stripe API cost per row.
- **Medium risk: PocketBase index on `(status, created)`.** The
  cron query `status = 'pending' && created < <cutoff>` may be slow
  on large collections without a composite index. The migration
  should verify that the existing single-column indexes on
  `status` and `created` are sufficient; if not, add a composite
  index. This is a follow-up, not in the initial migration.
- **Low risk: enum truncation on down migration.** If a row has
  `status = 'expired'` when the down migration runs, PocketBase
  will reject it. Documented in the migration file.

## Regenerate

After modifying `pocketbase/pb_hooks_src/checkout/stripeWebhook.ts`
and `pocketbase/pb_hooks_src/generate-main-pb-js.ts`, run:

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

## Rollback

- **Schema**: run the down migration (after clearing any `expired`
  rows).
- **Webhook**: revert the `stripeWebhook.ts` change and regenerate.
- **Cron**: remove the cron registration in
  `generate-main-pb-js.ts` and regenerate.
- **Completed-handler bug fix**: the `refunded` short-circuit is
  additive and safe to leave in even if the rest is rolled back.

## Verification

Before pushing:

1. `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0` on changed files
2. `rtk npx tsc -b --force` to confirm frontend type updates compile
3. `rtk npm run generate:pb-hooks && rtk npm run check:pb-hooks` to confirm the generator + integrity test
4. `rtk npm test` for the full suite — should remain green plus the new tests pass

After deploy, before declaring done:

1. Run the database verification queries above. All should return
   expected counts.
2. Send a test `checkout.session.expired` event from the Stripe
   dashboard for a known test session. Confirm the row transitions
   to `expired` with `expiredAt` set.
3. Confirm the cron body works by manually backdating a `pending`
   row's `created` to >7 days ago and waiting for the next 3:30am
   UTC run. Confirm the row is marked `expired`.
4. Confirm a real test-mode checkout (e.g., one you start and don't
   complete) is marked `expired` after Stripe's 24h window.
5. Trigger a `charge.refunded` event, then trigger a
   `checkout.session.completed` event for the same session (or wait
   for a replay). Confirm the row stays `refunded`, not `paid`. This
   is the bug-fix verification.

## Out of scope for this PR

- No email to the user about their abandoned cart.
- No analytics rollup.
- No deletion of expired rows (kept for audit).
- No Stripe verification call in the cron body (logged for future
  manual audit only).
- No new index on `(status, created)` (deferred until query is
  observably slow).
- No changes to `SingerPatronageHistoryTab` or other patron
  history views.

## Approval checklist

- [ ] Webhook path corrected to `pocketbase/pb_hooks_src/checkout/stripeWebhook.ts`
- [ ] `expirePendingPaymentRecord` exported from `checkout/stripeWebhook.ts`
- [ ] `expirePendingPaymentRecord` symbol added to `checkoutEndpoints.symbols` in `generate-main-pb-js.ts`
- [ ] `checkout.session.expired` branch added to webhook body, only `pending → expired`
- [ ] Completed handler short-circuits on `refunded` (ticket, bundle, donation branches)
- [ ] Completed handler clears `expiredAt` on `pending → paid` and `expired → paid`
- [ ] Cron body uses empty sort `''`, not `created` sort
- [ ] Cron body uses loop-until-empty pagination, not offset pages
- [ ] Cron body has max-iterations guard
- [ ] Cron body has per-row save error handling
- [ ] `expired` enum added to `ticketPurchases.status` and `donations.status` (forward migration)
- [ ] `expiredAt` field added to both collections (forward migration)
- [ ] Down migration present and documented
- [ ] Tests cover state-transition table (14 webhook + 8 cron cases)
- [ ] Frontend types updated in `ticketService.ts` and `donationService.ts`
- [ ] UI badge mapping updated in `TicketingWillCallTab.tsx` and `donationColumns.tsx`
- [ ] `rtk npm run generate:pb-hooks && rtk npm run check:pb-hooks` pass
- [ ] `rtk npx tsc -b --force` passes
- [ ] `rtk npm test` passes

## Aggregate/calc audit

These items are higher-risk than they look because they affect admin
dashboards and patron records. A regression in any of them would
silently skew financial reporting or capacity planning.

- [ ] **Confirm all ticket totals / capacity / export calculations use only `status === 'paid'`.** Search the codebase for any place that aggregates `ticketPurchases` by amount, count, or capacity, and verify each has a `status = 'paid'` filter or guard. Specifically check:
  - `pocketbase/pb_hooks_src/checkout/createTicketsSession.ts` (capacity check) — already filtered, confirmed.
  - `pocketbase/pb_hooks_src/checkout/createBundleSession.ts` (capacity check) — already filtered, confirmed.
  - `pocketbase/pb_hooks_src/ticketScan/ticketValidation.ts` (scan eligibility) — already filtered, confirmed.
  - `pocketbase/pb_hooks_src/generate-main-pb-js.ts:682` (reminderSent query) — already filtered, confirmed.
  - `src/services/ticketService.ts:221` (capacity helper) — already filtered, confirmed.
  - `src/services/communication/ticketBuyerResolver.ts:14` (buyer resolution) — already filtered, confirmed.
  - `src/views/admin/PatronsView.tsx:89` (patron LTV) — `paidPurchases` is filtered, confirmed.
  - `src/views/admin/ticketing/TicketingWillCallTab.tsx:70` (will-call list) — `purchases.filter((p) => p.status === 'paid')`, confirmed.
- [ ] **Confirm donation count / total / average calculations use only `status === 'paid'`.** Same audit pattern. Specifically check:
  - `src/services/donationService.ts:111` (`getDonations`) — accepts a filter argument, callers are responsible for the filter.
  - `src/views/admin/PatronsView.tsx:77` (donation LTV) — passes `status = "paid"` filter, confirmed.
  - `src/views/admin/donations/useDonationFilters.ts:73-75` (donation stats) — already filters to paid, confirmed.
  - `src/components/admin/SingerPatronageHistoryTab.tsx:67-68` (patronage history) — already filters to paid, confirmed.
- [ ] **Add regression tests proving `expired` rows do not affect ticket or donation totals.** New tests required, beyond the state-transition tests:
  - `test/ticketTotalsExcludingExpired.test.ts` (or similar): mocks a mix of `paid`, `pending`, `expired`, and `refunded` rows; runs the aggregate logic from `TicketingWillCallTab`, `PatronsView`, and the capacity check; asserts that only `paid` rows are counted.
  - `test/donationTotalsExcludingExpired.test.ts` (or similar): same for donations.
  - These tests guard against future code changes that drop or weaken the `status = 'paid'` filter.
