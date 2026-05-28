# Agent Instructions

## TypeScript Type Safety

- Do not introduce explicit `any` in TypeScript or TSX files.
- When a value is unknown, use `unknown` first, then narrow it with type guards, schema validation, or local helper types.
- For `catch` blocks, type errors as `unknown` and normalize them safely, for example:

  ```ts
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
  }
  ```

- Do not silence type errors with `as any`, `// @ts-ignore`, `// eslint-disable`, or broad assertions unless the user explicitly approves it.
- Before finishing TypeScript work, run the project's lint/typecheck command and fix all `@typescript-eslint/no-explicit-any` violations introduced by the change.
- If a third-party API forces an untyped boundary, isolate it in a small adapter with a named type and a short comment explaining the boundary.

## PocketBase Hook Safety

- **Source-Generated Hooks**: The production `pocketbase/pb_hooks/main.pb.js` file is **SOURCE-GENERATED**. Never edit this file directly. Instead, modify the TypeScript source files in `pocketbase/pb_hooks_src/` and run `npm run generate:pb-hooks`.
- **Self-Contained Requirement**: PocketHost requires backend callbacks (hooks, crons, routers) to be self-contained. The generator handles this automatically by inlining all shared utilities into every individual callback closure. This prevents `ReferenceError` issues at runtime.
- **Verification Workflow**: After modifying backend logic:
    1.  Edit files in `pocketbase/pb_hooks_src/email/`.
    2.  Run `npm run generate:pb-hooks`.
    3.  Run `npm run check:pb-hooks` to verify integrity and pass unit tests.
- **Defensive Hooks**: For advisory hooks, always wrap the whole registered callback body in `try/catch`. Logging must also be defensive and must not assume `e.record`, `record.id`, or related records are present.
- **Sanitization**: When generating HTML bodies (e.g., for emails), always sanitize dynamic text data by passing it through an HTML escaping function (like the `escapeHtml` utility) before injecting it into the HTML string.

## PocketBase Migration Safety

- The `pocketbase/pb_migrations` directory must ONLY contain standard JavaScript migration files (`.js`). Never place or commit utility, configuration, or declaration files (such as `types.d.ts`) in the migrations folder, as PocketBase will attempt to execute them and crash. Keep `types.d.ts` in the parent `pocketbase/` directory.
- Always use correct SDK class names in JavaScript migrations. Specifically, use all-uppercase `JSONField` (not `JsonField`) when defining or appending JSON fields in collection schemas, otherwise PocketBase will throw a ReferenceError at startup.
- **Never specify custom field IDs** (`id` property in field builders like `new TextField({ name: 'x', id: 'my_id' })`) in programmatic JavaScript migrations. PocketBase field IDs must be exactly 10 alphanumeric characters (`^[a-z0-9]+$`). Providing custom IDs that are longer or contain underscores will cause field parsing/validation to silently or explicitly fail. Omit `id` to let PocketBase auto-generate them.
- **Never name a collection field `isSystem` or other reserved rule system keywords**. The PocketBase expression rule parser intercepts `isSystem` as a system property/method, causing rule evaluation (e.g. `deleteRule: "isSystem = false"`) to throw "invalid left operand 'isSystem' - unknown field 'isSystem'". Use a distinct name like `isSystemTemplate` or `isDefaultPreset`.

## Hosted PocketBase Workflow

- **Required:** Add a corresponding JavaScript migration script in `pocketbase/pb_migrations/` for any database schema changes. This ensures the hosted/remote PocketBase environment can be updated through the project's normal deployment process.
- **Prohibited during tests:** Never require a local PocketBase server to be running for unit or integration tests. Do not attempt to start, seed, reset, or migrate a local PocketBase instance as part of the `npm test` workflow.
- **Hosted Verification:** Administrative actions like diagnostic CURL cycles or database resets should only be performed when superuser credentials and environment configuration are explicitly provided in the workspace. Never attempt to modify the remote/hosted production database directly without authorization.
- **Testing Strategy:** Use pure unit tests and mocks for services and React hooks. Validate logic in isolation rather than depending on a live database connection.

## PocketBase JS SDK Usage

- Always use `pb.files.getURL(...)` (all-uppercase `URL`) when generating file/photo URLs from PocketBase records. Never use `pb.files.getUrl(...)` as it is deprecated in the JS SDK.
- Always use `pb.filter(...)` to parameterize and construct filter strings that include dynamic variables (e.g. IDs, names, search tokens). Never interpolate variables directly into PocketBase filter strings via template literals or string concatenation.

## API Load & Rate-Limit Safety

- **No Unbounded Fan-Out:** Never fire one API request per item in a large list without batching or a concurrency cap. Avoid `Promise.all(items.map(...))` for network calls unless the item count is strictly bounded and small.
- **Batch First:** Prefer bulk/aggregated reads over per-record probes (for example, fetch statuses for many event IDs in one query, then map results locally).
- **Chunk Dynamic Filters:** When building OR filters for many IDs, chunk into bounded groups (for example 20-50 IDs per query) to avoid oversized URLs and parser strain.
- **Cap Concurrency:** If multiple requests are still required, use a small concurrency limit (default 3-5 in-flight requests), not full parallel fan-out.
- **Handle 429 Explicitly:** For read paths, treat HTTP `429` as a rate-limit signal: retry with backoff and jitter a limited number of times, then surface a non-blocking warning state in UI.
- **Load Only What UI Needs:** Prefer `perPage=1` existence checks only when truly singular; otherwise query once for a set and derive booleans client-side.
- **Reduce Duplicate Fetches:** Cache or memoize repeated status lookups by stable keys (e.g., eventId + type) during a page session to prevent repeated mount/refetch storms.
- **Protect High-Traffic Views:** For admin dashboards/pages that aggregate many events/messages, explicitly review request count in code review and include a short note estimating worst-case API calls on first load.

