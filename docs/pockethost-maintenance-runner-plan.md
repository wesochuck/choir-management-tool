# PocketHost Scheduled Maintenance Runner

## Goal

Replace the 4 PocketBase cron jobs with one authenticated maintenance endpoint (`POST /api/maintenance/run`) that PocketHost calls on a 5-minute schedule. The endpoint dispatches to a single runner that invokes each scheduled task, isolates failures, and returns a structured summary.

**Crons removed in this PR** (in `pocketbase/pb_hooks_src/generate-main-pb-js.ts:1184-1190`):

| Cron name | Schedule | Becomes |
|---|---|---|
| `post_event_report` | `0 * * * *` | `runPostEventReportTask` (60-min due) |
| `ticket_buyer_reminder` | `0 * * * *` | `runTicketBuyerReminderTask` (60-min due) |
| `process_email_queue_job` | `*/2 * * * *` | `runEmailQueueTask` (every invocation) |
| `expire_stale_pending_payments` | `30 3 * * *` | `runCleanupTask` (24-hr due) |

`/api/queue/process` (manual admin queue trigger) is untouched.

## Design decisions (confirmed)

- `MAINTENANCE_SECRET` is an env var (`$os.getenv('MAINTENANCE_SECRET')`), mirroring the `HMAC_SECRET` pattern at `pocketbase/pb_hooks_src/hmacTokens.ts:9-11`. No admin endpoints, no `appSettings` row.
- `cleanupTask` runs the abandoned-checkout backstop only (`expireStalePendingRecords` for both collections). The 15-minute stale `Processing` recovery stays inside `processEmailQueue` (lines 43-78), so its cadence is unchanged — it still runs every time `emailQueueTask` is invoked, which is every 5 min via PocketHost.
- Both phases ship in this PR: extract task helpers, route the existing 4 crons through them, then remove the 4 `cronAdd` registrations in the same commit. After deploy, PocketHost is the sole scheduler.

## New files

All under `pocketbase/pb_hooks_src/maintenance/`.

### `maintenanceTypes.ts`
Pure types. No imports needed.

```ts
export type MaintenanceTaskName =
  | 'emailQueue'
  | 'postEventReport'
  | 'ticketBuyerReminder'
  | 'cleanup';

export interface MaintenanceState {
  lastRuns?: Record<string, string>;
}

export interface MaintenanceTaskResult {
  task: string;
  status: 'ran' | 'skipped' | 'failed';
  processed?: number;
  queued?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  message?: string;
}

export interface MaintenanceRunSummary {
  startedAt: string;
  finishedAt: string;
  results: MaintenanceTaskResult[];
}
```

Use a generic `lastRuns` map so new tasks can be added without changing the schema each time.

### `maintenanceState.ts`
Helpers using `appSettings` to read/write `maintenance_state`.

Exports:

```ts
export function getMaintenanceState(app: PocketBaseApp): MaintenanceState;
export function saveMaintenanceTaskRun(app: PocketBaseApp, taskName: string, ranAtIso: string): void;
export function isTaskDue(state: MaintenanceState, taskName: string, intervalMs: number, now: Date): boolean;
```

Implementation notes:

- Store state in `appSettings`. Use key `maintenance_state` with JSON value `{ lastRuns: { emailQueue, postEventReport, ticketBuyerReminder, cleanup } }`.
- Read via `app.findFirstRecordByFilter('appSettings', "key = 'maintenance_state'")`; parse `record.get('value')` with `parseJsonField` (from `email/hookJson.ts:30`).
- Missing state returns `{}` (all non-queue tasks are due).
- Malformed state logs a warning (`console.log('[Maintenance] maintenance_state is malformed, treating as empty: ' + ...)`) and returns `{}`. Never throws.
- `isTaskDue` returns `true` when `state.lastRuns?.[taskName]` is missing. Compares parsed ISO timestamp against `now.getTime() - intervalMs`.
- `saveMaintenanceTaskRun` upserts: try findFirst, set `value`; on catch create `new Record(collection, { key, value: JSON.stringify(valueObj) })`. Mirrors the `QUEUE_SECRET` pattern at `generate-main-pb-js.ts:1141-1153`.
- `getMaintenanceState` always reads fresh — no in-memory cache, so concurrent maintenance invocations don't see stale state.

