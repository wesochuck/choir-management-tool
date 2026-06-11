# AGENTS.md

Mandatory instructions for AI coding agents working in this repository.

## 1. Command Rule

All shell commands must be prefixed with `rtk`.

Examples:

```bash
rtk git status
rtk npm run check:pb-hooks
rtk npm audit --audit-level=high
```

Do not run raw shell commands.

## 2. Required Checks

For non-trivial changes, run the relevant project checks before finishing.

For package or dependency changes:

```bash
rtk npm audit --audit-level=high
```

For PocketBase hook changes:

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

If a required check cannot be run, say why and describe the risk.

## 3. TypeScript Safety

Do not introduce explicit `any`.

Use `unknown`, then narrow with type guards, schemas, or helper types.

For catch blocks:

```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
}
```

Do not use:

```ts
as any
// @ts-ignore
// eslint-disable
```

unless explicitly approved by the user.

If an untyped third-party boundary is unavoidable, isolate it in a small adapter with a named type and a short comment.

## 4. Generated PocketBase Hooks

Never edit this file directly:

```text
pocketbase/pb_hooks/main.pb.js
```

Edit source files under:

```text
pocketbase/pb_hooks_src/
```

Then run:

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

Email-specific hook helpers and queue logic belong in:

```text
pocketbase/pb_hooks_src/email/
```

## 5. PocketBase Hook Safety

PocketHost requires hooks, crons, routers, and callbacks to be self-contained. Use the generator workflow so shared utilities are inlined correctly.

For advisory hooks, wrap the full callback body in `try/catch`.

Logging must be defensive. Do not assume `e.record`, `record.id`, or related records exist.

For previous record state, use:

```ts
e.record.originalCopy();
```

For compatibility:

```ts
const previous =
  e.record && typeof e.record.originalCopy === 'function'
    ? e.record.originalCopy()
    : e.originalCopy;
```

When generating HTML, sanitize dynamic text with an escaping helper such as `escapeHtml`.

## 6. PocketBase Migration Safety

The migrations directory must contain only JavaScript migration files:

```text
pocketbase/pb_migrations/*.js
```

Do not place utilities, configs, or `types.d.ts` there.

Every schema change must include a forward migration.

Never modify historical or already-executed migrations.

Use `JSONField`, not `JsonField`.

Do not specify custom field IDs. Let PocketBase generate them.

When creating custom base collections, include standard `created` and `updated` `AutodateField` fields.

Do not name fields `isSystem` or other reserved rule/system keywords.

Configure client-needed API rules explicitly. Do not leave required client operations as `null`.

## 7. Hosted PocketBase Safety

Tests must not require a local PocketBase server.

Do not start, seed, reset, or migrate a local PocketBase instance as part of `npm test`.

Use unit tests and mocks for services, hooks, frontend logic, queue logic, and endpoint behavior.

Do not modify hosted or production data unless credentials, environment configuration, and explicit user authorization are present.

## 8. PocketBase JS SDK Rules

Use:

```ts
pb.files.getURL(...)
```

Do not use deprecated `getUrl`.

Use:

```ts
pb.filter(...)
```

for dynamic filter values.

Do not interpolate dynamic values directly into PocketBase filter strings.

For records with required JSON fields, do not create them via FormData. The request body serializer may leave JSON fields blank, causing `validation_required` errors. Instead, create the record first with a JSON body, then update the file field in a separate FormData call:

```ts
// ❌ Avoid — JSON field arrives blank
const formData = new FormData();
formData.append('value', JSON.stringify({}));
await pb.collection('coll').create(formData);

// ✅ Safe — create with JSON body (non-empty value), then upload file
const record = await pb.collection('coll').create({ value: 'placeholder' });
const fd = new FormData();
fd.append('file', file);
await pb.collection('coll').update(record.id, fd);
```

For JSON `value` fields with `required: true`, use a non-empty placeholder string (e.g. `'placeholder'` or the record key). Empty objects like `{}` can be treated as blank by PocketBase's validator.

## 9. Network and Rate-Limit Safety

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

Avoid unbounded fan-out.

Do not use `Promise.all(items.map(...))` for network calls unless the item count is strictly bounded and small.

Prefer bulk reads, bounded chunks, and small concurrency limits.

Treat HTTP `429` as a rate-limit signal. Retry with backoff and jitter, then surface a non-blocking warning state.

For React retry feedback, prefer:

```text
src/hooks/useRateLimitRetryToast.ts
```