## Token & URL Parameter Safety (Ampersand Issue Prevention)

- **Query Parameter Encoding:** When constructing URLs with composite tokens (such as RSVP or Player tokens containing `&`), always use `encodeURIComponent(token)` to prevent query parameter splitting/truncation.
- **Defensive Parsing Fallback:** When parsing composite tokens from URL parameters, always check if the token was split by unencoded ampersands (e.g., retrieving `token` and secondary params like `s` or `p` separately) and dynamically reconstruct the original token structure (e.g. `token = `${token}&s=${sParam}``) before making API calls.

## PocketBase JS VM (Goja) JSON Field & File URL Safety

- **Goja VM JSON Column []byte Serialization Bug:** PocketBase Goja JS VM handles JSON database columns as raw Go `[]byte` (represented in Javascript hooks as a numerical `[]uint8` array of character codes) rather than strings or standard JS objects.
  - *The Failure Mode:* Running `JSON.stringify` or raw conversion directly on a byte slice in Goja produces a JSON array of the character numbers (e.g. `[91, 123, 34...]` instead of `"[{\"id\"..."`). This structural mismatch causes client-side parse errors or blank outputs.
  - *The Safe Pattern (Backend):* In `pb_hooks/`, always decode the raw bytes using a string conversion helper (e.g. `String.fromCharCode`) or cast appropriately before standard parsing or returning in custom HTTP endpoints.
  - *The Safe Pattern (Frontend):* In `src/services/` (e.g. `playerService.ts`), defensively decode raw numerical arrays into standard UTF-8 strings before attempting to `JSON.parse` or assign standard objects.
  - *The Safe Helper:* Use a robust parser like:
    ```typescript
    function decodeGoBytes(val: unknown): string {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
        return val.map(b => String.fromCharCode(Number(b))).join('');
      }
      return typeof val === 'string' ? val : '';
    }
    ```

- **Dynamic collectionId Resolution inside Custom Endpoints:** Do not rely on dynamic evaluation of collection properties like `p.collectionId` or `p.collectionName` on raw records returned inside custom router additions (`routerAdd`), as Goja record wrappers or raw DB rows can lose these properties or evaluate to `null`.
  - *The Failure Mode:* Generating asset URLs on the client via `pb.files.getURL(record, filename)` will fail or construct invalid paths (e.g. `https://.../api/files/undefined/filename`) if `collectionId`/`collectionName` are missing or `undefined` in the serialized payload.
  - *The Safe Pattern:* Explicitly attach the known, hardcoded Collection ID (e.g. `"pbc_music_library_001"`) and Collection Name (e.g. `"musicLibrary"`) to the JSON output returned by custom endpoints, and ensure they are populated in the frontend model interface to guarantee correct absolute/relative URL construction.

- **Token & URL Parameter Safety (Ampersand Prevention & Fallback):**
  - *Encoding:* When generating links with composite tokens (such as RSVP or Player tokens containing `&`), always use `encodeURIComponent(token)`.
  - *Fallback Decoding:* When parsing from URL parameters on the frontend, check if the browser split the token by unencoded ampersands (e.g., retrieving `token` and secondary params like `s` or `p` separately) and dynamically reconstruct the original token structure (e.g. `token = `${token}&s=${sParam}``) before making API calls. Refer to [PublicPlayerView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/PublicPlayerView.tsx) and [PublicRsvpView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/PublicRsvpView.tsx).

- **PocketBase Goja VM Sorting Restrictions:**
  - *The Failure Mode:* Sorting collections inside custom endpoints or registered hooks (Goja VM) by system fields (like `created` or `updated`) directly via `findRecordsByFilter` can be rejected by PocketBase's parser with an `invalid sort field` Go error.
  - *The Safe Pattern:* Avoid sorting by `created` or `updated` system fields. Instead, sort by primary indexed fields or pass an empty sort string `""` to let SQLite naturally fall back to row insertion order (oldest first).

- **PocketBase Migration Immutability:**
  - *The Safe Pattern:* Never modify historical or already-executed database migrations in the `pocketbase/pb_migrations/` directory once checked into source control. Always apply schema modifications, relaxed constraints, or field updates via sequential forward migrations (`.js`) to prevent environment schema drifts.

- **Defensive Numeric & attempts Safe-Parsing:**
  - *The Failure Mode:* Deferring or relaxing constraints on numeric fields (like `attempts`) can lead to null, undefined, or empty values inside hook callbacks. Using arithmetic operations directly on these values causes `NaN` evaluations that break retry limits.
  - *The Safe Pattern:* Always parse numeric fields defensively:
    ```typescript
    const rawAttempts = record.get("attempts");
    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
    ```
