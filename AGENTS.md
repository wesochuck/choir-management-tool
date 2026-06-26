# AGENTS.md

Mandatory instructions for AI coding agents working in this repository.

## 1. Non-Negotiable Rules

- Prefix every shell command with `rtk`. Do not run raw shell commands.
- For non-trivial changes, run the relevant project checks before finishing. If a check cannot be run, explain why and describe the risk.
- Do not introduce explicit `any`. Use `unknown` and narrow with type guards, schemas, or helper types.
- Do not use `as any`, `// @ts-ignore`, or `// eslint-disable` unless explicitly approved by the user.
- Never edit generated files directly, especially `pocketbase/pb_hooks/main.pb.js`.
- Never modify historical or already-executed migrations.
- Do not modify hosted or production data unless credentials, environment configuration, and explicit user authorization are present.
- Do not log secrets, `HMAC_SECRET`, or full signed tokens.
- Avoid unbounded network fan-out.
- **Prefer Shoelace (`@shoelace-style/shoelace`) wrappers under `src/components/ui/` over custom HTML/fallback solutions.** These components are already integrated, tested, and consistent with the app's design system. Building custom fallbacks (plain `<button>`, raw file inputs, hand-rolled clipboard buttons, etc.) duplicates effort and introduces visual/behavioral inconsistencies. If a Shoelace wrapper exists, use it. If no wrapper exists, create one following the existing patterns (`safeSlProps`, test mode duality, variant mapping) rather than dropping to raw HTML.

## 2. Commands and Verification

Use the standard command wrapper for all shell commands:

```bash
rtk git status
rtk npm test
rtk npm audit --audit-level=high
```

Run checks that match the change:

- Package or dependency changes: `rtk npm audit --audit-level=high`
- PocketBase hook changes:
  ```bash
  rtk npm run generate:pb-hooks
  rtk npm run check:pb-hooks
  ```
- Single Vitest file: `rtk npx vitest run path/to/file.test.ts`
- ESLint: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0` (do not use `rtk npx eslint` — `rtk` misidentifies it as a Python tool)

Every non-trivial change must include a final verification summary covering checks run, skipped checks, risks, and any follow-up needed.

## 3. TypeScript, Testing, and Styling

### TypeScript safety

Use `unknown` at untyped boundaries and narrow before use:

```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
}
```

If an untyped third-party boundary is unavoidable, isolate it in a small adapter with a named type and a short comment.

### React Imports

This project uses the modern JSX transform (React 17+). **Do not use `import React from 'react';` just to use JSX.**
If you include a React import that is not used for runtime hooks (like `useState`), TypeScript's strict `noUnusedLocals` rule will throw `error TS6133` in CI.
If you only need React for types (e.g., `React.ReactNode` or `React.Dispatch`), use a type-only import: `import type React from 'react';` to prevent CI failures.

### Vitest conventions

Tests run through Vitest using a compatibility layer mapped to `node:test` imports.

Use:

```ts
import { describe, it, test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
```

Do not import directly from `vitest`.

Use the wrapper's `mock` API:

- `const fn = mock.fn(impl);`
- `const spy = mock.method(obj, 'methodName', impl);`
- `fn.mock.mockImplementation(newImpl);`
- `fn.mock.resetCalls();`
- `assert.strictEqual(fn.mock.callCount(), 1);`
- `assert.deepStrictEqual(fn.mock.calls[0].arguments, ['arg1']);`

Default tests run in the Node environment. The `dom` Vitest project (jsdom) includes:

- `src/components/ui/**/*.test.{ts,tsx}`
- `src/components/admin/**/*.test.{ts,tsx}`
- `src/hooks/**/*.test.{ts,tsx}`
- `test/views/**/*.test.{ts,tsx}`
- `test/**/*.test.tsx`
- A handful of legacy `test/*.test.ts` files force-included by name (`test/eventCardSetList.test.ts`, `test/useVoiceParts.test.ts`, `test/attendanceRsvpSync.test.ts`, `test/eventRosterTable.test.ts`)

Test files outside those globs default to the `node` environment. To use jsdom in a new file outside the globs, start the file with:

```ts
// @vitest-environment jsdom
```

DOM tests that call `render(...)` from `@testing-library/react` MUST unmount between tests. The default `@testing-library/react` auto-cleanup is off in this project's Vitest setup, so add `afterEach(cleanup)` explicitly:

```ts
// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';

describe('MyComponent', () => {
  afterEach(() => {
    cleanup();
  });
  // ...
});
```

Symptom of skipping this: the file's first two tests pass, then the worker dies with "Worker exited unexpectedly" or hangs past the timeout, because rendered DOM accumulates across tests. `renderHook` (no DOM) does not need this. The pattern is used in `test/CommunicationTabs.test.tsx`, `src/components/ui/Button/Button.test.ts`, and most `src/components/ui/**` and `test/views/**` component tests.

### Styling and dialogs

Use Tailwind utility classes for layout, spacing, colors, sizing, typography, and micro-adjustments. Do not add standalone component CSS unless Tailwind cannot express the requirement, such as complex animations or print styles.

Inline styles are allowed only for truly dynamic values such as drag position, animation values, or canvas calculations. Mark each exception with a JSX comment:

```tsx
{
  /* @allow-inline-style - explanation */
}
```

Use `{/* */}` syntax, not `//`. A `//` comment inside JSX renders as visible text in the DOM (see `PhotoUploader.tsx:717` for a real fix). The `{/* */}` JSX comment is stripped at build time and never reaches the browser.