Do not include state variables in `useEffect` dependency arrays when the effect's `.then()` or `.catch()` handlers write to those same state variables. This creates a feedback loop on failure: the catch handler sets fallback state → state change re-fires the effect → more failed requests → infinite cycle. Omit the cyclical state from deps entirely — do not use a ref-based guard.

```ts
// ❌ Avoid — setRecipients on error re-triggers the effect
useEffect(() => {
  apiCall()
    .then(setData)
    .catch(() => setData([]));
}, [filters, data]); // data changes -> refire

// ✅ Safe — effect deps only include trigger values
useEffect(() => {
  apiCall()
    .then(setData)
    .catch(() => setData([]));
}, [filters]);
```

A ref-based guard (`if (hasResolved.current) return`) is **not safe** when the trigger
deps (`filters` in the example) can change after mount — the ref is never reset,
so subsequent legitimate re-resolutions are silently skipped.

For high-traffic admin views, estimate worst-case API calls on first load.

## 10. UI Dialog Rules

Use app dialogs from `useDialog()`:

```ts
dialog.confirm(...)
dialog.showMessage(...)
dialog.showToast(...)
```

Avoid:

```ts
window.alert(...)
window.confirm(...)
window.prompt(...)
```

Destructive actions must use danger-styled confirmation modals with clear labels.

Every modal must include a visible dismiss button such as `Cancel` or `Close`.

## 11. Token and HMAC Rules

Signed token formats are compatibility contracts.

Do not change payload strings, key order, separators, or signing behavior unless all generators, verifiers, templates, frontend parsers, fallback parsers, and tests are updated together.

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

Do not log `HMAC_SECRET` or full signed tokens.

Changes to signed tokens require tests, including:

```text
test/pb-hooks/hmacTokens.test.ts
```

Then run:

```bash
rtk npm run check:pb-hooks
```

## 12. URL Token Parsing

Composite tokens may contain `&`.

When constructing URLs, encode the full token:

```ts
encodeURIComponent(token);
```

When parsing tokens, defensively handle cases where an unencoded token was split into params such as `token`, `s`, or `p`, and reconstruct the intended token before API calls.

## 13. PocketBase Goja Rules

Goja may expose JSON database columns as numeric byte arrays.

Decode before parsing or serializing:

```ts
function decodeGoBytes(val: unknown): string {
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
    return val.map((b) => String.fromCharCode(Number(b))).join('');
  }

  return typeof val === 'string' ? val : '';
}
```

For custom endpoints that return records used for file URLs, explicitly attach known `collectionId` and `collectionName`.

Do not rely on dynamic `p.collectionId` or `p.collectionName` from raw Goja records.

Avoid sorting by `created` or `updated` inside Goja hooks/endpoints unless the schema is verified. Prefer indexed fields or empty sort `""`.

Parse numeric fields defensively:

```ts
const rawAttempts = record.get('attempts');
const attempts = typeof rawAttempts === 'number' ? rawAttempts : 0;
const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
```

In raw SQL passed to `app.db().newQuery(...)`, use dbx named parameter syntax:

```sql
{:maxAttempts}
```

Do not use:

```sql
:maxAttempts
```

## 14. Lazy Loading

For new route modules or lazy-loaded views, use `lazyWithReload(...)` from:

```text
src/App.tsx
```

Do not use plain React `lazy(...)` for new route modules.

## 15. Profile Email Rule

The `profiles` collection does not contain a native `email` field.

Backend code must resolve the related `users` record through the profile `user` relation.

Frontend code must use:

```ts
getProfileEmail(profile);
```

from:

```text
src/services/profileService.ts
```

Do not read `profile.email` or `profile.get('email')`.

## 16. Styling Rules

Do not use hardcoded inline styles for layout, spacing, colors, margins, sizing, typography, or micro-adjustments in React components.

Use Tailwind utility classes in `className` props. This is the project's primary styling convention.

Do not create standalone component CSS files for styles that can be expressed with Tailwind utilities. Standalone CSS is acceptable only for complex animations, print styles, or selectors that Tailwind cannot express.

Inline styles are allowed only for truly dynamic values, such as drag position, animation values, or canvas calculations.

When using this exception, add:

```tsx
// @allow-inline-style - explanation
```

## 17. Before Finishing

Before final response:

1. Confirm generated files were not edited directly.
2. Confirm relevant tests/checks were run with `rtk`.
3. Confirm no unsafe TypeScript patterns were introduced.
4. Confirm schema changes have forward migrations.
5. Summarize changes, verification, and remaining risks.
