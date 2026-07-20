# AGENTS.md

Mandatory instructions for AI coding agents working in this repository.

## 1. Critical Rules

- Prefix every shell command with `rtk`. Do not run raw `git`, `npm`, `npx`, or similar commands.
- Do not use `any`, `as any`, `// @ts-ignore`, or `// eslint-disable` without explicit user approval. Use `unknown` and narrow types.
- Never edit generated files, especially `pocketbase/pb_hooks/main.pb.js`. Edit sources under `pocketbase/pb_hooks_src/` and regenerate.
- Never modify historical migrations. Every schema change requires a new forward migration.
- Use Shoelace wrappers from `src/components/ui/`, not raw Shoelace imports.
- Every Shoelace wrapper must use `safeSlProps` from `src/components/ui/shared.ts`.
- PocketBase server `0.36.9` and JS SDK `^0.27.0` are not in lockstep. Verify APIs before relying on them.
- PocketBase errors must propagate raw. Do not wrap them with `throw new Error(err.message)`.
- `profiles` has no `email` field. Use `getProfileEmail(profile)` on the frontend; resolve the related user record on the backend.
- Singer eligibility is based on a non-empty `voicePart`, not `role === 'singer'`.
- Display the stored `'Idle'` status as `"On Break"` in the UI. Do not change the DB enum, API payloads, or CSV mapping.
- Do not log secrets, `HMAC_SECRET`, or full signed tokens.
- Avoid unbounded network fan-out. Use the helpers in `src/lib/networkSafety.ts`.
- Prevent $O(N^2)$ bottlenecks. Never perform $O(N)$ linear scans (`.find()`, `.filter()`) inside tight loops or `Array.prototype.sort()` comparators. Use $O(1)$ lookup Maps instead.
- For non-trivial changes, run relevant checks before finishing and summarize results.

## 2. Commands and Verification

> `rtk` sandboxes shell execution and prevents destructive raw commands from bypassing project safety rails.

All shell commands must use `rtk`:

```bash
rtk git status
rtk npm test
rtk npm audit --audit-level=high
```

Use the relevant checks:

```bash
# Package or dependency changes
rtk npm audit --audit-level=high

# PocketBase hook changes
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks

# Single test file
rtk npx vitest run path/to/file.test.ts

# ESLint
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0

# TypeScript Compilation (Run this when removing dead code to catch broken re-exports)
rtk npx tsc -b --force
```

Do not use `rtk npx eslint`; use the direct binary path above.

Before finishing, report:

- What changed.
- Which `rtk` checks were run.
- Whether `tsc -b --force` was run after any dead code or export removal.
- Which checks could not be run and why.
- Whether generated files were avoided or regenerated correctly.
- Whether unsafe TypeScript patterns were avoided.
- Whether schema changes include forward migrations.
- Any remaining risks.

## 3. TypeScript, React, and Tests

Use `unknown` at untyped boundaries:

```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
}
```

Do not import React only for JSX. Unused React imports trigger `TS6133` in CI. Use type-only imports when needed:

```ts
import type React from 'react';
```

Tests use the project’s Vitest compatibility layer:

```ts
import { describe, it, test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
```

Do not import directly from `vitest`.

Use the wrapper mock API:

```ts
const fn = mock.fn(impl);
const spy = mock.method(obj, 'methodName', impl);
fn.mock.mockImplementation(newImpl);
fn.mock.resetCalls();
assert.strictEqual(fn.mock.callCount(), 1);
assert.deepStrictEqual(fn.mock.calls[0].arguments, ['arg1']);
```

For timers, use `mock.timers.enable()`, `mock.timers.tick(ms)`, and `mock.timers.reset()`. Do not wait for real time `setTimeout`.

For DOM tests that use `render(...)`, add explicit cleanup:

```ts
// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

Mock heavy child components in container-view tests when they use modals, portals, autocomplete, global listeners, or complex effects.

When responsive layouts render duplicate text, prefer `getAllBy*` queries.

For React Query async rendering, allow the event loop to settle before asserting on fetched data.

For React components, strictly adhere to Hook purity rules:

- Do not call impure functions (like `Date.now()`) directly in the render body. Initialize them via `useState(() => Date.now())` or capture them in `useEffect`.
- Never place hooks below early returns (e.g., `if (isLoading) return;`).
- Strictly adhere to `react-hooks/exhaustive-deps`. All variables and functions referenced from the component scope must be included in the dependency arrays for `useEffect`, `useMemo`, and `useCallback`. Omitting dependencies will fail Husky pre-commit checks.

## 4. Styling, UI, and Components

Use Tailwind utilities for layout, spacing, colors, sizing, typography, and minor adjustments. Avoid standalone component CSS unless Tailwind cannot express the requirement.

Inline styles are allowed only for truly dynamic values. Mark each exception:

```tsx
{
  /* @allow-inline-style - explanation */
}
```

Use app dialogs from `useDialog()`:

```ts
dialog.confirm(...);
dialog.showMessage(...);
dialog.showToast(...);
```

Do not use `window.alert`, `window.confirm`, or `window.prompt`.

Destructive actions must use danger-styled confirmation modals with clear labels. Every modal needs a visible `Cancel` or `Close` button.

Dashboard and list empty states must include a call-to-action button. Creation actions should begin with `+`, such as `+ Create New Bundle`.

For new lazy-loaded route modules, use `lazyWithReload(...)` from `src/App.tsx`.

When aligning `<Input>` and `<Select>` components horizontally, be aware that `<Input>` includes an invisible `py-[3px]` padding wrapper (6px total height difference) to accommodate focus rings. To align a `<Select>` perfectly with an `<Input>` inside a flex container, wrap the `<Select>` in `<div className="py-[3px]">`.

When building UI components, adhere to the app's semantic theme:

- Avoid raw `dark:bg-*` or `dark:text-*` classes. The app handles dark mode via semantic CSS variables (e.g., `bg-surface`, `bg-bg`, `text-text`, `text-text-muted`, `border-border`).
- For dynamic status blocks or alerts, use explicit semantic color pairs (e.g., `bg-green-50 text-green-900` or `bg-red-50 text-red-900`).
- Due to strict Tailwind linting (`tailwindcss/no-contradicting-classname`), never combine `border-color` utilities (like `border-slate-100`) and `divide-color` utilities (like `divide-slate-100`) on the same element.

## 5. Shoelace and Web Components

Do not import raw Shoelace components directly. Use wrappers from `src/components/ui/`.

Every wrapper must strip undefined props with `safeSlProps`:

```tsx
import { safeSlProps } from '../shared';

<SlComponent
  ref={slRef}
  {...safeSlProps({
    prop1: value,
    className,
    ...(consumerRest as Record<string, unknown>),
  } as Record<string, unknown>)}
/>;
```

Never spread `{...rest}` directly onto a Shoelace component.

Use the existing `Button` wrapper as the pattern:

- Test mode renders a plain element.
- `as={Link}` or non-button elements render the requested component.
- Production buttons render Shoelace.

When buttons or links include decorative icons or emoji, hide the icon from assistive technology:

```tsx
<Button>
  <span aria-hidden="true">🏠</span>
  <span>Home</span>