Use app dialogs from `useDialog()`:

```ts
dialog.confirm(...)
dialog.showMessage(...)
dialog.showToast(...)
```

Avoid `window.alert`, `window.confirm`, and `window.prompt`. Destructive actions must use danger-styled confirmation modals with clear labels. Every modal must include a visible dismiss button such as `Cancel` or `Close`.

### UI empty states

Empty states in dashboards or lists must include a call-to-action button inside the empty state container. Creation/addition actions should begin with `+`, such as `+ Create New Bundle`.

### Lazy loading

For new route modules or lazy-loaded views, use `lazyWithReload(...)` from `src/App.tsx`. Do not use plain React `lazy(...)` for new route modules.

### Shoelace and Web Components

This codebase uses Shoelace (`@shoelace-style/shoelace`) — Lit-based Web Components — wrapped by React adapters under `src/components/ui/`.

**Do not import raw Shoelace components directly.** Always use the wrapper from `src/components/ui/`:

**Every Shoelace wrapper MUST use `safeSlProps` from `src/components/ui/shared.ts`** to strip `undefined` values from the props object before spreading it onto a Shoelace component. Shoelace crashes internally in its render lifecycle when receiving `undefined` for props it may iterate over (class lists, part suffixes, option children). The pattern:

```tsx
import { safeSlProps } from '../shared';

// Always wrap Sl* component props:
<SlComponent
  ref={slRef}
  {...safeSlProps({
    prop1: value, // stripped if undefined
    className: className, // stripped if undefined
    // ...rest spread goes inside safeSlProps, not outside
    ...(consumerRest as Record<string, unknown>),
  } as Record<string, unknown>)}
/>;
```

Never spread `{...rest}` directly onto a Shoelace component — rest values may be `undefined`.

```tsx
// correct
import { Button } from './components/ui/Button/Button';

// wrong
import SlButton from '@shoelace-style/shoelace/dist/react/button/index.js';
```

**How the `Button` wrapper works (the canonical pattern):**

`src/components/ui/Button/Button.tsx` has three code paths:

- **Test mode** (`process.env.NODE_ENV === 'test'`): renders a plain `<button>` or `<Component>` with Tailwind classes. Shoelace is completely bypassed.
- **`as={Link}` or any non-button element**: renders the requested component with Tailwind classes. No Shoelace.
- **Production button** (`Component === 'button'`): renders `<SlButton>` from Shoelace.

When creating new Shoelace-wrapped components, follow this same test-vs-production duality so tests work in jsdom without Web Component registration.

**Gotchas:**

- **Shoelace errors are NOT caught by React Error Boundaries.** Shoelace renders inside its own Shadow DOM. A crash like `Cannot read properties of undefined (reading 'length')` at `zs.render` is a Shoelace internal error — the root cause is almost always a prop the React wrapper passed as `undefined` or `null` that Shoelace expected to be iterable. Check the wrapper's prop mapping, not Shoelace's internals.

