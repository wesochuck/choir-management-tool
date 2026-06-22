# Refactoring Plan: Split `rsvpEndpoints.ts` → `rsvp/` directory

## Problem

Single 1095-line file with 8 inline `routerAdd()` handlers. Same issues as `checkoutEndpoints.ts` — hard to navigate, diff-prone. Additionally has ~50 lines of duplicated logic across handlers 3 and 8 (confirmation email enqueue).

## Key architectural difference from checkout

RSVP uses **inline `routerAdd()` calls** (not exported handler functions registered via `renderRoute`). The generator loads it via `buildRsvpRoutes()` which transpiles a single file and processes `// __SHARED_UTILS__` placeholders per-callback.

The split keeps the inline `routerAdd()` pattern in each file. The generator change is in `buildRsvpRoutes()` — transpile and concatenate all files, preserving the `// __SHARED_UTILS__` processing.

The `export { parsePocketBaseDate }` (line 34) is a re-export from `rsvpValidation.ts` — already included as a utility bundle. Dropped.

## New file structure

```
pocketbase/pb_hooks_src/rsvp/
  rsvpHelpers.ts              -- Shared utilities (~80 lines)
  generateRsvpTokens.ts       -- POST /api/generate-rsvp-tokens (~30 lines)
  rsvpDetails.ts              -- POST /api/rsvp-details (~170 lines)
  quickRsvp.ts                -- POST /api/quick-rsvp (~130 lines)
  unsubscribe.ts              -- POST /api/unsubscribe (~40 lines)
  bulkUpdateRsvps.ts          -- POST /api/admin/bulk-update-rsvps (~80 lines)
  bulkUpsertAttendance.ts     -- POST /api/admin/bulk-upsert-attendance (~110 lines)
  resolvePlaceholders.ts      -- POST /api/singer/resolve-placeholders (~260 lines)
  singerRsvp.ts               -- POST /api/singer/rsvp (~170 lines)
```

## `rsvpHelpers.ts` — extracted shared code

### Type `Record` generic collision warning
> [!WARNING]
> Because hook files often declare local PocketBase classes using `declare class Record implements PocketBaseRecord`, the global generic utility type `Record<K, V>` is shadowed. To prevent compiler errors (e.g. `Type 'Record' is not generic`), always define mappings/dictionaries using index signature syntax (e.g. `{ [key: string]: string }`) rather than the `Record` generic keyword.

### Token verification (used by handlers 2, 3, 4)

We define a refined token verification return interface to preserve specific error messages and HTTP status codes across the public, public quick-rsvp, and unsubscribe endpoints:

```ts
export interface VerifiedTokenResult {
  ok: boolean;
  status?: number;
  error?: string;
  data?: { [key: string]: string };
}

// Used by rsvpDetails.ts and quickRsvp.ts
function verifyEventRecipientToken(token: string): VerifiedTokenResult;

// Used by unsubscribe.ts
function verifyUnsubscribeToken(token: string): VerifiedTokenResult;
```

These helpers consolidate: `getHmacSecret` → `parseSignedToken` → `getEventRecipientPayload` (or payload string) → `hs256` → `equal`, keeping the route handlers thin while preserving functional equivalence of errors.

### Venue map builder (used by handler 2 only)

```ts
function buildVenueMap(): { [key: string]: PocketBaseRecord }
```

Fetches all venues once. Removes N+1 concern commentary from handler body.

### Confirmation email enqueue (used by handlers 3, 8 — ~47 lines each, almost identical)

```ts
function enqueueRsvpConfirmationEmail(
  eventId: string,
  profile: PocketBaseRecord
): void
```

Consolidates lines 330-377 and 1016-1062. Resolves email from profile's related user, creates email queue record, and triggers processing. Since `$app` is a global declaration in the flattened hook generator scope, we can reference it directly inside the helper.

## Each handler file pattern

```ts
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
// handler-specific imports from utility bundles (stripped at build time)

declare const $app: PocketBaseApp;
declare const $security: {
  hs256(data: string, secret: string): string;
  equal(a: string, b: string): boolean;
};
declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;
declare function routerAdd(
  method: string,
  path: string,
  handler: (e: PocketBaseRequestEvent) => unknown
): void;

routerAdd('POST', '/api/...', (e) => {
  // __SHARED_UTILS__
  // handler body...
});
```

The `declare` statements are erased at transpile time — duplicates across files are harmless.

## Generator change (`generate-main-pb-js.ts`)

Replace:

```ts
function buildRsvpRoutes(): string {
  const rsvpJs = getTranspiledFile('rsvpEndpoints.ts');
  return replaceSharedUtilityPlaceholders(rsvpJs);
}
```

With:

```ts
function buildRsvpRoutes(): string {
  const files = [
    'rsvp/rsvpHelpers.ts',
    'rsvp/generateRsvpTokens.ts',
    'rsvp/rsvpDetails.ts',
    'rsvp/quickRsvp.ts',
    'rsvp/unsubscribe.ts',
    'rsvp/bulkUpdateRsvps.ts',
    'rsvp/bulkUpsertAttendance.ts',
    'rsvp/resolvePlaceholders.ts',
    'rsvp/singerRsvp.ts',
  ];
  const rsvpJs = files.map(f => getTranspiledFile(f)).join('\n\n');
  return replaceSharedUtilityPlaceholders(rsvpJs);
}
```

`rsvpHelpers.ts` must be first (shared functions declared before consumers). The rest can be any order since all handlers use hoisted `function` declarations.

The `// __SHARED_UTILS__` placeholder in each `routerAdd()` callback survives transpilation. `replaceSharedUtilityPlaceholders` processes each placeholder independently across the concatenated output, injecting the correct utility bundles per-handler.

## Verification

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

## Risk assessment

- **Low.** No logic changes. The RSVP handlers already work independently per-callback. Splitting is purely file-level.
- Each file's `// __SHARED_UTILS__` is processed independently by the generator — this is the same mechanism that already works in the single file.
- `declare` duplication across files is erased by the transpiler — no runtime impact.
- The `export { parsePocketBaseDate }` is dropped — it was a re-export from `rsvpValidation.ts` which is already resolved via the utility bundle system.

## Steps

1. Create `pocketbase/pb_hooks_src/rsvp/` directory
2. Create `rsvpHelpers.ts` with extracted shared functions
3. Create 8 handler files, each with inline `routerAdd()` and `// __SHARED_UTILS__`
4. Delete `pocketbase/pb_hooks_src/rsvpEndpoints.ts`
5. Update `buildRsvpRoutes()` in `generate-main-pb-js.ts`
6. Run `rtk npm run generate:pb-hooks && rtk npm run check:pb-hooks`