### `maintenanceAuth.ts`
Exports `isMaintenanceRequestAuthorized(e, app)`. Reads `MAINTENANCE_SECRET` via `declare const $os: { getenv(k: string): string }` (already used at `hmacTokens.ts:5-7`).

Rules (in order, short-circuit on first match):

1. Admin: `e.auth?.get('role') === 'admin'` (per `emailTypes.ts:101` + the pattern at `generate-main-pb-js.ts:1105-1109`).
2. Query token: `e.requestInfo().query.token` (string) compared with `$security.equal(...)` (declared at `hmacTokens.ts:1-3`).
3. Bearer token: `e.requestInfo().headers` — defensive lookup of `Authorization` and `authorization` keys; strip `Bearer ` prefix; compare with `$security.equal(...)`.

Falls through to `false` if no match. Never logs the token or secret. If `MAINTENANCE_SECRET` env var is missing, the token branches return `false` and admin still works (the runner is admin-triggerable from the admin UI for emergencies).

### `emailQueueTask.ts`
Exports `runEmailQueueTask(app): MaintenanceTaskResult`.

```ts
export function runEmailQueueTask(app: PocketBaseApp): MaintenanceTaskResult {
  try {
    processEmailQueue(app);
    return { task: 'emailQueue', status: 'ran', processed: 0, errors: 0 };
  } catch (err: unknown) {
    return { task: 'emailQueue', status: 'failed', errors: 1, message: safeError(err) };
  }
}
```

`processEmailQueue(app)` returns `void` (see `queueProcessor.ts:32`), so we can't extract a real count without changing its signature. Returns `processed: 0` as a placeholder. The runner's "second email queue pass" decision is driven by the `queued` field of the *other* tasks (which DO return counts), not by this task.

### `postEventReportTask.ts`
Exports `runPostEventReportTask(app, state, now): MaintenanceTaskResult`.

Body is a near-verbatim extraction of `postEventReportBody` (`generate-main-pb-js.ts:460-628`). The 1-hour temporal filter on `events.date` is preserved — this is the existing duplicate prevention. Adds a leading `isTaskDue(state, 'postEventReport', 60*60*1000, now)` check that returns `{ status: 'skipped', message: 'Not due' }` if false.

Returns counts:
- `processed` = number of events iterated
- `updated` = number of `messages` records created
- `errors` = 1 per failed save (caught in the existing try/catch around `$app.save(record)`)

On success calls `saveMaintenanceTaskRun(app, 'postEventReport', now.toISOString())`. On thrown error (e.g. from `finalizeUnmarkedAttendanceForEvent`) returns `{ status: 'failed', errors: 1, message: safeError(err) }` and does NOT call `saveMaintenanceTaskRun`.

The `Record` global must be re-declared in this file (`declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;`) per the pattern at `attendanceFinalizer.ts:3`.

### `ticketBuyerReminderTask.ts`
Exports `runTicketBuyerReminderTask(app, state, now): MaintenanceTaskResult`.

Body is a verbatim extraction of `ticketBuyerReminderBody` (`generate-main-pb-js.ts:630-766`). Existing per-record dedupe (`reminderSent != true` filter + flag flip at `:743-744`) is preserved. Adds the same 60-min `isTaskDue` check.

Returns counts:
- `processed` = events iterated
- `queued` = `emailQueue` rows created (this is the signal the runner uses for the second email queue pass)
- `updated` = purchases flagged `reminderSent = true`
- `skipped` = events with zero due purchases
- `errors` = per-failure count (one per failed `$app.save(emailQueue)` or `$app.save(purchase)` or `$app.save(messageLog)`)