</Button>
```

Icon-only buttons require an `aria-label`.

## 6. Data Display

Use `DataTable` from `src/components/ui/DataTable` for tabular data.

Important conventions:

- Use `cardSection` and `cardSide` for automatic mobile layout.
- Use `renderMobileCard` for complex mobile rows.
- Use `renderRow` only when replacing the full desktop and mobile row.
- Use `getRowId` when selection should track real data IDs.
- `onSelectionChange` receives `Set<string>`.
- Sorting is enabled with `enableSorting`.
- Server-side sorting requires `manualSorting` and `onSortingChange`.
- Use `hidePagination` for small datasets.
- The TanStack `react-hooks/incompatible-library` warning is known and benign.

## 7. TanStack Query

Shared query keys live in `src/lib/queryKeys.ts`. Do not inline ad-hoc key arrays.

Do not blindly sync query data into local state with `useEffect`; background refetches can wipe unsaved user input. Initialize local state once with a ref gate or use form defaults.

When using `useMutation`, depend on the whole mutation object instead of `.mutateAsync`:

```ts
const createThing = useCallback(async () => {
  await thingMutation.mutateAsync(...);
}, [thingMutation]);
```

Refresh helpers must return the invalidation promise:

```ts
const refresh = useCallback(
  () => queryClient.invalidateQueries({ queryKey: queryKeys.foo.list() }),
  [queryClient]
);
```

Do not bypass an existing mutation with `void serviceFn(...)` inside an effect. Use `mutation.mutateAsync(...)` and guard repeat invocations with a ref.

Keep mutation error handling at the call site or inside the specific pipeline. Avoid unconditional `onError` handlers that overwrite context-aware error handling.

Hook tests need `// @vitest-environment jsdom`, a `QueryClientProvider`, and `retry: false`.

Non-React code must fetch settings directly through async service getters. Do not use hooks outside React.

## 8. PocketBase Rules

### Generated Hooks

Do not edit `pocketbase/pb_hooks/main.pb.js`. Edit sources under `pocketbase/pb_hooks_src/`. After changes, run:

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

All generated PocketBase callback registrations (`routerAdd`, `routerUse`, cron, and record hooks) must go through a generator renderer that applies `withUtilities(...)`. Do not add raw callback registration templates to the generator; PocketBase's pooled Goja runtimes require every callback to contain its own helper closure.

Treat generated-hook size limits as budgets. Do not raise a size limit merely to make tests pass. Increasing a generated-hook budget requires explicit user approval and a documented explanation of the increase.

Utility bundles that reference a source file containing multiple runtime handlers must declare `entrySymbols`. Never inline an entire multi-handler source file into a callback. Broad shared bundles may contain only small leaf utilities; endpoint handlers, maintenance processors, webhook handlers, and queue processors must be included only in callbacks that invoke them.

Generated-hook size checks must cover the aggregate size of every generated `*.pb.js` file, not only `main.pb.js`, and must enforce a per-registration callback limit. Keep a checked-in growth baseline so gradual increases require an intentional budget update. Size-test failures must report the largest callbacks, the most frequently duplicated utility sources, the current size, the budget, and the size delta.

After changing `pocketbase/pb_hooks_src/` or its generator, report the total generated-hook bytes before and after, the size delta, the largest generated callback, and any utility source newly duplicated across callbacks.

Every PocketBase record request hook must explicitly continue its allowed path with `return e.next()`. Falling through a request hook can terminate the request with status `0` and make existing records appear missing. Generated request hooks require generic integrity coverage for this continuation.

For advisory hooks, wrap the full callback body in `try/catch`. Logging must be defensive.

Use `originalCopy()` with fallback:

```ts
const previous =
  e.record && typeof e.record.originalCopy === 'function'
    ? e.record.originalCopy()
    : e.originalCopy;
```

Sanitize dynamic HTML with an escaping helper.

### Scheduled Maintenance

Do not use PocketBase `cronAdd` for new scheduled work.

Instead:

1. Add a task under `pocketbase/pb_hooks_src/maintenance/` that exports a function matching the `(app, state, now) => MaintenanceTaskResult` signature.
2. Import it in `maintenanceRunner.ts`.
3. Add it to `scheduledTasks` with its interval and lock TTL.
4. Add the source file to the `maintenance` bundle in `generate-main-pb-js.ts`.

PocketHost calls:

```text
GET /api/maintenance/run?token=<secret>
```

The runner handles due intervals and locking.

### Migrations

Only JavaScript migration files belong in:

```text
pocketbase/pb_migrations/*.js
```

Every schema change needs a new forward migration. Never modify historical migrations.

Migration rules:

- Use `JSONField`, not `JsonField`.
- Do not specify custom field IDs.
- Custom base collections need `created` and `updated` `AutodateField` fields.
- Do not use reserved names such as `isSystem`.
- Configure client-needed API rules explicitly.
- Never pass `fields: [...]`, `listRule`, `viewRule`, `createRule`, `updateRule`, or `deleteRule` inside the options object passed to `new Collection({ ... })`. Goja ignores these constructor properties, setting rules to `null` (superuser-only) and skipping fields.
- Always initialize new collections with basic identifiers only (`new Collection({ id, name, type })`), then explicitly assign rules (`collection.listRule = ...`) and explicitly append fields via `collection.fields.add(...)`.
- When repairing collections affected by incomplete historical migrations, forward migrations must audit and explicitly backfill missing fields (via `collection.fields.getByName(...)` / `collection.fields.add(...)`), not just update API rules.

Do not modify hosted or production data without credentials, environment configuration, and explicit user authorization.

If a database reset occurs, tell users to log out and back in so local storage refreshes.

### SDK and Goja

Use `pb.files.getURL(...)`, not deprecated `getUrl`.

Use `pb.filter(...)` for dynamic filter values. Do not interpolate dynamic values into filter strings.

For required JSON fields, create the record first with a JSON body and non-empty placeholder value, then upload files with a separate `FormData` update.

Goja rules:

- Decode JSON database columns that appear as numeric byte arrays.
- Attach known `collectionId` and `collectionName` to raw records used for file URLs.
- Avoid sorting by `created` or `updated` in hooks unless schema support is verified.
- Parse numeric fields defensively.
- In raw SQL passed to `app.db().newQuery(...)`, use dbx named parameters such as `{:maxAttempts}`.
- In Goja, a Go `nil` pointer returned from a struct method (e.g., `collection.fields.getByName(...)`) is wrapped as a truthy JS object. Never perform simple boolean checks on returned pointers. Always verify a property on the returned object (e.g. `!existing || !existing.name`).

### Email Generation and Formatting

All automated emails and message bodies must be generated using **Markdown** rather than raw HTML.

- Do not use raw HTML tags or inline CSS (e.g., `<div style="...">`).
- Do not manually append global headers or footers (like mailing addresses).
- The background `queueProcessor` automatically runs all messages through a Markdown parser and wraps them in a unified master HTML layout (`compileMailjetHtml`). Outputting raw HTML causes layout duplication (such as double footers) and conflicts with the Markdown escaping pipeline.

### Auth and Errors

The frontend must handle 401 and 403 errors by clearing `pb.authStore` and redirecting to `/login`.

Verify `src/lib/pocketbase.ts` contains the `afterSend` stale-token interceptor. If missing, implement it before feature work.

On PocketBase 400 errors, inspect `pb_debug.log` and check for `loadAuthToken failure` before assuming validation failure.

Do not wrap or swallow PocketBase API errors. Preserve the raw object so `formatPocketBaseError(err)` can read validation details.

## 9. Network and Rate-Limit Safety

Use helpers from `src/lib/networkSafety.ts`:

```ts
chunkArray(...);
mapWithConcurrency(...);
retryOn429(...);
```

Do not use `Promise.all(items.map(...))` for network calls unless the item count is strictly bounded and small.

Prefer bulk reads, bounded chunks, and limited concurrency.

Treat HTTP `429` as a rate-limit signal. Retry with backoff and jitter, then surface a non-blocking warning.

For React retry feedback, prefer `src/hooks/useRateLimitRetryToast.ts`.

Do not include state variables in `useEffect` dependency arrays when the same effect writes to them in `.then()` or `.catch()`.

For high-traffic admin views, estimate worst-case API calls on first load.

## 10. Security and Signed Tokens

> Tokens are embedded in emails already sent to users — changing the format invalidates every outstanding link.

Signed token formats are compatibility contracts. Do not change payload strings, key order, separators, or signing behavior unless generators, verifiers, templates, parsers, and tests are updated together.

Canonical payloads:

```text
Player links:               e=<eventId>
RSVP/calendar links:        e=<eventId>&p=<profileId>
Audition links:             a=<auditionId>
Unsubscribe links:          p=<profileId>
Poll links:                 l=<pollId>&p=<profileId>
Singer calendar feeds:      p=<profileId>&c=<calendarSalt>
```