- **Shoelace variant names differ from the app's conventions.** `SlButton` expects `'primary' | 'neutral' | 'danger'`, not `'secondary'`. The wrapper handles this mapping (`slVariant` at `Button.tsx:71`). New wrappers must map their own values.

- **jsdom does not fully support Custom Elements or Shadow DOM.** Components using Shoelace directly can't render correctly in tests. Always test through the React wrapper or gate Shoelace rendering behind `process.env.NODE_ENV === 'test'`.

- **Do not pass `undefined` or `null` children to Shoelace components.** Shoelace may iterate over `this.children` internally. An empty string or fragment is safer.

- **Shoelace `SlButton` drops the `form` attribute.** The React adapter does not forward `form="some-id"` to the inner `<button>`. Never rely on `type="submit" form="..."` on a Shoelace `<Button>` when the button sits outside the `<form>` (e.g., inside a `Modal` footer).

- **Do not use `requestSubmit()` as a workaround.** `document.getElementById('id')?.requestSubmit()` is fragile — it can silently fail because Shoelace form validation runs inside Shadow DOM and validation errors may not propagate correctly across the boundary. The correct pattern is to call the component's submit handler directly from the button's `onClick`. Make the handler's event parameter optional so it works from both contexts:

  ```tsx
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    // ... save logic
  };

  // In the form (Enter key still works):
  <form onSubmit={handleSubmit}>...</form>

  // In the Modal footer (button outside <form>):
  <Button onClick={() => handleSubmit()}>Save</Button>
  ```

- **Shoelace `SlButton` props pass through React first, then Lit's lifecycle.** React sets the attribute/property, then Lit's `updated()` runs. Timing issues can cause double renders. Use the wrapper's `className` / `variant` / `size` props rather than raw Shoelace attributes.

### Data Display

- Use `DataTable` from `src/components/ui/DataTable` for all tabular data displays.
  The component uses `@tanstack/react-table` internally for sort, selection,
  pagination, and column visibility state. Our wrapper provides the UI and
  mobile card layout.
- `cardSection: 0 | 1` + `cardSide: 'left' | 'right'` control automatic mobile
  card layout. These are optional — columns without them are hidden on mobile.
  - Section 0: `justify-between` row (name + badge pattern)
  - Section 1: left-stack / right-stack with separator
- Selection, sort, and pagination are opt-in features.
- `renderMobileCard` is the escape hatch for complex mobile rows (e.g., RosterTable).
  When provided, `cardSection`/`cardSide` on columns are ignored and the custom
  renderer takes over.
- `renderRow` is the ultimate escape hatch — replaces the entire row (desktop +
  mobile). Use sparingly.
- `getRowClassName` provides per-row Tailwind classes (e.g., striping, dimming).
- Sorting uses `enableSorting` on the column definition. For client-side sort,
  TanStack handles it automatically. For server-side sort, pass `manualSorting`
  and `onSortingChange`. Use `defaultSorting` to set initial sort state.
- Pagination is inline (prev / page buttons / next). Use `hidePagination` to
  suppress it (e.g., small datasets). The `Pagination` component in
  `src/components/common/Pagination.tsx` is still used by legacy views.
- Use `getRowId` prop when row IDs should match data identities (e.g., `profile.id`)
  instead of row index, especially when using `enableSelection` with external state.
- `onSelectionChange` receives a `Set<string>`, not an array.
- `useReactTable()` triggers a benign `react-hooks/incompatible-library` lint
  warning from React Compiler. This is a known TanStack Table limitation and
  does not indicate a bug.

### TanStack Query

This codebase uses TanStack Query v5 (`@tanstack/react-query`) for server state. Migration progress and the basic `useQuery` / `useMutation` pattern live in `docs/tanstack-query-migration.md`. The points below are non-obvious gotchas observed during hook migrations.

- **Shared query keys live in `src/lib/queryKeys.ts`.** Do not inline ad-hoc key arrays at call sites.