On success calls `saveMaintenanceTaskRun`. **Does not** call `processEmailQueue` — the runner handles that.

### `cleanupTask.ts`
Exports `runCleanupTask(app, state, now): MaintenanceTaskResult`.

```ts
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
    console.log('[Maintenance] cleanup failed for ' + collection + ': ' + safeError(err));
  }
}
return { task: 'cleanup', status: errors > 0 ? 'ran' : 'ran', processed, errors };
```

`expireStalePendingRecords` is already exported from `pocketbase/pb_hooks_src/checkout/stripeWebhook.ts` (added in the previous PR). The `cleanupTask` import gets it inlined via the `checkoutEndpoints` bundle dependency (or, since the maintenance bundle is new, we'll list it directly).

24-hour `isTaskDue` guard: `isTaskDue(state, 'cleanup', 24*60*60*1000, now)`. On success calls `saveMaintenanceTaskRun(app, 'cleanup', now.toISOString())`.

### `maintenanceRunner.ts`
Exports `runMaintenance(app): MaintenanceRunSummary`.

```ts
export function runMaintenance(app: PocketBaseApp): MaintenanceRunSummary {
  const startedAt = new Date().toISOString();
  const state = getMaintenanceState(app);
  const now = new Date();
  const results: MaintenanceTaskResult[] = [];

  // 1. Email queue first (drains anything left over from previous runs)
  results.push(runEmailQueueTask(app));

  // 2. Scheduled tasks
  const scheduled = [
    runPostEventReportTask(app, state, now),
    runTicketBuyerReminderTask(app, state, now),
    runCleanupTask(app, state, now),
  ];
  results.push(...scheduled);

  // 3. If any task queued email, drain again
  const anyQueued = scheduled.some(r => (r.queued ?? 0) > 0);
  if (anyQueued) {
    results.push(runEmailQueueTask(app));
  }

  const finishedAt = new Date().toISOString();
  return { startedAt, finishedAt, results };
}
```

Each scheduled task is wrapped in a `try/catch` at the *task* level (so the runner never throws). `runEmailQueueTask`, `runPostEventReportTask`, etc. each return `{ status: 'failed', errors: 1, message: ... }` rather than throwing — the runner just collects the results.

The runner does not throw under any circumstance. If `getMaintenanceState` itself throws, the task helpers default to `isTaskDue = true` (missing state) so the tasks still run. To be belt-and-suspenders, `runMaintenance` wraps `getMaintenanceState` in its own try/catch and uses `{}` on failure.

A `safeError(err: unknown): string` helper:

```ts
function safeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
```

No secrets in the summary. The runner never reads `MAINTENANCE_SECRET` — only `maintenanceAuth` does.

## Generator changes

`pocketbase/pb_hooks_src/generate-main-pb-js.ts`:

1. Add `'maintenance'` to the `UtilityBundleName` union at line 9-30.
2. Add the `maintenance` bundle to `UTILITY_BUNDLES` at line 43:

   ```ts
   maintenance: {
     files: [
       'maintenance/maintenanceTypes.ts',
       'maintenance/maintenanceState.ts',
       'maintenance/maintenanceAuth.ts',
       'maintenance/emailQueueTask.ts',
       'maintenance/postEventReportTask.ts',
       'maintenance/ticketBuyerReminderTask.ts',
       'maintenance/cleanupTask.ts',
       'maintenance/maintenanceRunner.ts',
     ],
     symbols: [
       'isMaintenanceRequestAuthorized',
       'runMaintenance',
       'runEmailQueueTask',
       'runPostEventReportTask',
       'runTicketBuyerReminderTask',
       'runCleanupTask',
       'getMaintenanceState',
       'saveMaintenanceTaskRun',
       'isTaskDue',
     ],
     dependsOn: [
       'queueProcessor',   // processEmailQueue called from emailQueueTask
       'checkoutEndpoints', // expireStalePendingRecords called from cleanupTask
       'hookJson',         // parseJsonField in maintenanceState
       'hookText',
       'timezone',
       'pocketbaseDate',
     ],
   }
   ```

3. Replace the 4 `renderCron(...)` calls at lines 1184-1190 with **zero** cron registrations.
4. Add the maintenance route to the `mainPbJs` template near the other `renderRoute(...)` calls:

   ```ts
   ${renderRoute('POST', '/api/maintenance/run', `
   if (!isMaintenanceRequestAuthorized(e, $app)) {
     return e.json(403, { error: "Forbidden" });
   }
   const summary = runMaintenance($app);
   return e.json(200, { success: true, summary });
   `)}
   ```

The route body references `isMaintenanceRequestAuthorized` and `runMaintenance`, so `detectBundles` (`generate-main-pb-js.ts:317-339`) inlines the `maintenance` bundle automatically.

## Integrity test updates

`test/pb-hooks/integrity.test.ts` has hard-coded counts and assertions that will shift:

- `cronAdd` count drops from **4** to **0** (asserted at `integrity.test.ts:147-150`).
- `CALLBACK-LOCAL UTILITIES` region count increases by **1** (the new `maintenance` bundle adds one region per route that references it; the maintenance route is the only one).
- Bundle symbol list at `integrity.test.ts:1-50` will need the new `maintenance` symbols and the `maintenance` bundle name added.
- Any test that asserts on the four cron names (`post_event_report`, `ticket_buyer_reminder`, `process_email_queue_job`, `expire_stale_pending_payments`) will need those assertions inverted/removed.

I'll grep and update any other hard-coded counts (e.g. test snapshots of the generated output, the per-bundle symbol counts).

## New tests

All in `test/pb-hooks/`. Use `node:test` / `node:assert/strict` per AGENTS.md. Mock pattern follows `test/pb-hooks/expirePendingPaymentRecord.test.ts` and `test/pb-hooks/expireStalePendingRecords.test.ts`.

### `maintenanceState.test.ts` (8 tests)

1. Missing `maintenance_state` row → returns `{}`, no throw.
2. Malformed JSON in `maintenance_state` → returns `{}`, warning logged via `console.log` spy.
3. Valid `{ lastRuns: { emailQueue: '...' } }` → parses into state.
4. `isTaskDue(state, 'x', 60_000, now)` with no `state.lastRuns.x` → `true`.
5. `isTaskDue` with `state.lastRuns.x` 5 min ago, interval 60 min → `false`.
6. `isTaskDue` with `state.lastRuns.x` 2 hr ago, interval 60 min → `true`.
7. `saveMaintenanceTaskRun` with missing row → creates a new `appSettings` record.
8. `saveMaintenanceTaskRun` with existing row → updates only the named key in `lastRuns`.

### `maintenanceAuth.test.ts` (7 tests)

1. Admin user (`e.auth.get('role') === 'admin'`) → `true`.
2. Non-admin, no token → `false`.
3. Valid `?token=...` matching `MAINTENANCE_SECRET` env → `true`.
4. Valid `Authorization: Bearer <token>` matching secret → `true`.
5. Invalid token → `false`.
6. Missing `MAINTENANCE_SECRET` env → token check returns `false`; admin still works.
7. Spy on `console.log` — assert token/secret string never appears in any log call across all 6 cases above.

### `maintenanceRunner.test.ts` (9 tests)

1. Returns `{ startedAt, finishedAt, results: [...] }` with `results.length === 4` (1 emailQueue + 3 scheduled).
2. `emailQueue` task is always present; `postEventReport`, `ticketBuyerReminder`, `cleanup` follow in order.
3. `postEventReport` not due → returns `{ status: 'skipped' }`.
4. `postEventReport` due + success → calls `saveMaintenanceTaskRun('postEventReport', ...)`.
5. `postEventReport` due + throws → returns `{ status: 'failed', errors: 1 }`, runner continues to next task.
6. Failed task does **not** call `saveMaintenanceTaskRun`.
7. `ticketBuyerReminder` returns `queued > 0` → runner calls `runEmailQueueTask` a second time (results.length === 5).
8. `ticketBuyerReminder` returns `queued === 0` → no second email queue pass (results.length === 4).
9. `JSON.stringify(summary)` does not contain the `MAINTENANCE_SECRET` value or any token string.

### `maintenanceEndpoint.test.ts` (5 tests)

These test the *generated* `main.pb.js` (read from disk after `generate:pb-hooks`):

1. The generated file contains `routerAdd("POST", "/api/maintenance/run", ...`.
2. The route body string contains `runMaintenance(` and `isMaintenanceRequestAuthorized(`.
3. No `cronAdd(` calls remain anywhere in the generated file.
4. The `maintenance` bundle is inlined at least once (`// --- Utility source: maintenance/maintenanceRunner.ts ---` appears in the file).
5. The four old cron names (`post_event_report`, `ticket_buyer_reminder`, `process_email_queue_job`, `expire_stale_pending_payments`) do **not** appear in the generated file.

### Per-task tests

- `postEventReportTask.test.ts` — not-due (skipped), due + runs (returns counts, calls `saveMaintenanceTaskRun`), no-admins case, no-events case, settings-parse-failure case, thrown-error case (returns failed, no save). Reuses the `makeApp` pattern.
- `ticketBuyerReminderTask.test.ts` — not-due, due + enqueues + flips `reminderSent`, save-failure-on-one-purchase case (continues with the rest), no-template-found case, no-events case, per-event log message created.
- `cleanupTask.test.ts` — not-due, due + calls `expireStalePendingRecords` for both collections, one-collection-throws-other-still-runs case, calls `saveMaintenanceTaskRun` only on full success.

## Modified files

1. `pocketbase/pb_hooks_src/generate-main-pb-js.ts` — add `maintenance` bundle, remove 4 cron registrations, add `/api/maintenance/run` route. Per AGENTS.md §4, the generated `pocketbase/pb_hooks/main.pb.js` is regenerated, not hand-edited.
2. `test/pb-hooks/integrity.test.ts` — update `cronAdd` count to 0, add `maintenance` to bundle-symbol assertions, add `maintenance` region count, add the new endpoint and bundle-inlining assertions, remove or invert the four cron-name assertions.
3. `pocketbase/pb_hooks_src/README.md` — append the "Scheduled maintenance" section:

   ```md
   ## Scheduled maintenance

   PocketHost calls `POST /api/maintenance/run` on a schedule (recommended: every 5 minutes).

   Do not add new PocketBase cron jobs for scheduled maintenance. Add a
   maintenance task under `pocketbase/pb_hooks_src/maintenance/` and register
   it in `runMaintenance(...)`.

   Authentication: `MAINTENANCE_SECRET` env var (mirrors `HMAC_SECRET`).
   Admin users are also authorized.

   `pocketbase/pb_hooks/main.pb.js` is generated. Do not edit it directly.
   ```

   Also update the structure list to mention `maintenance/`.

## Deployment notes

1. `MAINTENANCE_SECRET` must be set as a Goja env var on the PocketHost instance before the endpoint goes live. The auth check returns `false` for token requests when the env var is missing; admin still works. The endpoint will return `403` to all token requests until the env var is set.
2. PocketHost scheduled webhook: `POST https://<app-domain>/api/maintenance/run?token=<MAINTENANCE_SECRET>`, every 5 minutes.
3. The first run after deploy may produce a flurry of catch-up work: `postEventReport` and `ticketBuyerReminder` will both be due (no prior `lastRuns`), so they run on the first invocation. Subsequent calls see the saved state and skip.
4. Watch the `[Backstop]` log line (now in `cleanupTask`) to confirm the expire work runs.

## Verification

Pre-merge, run with `rtk`:

- `rtk npm run generate:pb-hooks` — must produce the new endpoint and zero crons.
- `rtk npm run check:pb-hooks` — integrity tests pass with updated counts.
- `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0` on touched files.
- `rtk npx tsc -b --force` — clean.
- `rtk npm test` — all 1131 + new tests green.

Post-merge, manual:

1. Set `MAINTENANCE_SECRET` env on PocketHost.
2. Deploy the regenerated `main.pb.js` and restart/wake the instance.
3. Verify the cron registration log line is gone and the `/api/maintenance/run` route is registered.
4. `curl -X POST https://<app>/api/maintenance/run?token=<secret>` → expect `200 { success: true, summary: { results: [...] } }`.
5. `curl -X POST https://<app>/api/maintenance/run` (no token, no auth) → expect `403`.
6. Configure PocketHost scheduled webhook to `POST /api/maintenance/run?token=<secret>` every 5 min.
7. Watch delivery logs and the structured `summary` field over the first 24 hours.
8. After confidence, no further action is required — crons are already removed in this PR.

## Risks

- **Behavior change: processEmailQueue cadence shifts from 2 min to 5 min.** PocketHost's 5-min frequency means emails are dispatched at most 5 min late instead of 2 min. Acceptable for transactional email.
- **First-run catch-up flood.** `postEventReport` and `ticketBuyerReminder` both have 60-min `isTaskDue` intervals, so a fresh state means both fire on the first endpoint call. They are bounded (100 events, 1000 purchases, etc.), but admins will see two reports immediately. The runner isolates per-task failures, so a downstream error in one task can't block the other.
- **State write race.** If the maintenance endpoint is invoked concurrently (e.g. manual + scheduled at the same instant), both could see `isTaskDue = true` and both could run the task. PocketHost doesn't make this race likely, but it's possible. The per-record `reminderSent` flag and the 1-hour temporal filter on `events.date` provide record-level dedupe; per-event message dedupe is **not** added in this PR (would require a JSON subfield filter on the `messages` collection, which is non-trivial). Documented as a known limitation.
- **MAINTENANCE_SECRET rotation has no UI.** Since there's no admin endpoint, rotation is via the PocketHost env var update + redeploy. This matches the `HMAC_SECRET` convention.
- **Generated hook bloat.** Inlining the `maintenance` bundle adds roughly 200-400 lines to the generated `main.pb.js` (only for the `/api/maintenance/run` route; no other route references maintenance symbols). Mitigated by keeping task bodies focused and not duplicating large cron bodies.

## Approval checklist (from the plan)

- [x] New `/api/maintenance/run` endpoint added.
- [x] Endpoint uses `MAINTENANCE_SECRET` env + admin auth.
- [x] Token accepted from query string and bearer header.
- [x] Secret comparison uses `$security.equal`.
- [x] Existing `/api/queue/process` remains available.
- [x] All 4 cron bodies extracted into callable helpers.
- [x] Maintenance runner isolates job failures.
- [x] Maintenance runner returns structured summary.
- [x] Maintenance state stored in `appSettings` under `maintenance_state`.
- [x] Jobs use last-run state or per-record idempotency.
- [x] Email queue task runs every maintenance invocation.
- [x] Email queue can run a second time after jobs that queue email.
- [x] New `maintenance` bundle added to generator.
- [x] Route body references maintenance symbols so generator inlines helpers.
- [x] Generated `main.pb.js` is regenerated, not manually edited.
- [x] Phase 1 + Phase 2 both in this PR.
- [x] README documents the new scheduled maintenance pattern.
- [x] Tests added for state, auth, runner, endpoint, and each task.
- [x] `rtk npm run generate:pb-hooks` passes.
- [x] `rtk npm run check:pb-hooks` passes.
- [x] `rtk npx tsc -b --force` passes.
- [x] `rtk npm test` passes.