Use helpers in:

```text
pocketbase/pb_hooks_src/hmacTokens.ts
```

Sign the raw canonical payload first, append `&s=<signature>`, then encode the full token only at the outer URL boundary:

```ts
encodeURIComponent(token);
```

Do not use `URLSearchParams` for signed payload construction.

Public endpoints must reject missing secrets, malformed tokens, and signature mismatches.

Changes to signed tokens require tests, including:

```text
test/pb-hooks/hmacTokens.test.ts
```

Then run:

```bash
rtk npm run check:pb-hooks
```

Composite tokens may contain `&`. Parsers must defensively reconstruct tokens that arrive split across params such as `token`, `s`, or `p`.

## 11. Domain Rules

### Profile Email

The `profiles` collection has no native `email` field.

Frontend code must use:

```text
getProfileEmail(profile)
```

Backend code must resolve email through the related `users` record.

### Singer Eligibility

A singer is any profile with a non-empty `voicePart`.

Admins with an empty `voicePart` are administrative-only and must be excluded from singer-focused workflows.

Exclude profiles without `voicePart` from:

- Event RSVP lists and roster views.
- Attendance tracking.
- Seating chart assignments.
- Singer-targeted communications.

For the `admin` role, `voicePart` is optional. For the `singer` role, it is required.

`receiveAttendanceReports` is admin-specific, should appear only in admin-accessible UI, and defaults to `true` for new admin-linked profiles.

### On Break / Idle

The temporary inactive status is stored as `'Idle'`.

In the UI, always display it as:

```text
On Break
```

Do not change the database enum, API payloads, or CSV import value.

## 12. Plan Execution & Validation

### File Responsibility Map Validation

When executing an implementation plan (e.g. `docs/superpowers/plans/...`), you must strictly validate your progress against the **File Responsibility Map** listed at the top of the plan before declaring a phase complete.

- Verify every single file listed under "Create" or "Modify" has been handled.
- Do not stop executing tasks just because the primary visual components appear complete; ensure all secondary files, contextual empty states, and related tests explicitly assigned in the map have been fully implemented.

### Cloudflare WAF and Filters

- When querying PocketBase collections with dynamic string values that may resemble SQL (like seasons with spaces), be aware that `pb.filter` uses single quotes which can trigger Cloudflare WAF 403 Forbidden errors. To safely bypass WAF rules, construct the filter manually using double quotes, ensuring proper escaping: `\`season = "${val.replace(/"/g, '\\"')}"\``.

### Robust API Rule Structure

- When defining Admin-only API rules for collections, always prefix the role check with an explicit ID check to ensure safe evaluation (e.g., `@request.auth.id != "" && @request.auth.role = "admin"`). Do not rely solely on the role check.
- When defining API rules that traverse relation fields (e.g., `profile.user = @request.auth.id`), do not wrap the relation traversal inside parentheses combined with logical operators (e.g., `(profile.user = @request.auth.id || ...)`). The PocketBase rule parser can fail to resolve the relation field and crash the server on startup with an "invalid left operand" error. Instead, keep relation checks at the top level without parentheses (e.g., `@request.auth.role = 'admin' || profile.user = @request.auth.id`).

## 13. Performance & Algorithmic Complexity

Prevent $O(N^2)$ or worse algorithmic complexity bottlenecks, especially when rendering or sorting data in the UI.

- **Sort Comparators**: `Array.prototype.sort()` executes its comparator $O(N \log N)$ times. Never place $O(N)$ operations like `array.find()`, `array.filter()`, or `array.some()` inside a sort comparator. This degrades performance to $O(N^2 \log N)$, causing severe UI latency on large datasets.
- **Pre-computed Lookup Maps**: Before sorting or mapping over large collections where cross-referencing is required (e.g. resolving parent/child relationships, finding linked entities), pre-build an $O(1)$ `Map` or `Set` lookup table in $O(N)$ time. Pass this map into your helper functions.
- **React Renders**: Do not repeatedly construct large lookup maps inside a component's render body without memoizing them via `useMemo`.