- **Do not blindly sync query data to local state via `useEffect`.** If a query has a `staleTime` and triggers a background refetch, the `useEffect` will fire and overwrite any unsaved user input (draft wiping). If local state must be initialized from a query, use a `useRef` to gate initialization so it only happens once per mount or explicit transition (e.g. modal open), or use a form library's `defaultValues`.

- **`useMutation`'s returned object is not referentially stable across renders.** Only the underlying observer methods (`mutate`, `mutateAsync`) are stable, but TanStack re-spreads its result object every render (see `node_modules/@tanstack/react-query/build/modern/useMutation.js:40`). Depending on `.mutateAsync` in a `useCallback` / `useEffect` dep array triggers `react-hooks/exhaustive-deps` warnings the lint rule cannot see through. Per the no-`eslint-disable` rule, **include the whole mutation object in deps**:

  ```ts
  // correct
  const createThing = useCallback(async () => {
    await thingMutation.mutateAsync(...);
  }, [thingMutation]);

  // wrong — triggers exhaustive-deps warning
  }, [thingMutation.mutateAsync]);
  ```

  The per-render `useCallback` recomputation cost is negligible compared to introducing warnings or ref-juggling boilerplate.

- **`refresh` helpers must return the invalidation Promise.** When migrating from a manual `async fetchData()` to TanStack Query, the equivalent `refresh` must return `queryClient.invalidateQueries(...)`'s Promise so existing `await refresh()` call sites still wait for the refetch:

  ```ts
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.foo.list() }),
    [queryClient]
  );
  ```

  Returning `Promise<void>` lets consumers `await refresh()` after a mutation to read consistent data. A non-returning `refresh` is a silent behavioral regression — `await undefined` resolves immediately.

- **Do not `void serviceFn(...)` inside an effect when a `useMutation` for the same call already exists.** Bypassing the mutation pipeline loses `isPending`, error propagation, and lifecycle tracking. Use `mutation.mutateAsync(...)` and guard repeat invocations with a ref keyed on the relevant inputs:

  ```ts
  const didAutoCreateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldCreate) return;
    const guardKey = `${a}::${b}`;
    if (didAutoCreateRef.current === guardKey) return;
    didAutoCreateRef.current = guardKey;

    thingMutation
      .mutateAsync(payload)
      .then(() => refresh())
      .catch(() => {
        didAutoCreateRef.current = null;
      });
  }, [shouldCreate, a, b, refresh, thingMutation]);
  ```

- **Do not add `onError: (err) => setError(err.message)` to a mutation that is also driven by a debounced or context-aware pipeline.** The unconditional `onError` fires even for stale-context responses and overwrites the careful error handling inside the pipeline. Keep error handling at the call site (try/catch around `mutateAsync`) for user-triggered actions, and inside the pipeline for debounced flows.

- **Hook tests need `// @vitest-environment jsdom` and a `QueryClientProvider` wrapper.** Use `retry: false` on both `queries` and `mutations`. The canonical pattern is `test/useVenuesQuery.test.tsx`; the in-place pattern is `src/hooks/useEventRosterData.test.ts`.

### Decorative icons and emoji in buttons/links

When a button or link includes a decorative emoji/icon plus visible label text, render the icon separately and hide it from assistive technology.

Preferred pattern:

```tsx
<Button>
  <span aria-hidden="true">🏠</span>
  <span>Home</span>
</Button>
```

For button-like links:

```tsx
<Button as={Link} to="/dashboard">
  <span aria-hidden="true">🏠</span>
  <span>Home</span>
</Button>
```

Emoji must be placed directly between JSX tags — do not wrap in quote characters:

```tsx
// correct
<span aria-hidden="true">⬆️</span>

// incorrect
<span aria-hidden="true">'⬆️'</span>
```

Avoid collapsing decorative icons into a single text node:

```tsx
// avoid
<Button>🏠 Home</Button>

// also avoid
'⬆️' Choose File
```

When the shared `Button` `icon` prop is used, the component automatically wraps the icon with `aria-hidden="true"`. For icon-only buttons, provide an `aria-label`.

## 4. PocketBase Rules

The hosted PocketBase server is on `0.36.9`. The JS SDK in `package.json` is still `^0.26.9` (no SDK upgrade has been done). Assume server = `0.36.9` and client SDK = `0.26.9` — they are not in lockstep. Verify the API you want is available on the SDK version actually installed before relying on it, and confirm the server-side feature exists before calling it from a hook.

### Generated hooks

Do not edit:

```text
pocketbase/pb_hooks/main.pb.js
```

Edit source files under:

```text
pocketbase/pb_hooks_src/
```

Email-specific hook helpers and queue logic belong in:

```text
pocketbase/pb_hooks_src/email/
```

After hook source changes, run:

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

PocketHost requires hooks, crons, routers, and callbacks to be self-contained. Use the generator workflow so shared utilities are inlined correctly.

### Scheduled maintenance (replaces PocketBase `cronAdd`)

PocketHost's `cronAdd` is unreliable due to instance hibernation. **Do not use `cronAdd` for new scheduled work.** Instead:

1. Create a task file under `pocketbase/pb_hooks_src/maintenance/` that exports a function matching the `(app, state, now) => MaintenanceTaskResult` signature.
2. Import it in `maintenanceRunner.ts` and add it to the `scheduledTasks` array with its due interval and lock TTL.
3. Add the source file to the `maintenance` bundle in `generate-main-pb-js.ts`.

PocketHost calls `GET /api/maintenance/run?token=<secret>` every 5 minutes. The runner executes the email queue on every invocation, then runs each scheduled task only when due (with a TTL lock to prevent overlap).

For advisory hooks, wrap the full callback body in `try/catch`. Logging must be defensive; do not assume `e.record`, `record.id`, or related records exist.

Use `e.record.originalCopy()` for previous record state, with compatibility fallback when needed:

```ts
const previous =
  e.record && typeof e.record.originalCopy === 'function'
    ? e.record.originalCopy()
    : e.originalCopy;
```

When generating HTML, sanitize dynamic text with an escaping helper such as `escapeHtml`.

### Migrations

The migrations directory must contain only JavaScript migration files:

```text
pocketbase/pb_migrations/*.js
```

Do not place utilities, configs, or `types.d.ts` there.

Every schema change must include a forward migration. Never modify historical or already-executed migrations.

Migration rules:

- Use `JSONField`, not `JsonField`.
- Do not specify custom field IDs; let PocketBase generate them.
- Custom base collections must include standard `created` and `updated` `AutodateField` fields.
- Do not name fields `isSystem` or other reserved rule/system keywords.
- Configure client-needed API rules explicitly. Do not leave required client operations as `null`.

If migrations are modified locally and a local instance is running, perform a `curl` auth cycle to verify the schema. Do not attempt this on hosted or remote instances without credentials and explicit authorization.

### Hosted data and tests

Tests must not require a local PocketBase server. Do not start, seed, reset, or migrate a local PocketBase instance as part of `npm test`.

Use unit tests and mocks for services, hooks, frontend logic, queue logic, and endpoint behavior.

Do not modify hosted or production data unless credentials, environment configuration, and explicit user authorization are present.

If a database reset occurs, explicitly instruct the user to log out and log back in on the frontend to refresh browser local storage.

### PocketBase JS SDK

Use `pb.files.getURL(...)`; do not use deprecated `getUrl`.

Use `pb.filter(...)` for dynamic filter values. Do not interpolate dynamic values directly into PocketBase filter strings.

For records with required JSON fields, do not create them via `FormData`. Create the record first with a JSON body using a non-empty placeholder value, then upload the file in a separate `FormData` update. Empty objects like `{}` can be treated as blank by PocketBase's validator.

### Goja compatibility

Goja may expose JSON database columns as numeric byte arrays. Decode before parsing or serializing.

For custom endpoints that return records used for file URLs, explicitly attach known `collectionId` and `collectionName`. Do not rely on dynamic `p.collectionId` or `p.collectionName` from raw Goja records.

Avoid sorting by `created` or `updated` inside Goja hooks/endpoints unless the schema is verified. Prefer indexed fields or empty sort `""`.

Parse numeric fields defensively.

In raw SQL passed to `app.db().newQuery(...)`, use dbx named parameter syntax:

```sql
{:maxAttempts}
```

Do not use `:maxAttempts`.

### Auth and session resilience

The frontend must handle 401 and 403 errors by automatically clearing `pb.authStore` and redirecting to `/login`. This prevents stale-token loops after local database resets.

Every new agent must verify that `src/lib/pocketbase.ts` contains the `afterSend` interceptor for stale token resilience. If it is missing, implement it before proceeding with feature work.

On any `Failed to create/update record` error with HTTP 400, inspect `pb_debug.log` and check for `loadAuthToken failure` before assuming a data validation error.

If `pb_hooks` are modified, deploy and restart/wake the PocketHost instance, then confirm the expected hook startup log appears before testing behavior.

## 5. Network and Rate-Limit Safety

Prefer helpers from:

```text
src/lib/networkSafety.ts
```

Use:

```ts
chunkArray(...)
mapWithConcurrency(...)
retryOn429(...)
```

Do not use `Promise.all(items.map(...))` for network calls unless the item count is strictly bounded and small.

Prefer bulk reads, bounded chunks, and small concurrency limits. Treat HTTP `429` as a rate-limit signal. Retry with backoff and jitter, then surface a non-blocking warning state.

For React retry feedback, prefer:

```text
src/hooks/useRateLimitRetryToast.ts
```

Do not include state variables in `useEffect` dependency arrays when that effect's `.then()` or `.catch()` handlers write to those same variables. This can create failure loops. Omit cyclical state from deps entirely; do not use a ref-based guard, because trigger deps may change after mount.

For high-traffic admin views, estimate worst-case API calls on first load.

## 6. Token, URL, and Security Contracts

Signed token formats are compatibility contracts. Do not change payload strings, key order, separators, or signing behavior unless all generators, verifiers, templates, frontend parsers, fallback parsers, and tests are updated together.

Canonical payloads:

```text
Player links:                  e=<eventId>
RSVP/calendar recipient links: e=<eventId>&p=<profileId>
Audition links:                a=<auditionId>
Unsubscribe links:             p=<profileId>
Poll links:                    l=<pollId>&p=<profileId>
Singer calendar feed links:    p=<profileId>&c=<calendarSalt>
```

Prefer helpers in:

```text
pocketbase/pb_hooks_src/hmacTokens.ts
```

Sign the raw canonical payload first, append `&s=<signature>`, then encode the full token only at the outer URL boundary with:

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

Composite tokens may contain `&`. When parsing tokens, defensively handle cases where an unencoded token was split into params such as `token`, `s`, or `p`, and reconstruct the intended token before API calls.

## 7. Domain Rules

### Profile email

The `profiles` collection does not contain a native `email` field.

Backend code must resolve the related `users` record through the profile `user` relation.

Frontend code must use `getProfileEmail(profile)` from:

```text
src/services/profileService.ts
```

Do not read `profile.email` or `profile.get('email')`.

### Singer eligibility and admin nuance

A non-empty `voicePart` is the primary signal that a profile should be treated as a singer in operational contexts.

Accounts with the `admin` role are for system management. An administrator may also be a singer if they have a `voicePart` assigned. An admin with an empty `voicePart` is administrative-only and must be excluded from singer-focused contexts.

For the `admin` role, `voicePart` is optional. For the `singer` role, it is required.

Profiles with an empty `voicePart` must be excluded from singer-facing operational contexts, including:

- Event RSVP lists and roster views.
- Attendance tracking interfaces.
- Seating chart assignments and auto-paint logic.
- Singer-targeted automated communications such as RSVP requests and reminders.

`receiveAttendanceReports` is an admin-specific preference. It should only be exposed in administrator-accessible UIs and defaults to `true` for new admin-linked profiles.

When implementing singer-focused features, use a "profile has voice part" filter rather than checking role alone.

## 8. Before Finishing

Before the final response, confirm and summarize:

- What changed.
- Which checks were run with `rtk`.
- Which checks could not be run and why.
- Whether generated files were avoided or regenerated correctly.
- Whether unsafe TypeScript patterns were avoided.
- Whether schema changes include forward migrations.
- Any remaining risks or follow-up needed.
