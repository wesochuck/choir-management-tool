# Choir Management Tool - Project Instructions

## MANDATORY COMMAND PROXY (RTK)

- **All shell commands (git, npm, pnpm, eslint, tsc, vitest, vitest run, etc.) MUST be prefixed with `rtk`** (e.g., `rtk git status`, `rtk npm run check:pb-hooks`, `rtk grep`).
- Running raw commands without `rtk` is strictly prohibited as it bypasses token optimization. Always prefix with `rtk`.

These foundational mandates MUST be followed by all agents working on this codebase to ensure technical integrity and prevent recurring infrastructure issues.

## Administrative vs. Singer Account Handling

- **Singing Signal:** The presence of a non-empty `voicePart` is the primary signal that a profile should be treated as a "singer" in operational contexts.
- **Role-Based Distinction:** Accounts with the `admin` role are for system management. An administrator MAY also be a singer.
- **Administrator Nuance:**
  - **Singing Admin:** An admin with a `voicePart` assigned. They MUST be included in all singer-focused contexts.
  - **Administrative Only:** An admin with an empty `voicePart`. They MUST be excluded from singer-focused contexts.
- **Voice Part Optionality:** For the `admin` role, the `voicePart` field is optional. For the `singer` role, it is required.
- **Singer-Focused Exclusion:** Profiles with an empty `voicePart` MUST be excluded from singer-facing operational contexts, including:
  - Event RSVP lists and Roster views.
  - Attendance tracking interfaces.
  - Seating chart assignments and auto-paint logic.
  - Singer-targeted automated communications (RSVP requests, reminders).
- **Admin-Only Preferences:** The `receiveAttendanceReports` field is an admin-specific preference. It should only be exposed in UIs accessible to administrators and defaults to `true` for new admin-linked profiles.
- **Data Integrity:** When implementing new singer-focused features, always use a "profile has voice part" filter to determine eligibility rather than just checking the role.

## Pocketbase version

- Always assume verison 0.36.9 is currently installed

## PocketBase & Data Integrity

- **Stable Migrations:** Always use explicit collection IDs (pattern: `pbc_name_001`) in JavaScript migrations. Never rely on automatically generated IDs or name-based resolution alone, as these can drift during development resets.
- **No Stray Files in pb_migrations:** The `pocketbase/pb_migrations` directory must ONLY contain standard JavaScript migration files (`.js`). Never place or commit utility, configuration, or declaration files (such as `types.d.ts`) in the migrations folder, as PocketBase will attempt to execute them and crash. Keep `types.d.ts` in the parent `pocketbase/` directory.
- **Correct Field Class Names:** In JavaScript migrations, always use correct SDK class names. Specifically, use all-uppercase `JSONField` (not `JsonField`) to define or append JSON fields in collection schemas to prevent ReferenceErrors at startup.
- **No Custom Field IDs:** Never specify custom field IDs (`id` property in field builders like `new TextField({ name: 'x', id: 'my_id' })`) in programmatic migrations. PocketBase field IDs must be exactly 10 alphanumeric characters (`^[a-z0-9]+$`). Providing custom IDs that are longer or contain underscores will cause field parsing/validation to silently or explicitly fail. Omit `id` to let PocketBase auto-generate them.
- **No Reserved Rule Keywords for Fields:** Never name a collection field `isSystem` or other reserved rule system keywords. The PocketBase expression rule parser intercepts `isSystem` as a system property/method, causing rule evaluation (e.g. `deleteRule: "isSystem = false"`) to throw "invalid left operand 'isSystem' - unknown field 'isSystem'". Use a distinct name like `isSystemTemplate` or `isDefaultPreset`.
- **Schema First:** Every database change MUST be captured in a migration file immediately. Do not manually edit the database schema via the PocketBase UI without a corresponding migration.
- **Mandatory Verification:** After any local database reset (`rm pb_data` on a local instance only) or migration update, if a local server is running, the agent MUST run a diagnostic CURL cycle (Create/Read/Delete) using a fresh superuser token to verify permissions and field presence. Do not attempt this on the hosted/remote instance unless credentials are explicitly available.
- **Hook Callback Isolation:** PocketHost may execute JavaScript hook callbacks in a context where helper functions declared elsewhere in the same hook file are not resolvable. Keep `onRecordAfterCreateSuccess`, `onRecordAfterUpdateSuccess`, and similar registered callbacks self-contained, or verify the exact helper pattern on PocketHost before deploying.
- **Post-Commit Hook Failures:** An after-create/after-update hook can throw after the database write has committed, causing a client-visible HTTP 400 even though the record exists after refresh. On this symptom, inspect PocketHost logs for hook errors before changing frontend payloads, collection rules, or schema.
- **Defensive Advisory Hooks:** Any advisory hook must wrap the entire registered callback body in `try/catch`. Its logging must also be defensive and must not assume `e.record`, `record.id`, or related records are present.
- **Accessing Previous Record State in Hooks:** In PocketBase JS hooks (v0.22+ JS VM), always use `e.record.originalCopy()` to access the previous state of a record during an update event. Do NOT use `e.originalCopy`, as it is undefined and will silently fail validation checks. If you need a safe fallback for cross-version compatibility, use: `(e.record && typeof e.record.originalCopy === 'function') ? e.record.originalCopy() : e.originalCopy`.
- **File URL Retrieval:** Always use `pb.files.getURL(...)` (all-uppercase `URL`) when generating file/photo URLs from PocketBase records. Never use `pb.files.getUrl(...)` as it is deprecated in the JS SDK.
- **Secure Filter Strings:** Always use `pb.filter(...)` to construct and parameterize any PocketBase filters containing dynamic values/variables (such as record IDs or user inputs). Never interpolate variables directly using string concatenation or template literals.
- **Goja VM JSON Column []byte Serialization Safety:** PocketBase Goja JS VM handles JSON database columns as raw Go `[]byte` (represented in Javascript hooks as a numerical `[]uint8` array of character codes) rather than strings or standard JS objects.
  - _The Failure Mode:_ Running `JSON.stringify` or raw conversion directly on a byte slice in Goja produces a JSON array of the character numbers (e.g. `[91, 123, ...]` instead of `"[{\"id\"..."`). This structural mismatch causes client-side parse errors or blank outputs.
  - _The Safe Pattern (Backend):_ In `pb_hooks/`, always decode the raw bytes using a string conversion helper (e.g. `String.fromCharCode`) or cast appropriately before standard parsing or returning in custom HTTP endpoints.
  - _The Safe Pattern (Frontend):_ In `src/services/` (e.g. `playerService.ts`), defensively decode raw numerical arrays into standard UTF-8 strings before attempting to `JSON.parse` or assign standard objects. Refer to `decodeGoBytes` and `parseJsonField` helpers.
- **Static Collection Metadata for Asset URLs:** When returning raw records or custom JSON payloads from custom backend endpoints (`routerAdd`), do not rely on JS VM dynamic mapping of `p.collectionId` or `p.collectionName` as they may evaluate to `null` or throw errors. Instead, return the known collection ID (e.g., `"pbc_music_library_001"`) and collection name (e.g., `"musicLibrary"`) explicitly so client-side `pb.files.getURL(...)` can construct correct URLs.
- **Goja VM Sorting Restrictions:** Sorting collections inside custom endpoints or registered hooks (Goja VM) by system fields (like `created` or `updated`) directly via `findRecordsByFilter` can be rejected by PocketBase's parser with an `invalid sort field` Go error. Instead, sort by primary indexed fields or pass an empty sort string `""` to let SQLite naturally fall back to row insertion order (oldest first).
- **Database Migration Immutability:** Never modify historical or already-executed database migrations in the `pocketbase/pb_migrations/` directory once checked into version control. Doing so causes schema drift across developer environments and hosted instances. Always apply schema modifications, relaxed constraints, or field updates via sequential forward migrations (`.js`).
- **Defensive Numeric & attempts Safe-Parsing:** Deferring or relaxing constraints on numeric fields (like `attempts`) can lead to null, undefined, or empty values inside hook callbacks. Using arithmetic operations directly on these values causes `NaN` evaluations that break retry limits. Always parse numeric fields defensively:
  ```typescript
  const rawAttempts = record.get('attempts');
  const attempts = typeof rawAttempts === 'number' ? rawAttempts : 0;
  const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
  ```
- **Profile Email Retrieval:** The `profiles` collection does not have a native `email` field. All user emails reside in the linked `users` collection. Never attempt to read `profile.email` or `profile.get("email")` directly on a profile record. On the backend, fetch the related user record via the `user` relation field first. On the frontend, always use the `getProfileEmail(profile)` helper from `profileService` or read from the expanded relation `profile.expand?.user?.email`.
- **Source-Generated Hooks:** The production `pocketbase/pb_hooks/main.pb.js` file is **SOURCE-GENERATED**. Never edit this file directly. Instead, modify the TypeScript source files in `pocketbase/pb_hooks_src/` and run `npm run generate:pb-hooks`.
- **Self-Contained Requirement:** PocketHost requires backend callbacks (hooks, crons, routers) to be self-contained. The generator handles this automatically by inlining all shared utilities into every individual callback closure. This prevents `ReferenceError` issues at runtime.
- **Verification Workflow:** After modifying backend logic:
  1.  Edit the relevant TypeScript source file in `pocketbase/pb_hooks_src/` (`pocketbase/pb_hooks_src/email/` is for email-specific helpers and queue logic).
  2.  Run `npm run generate:pb-hooks`.
  3.  Run `npm run check:pb-hooks` to verify integrity and pass unit tests.
- **Sanitization:** When generating HTML bodies (e.g., for emails), always sanitize dynamic text data by passing it through an HTML escaping function (like the `escapeHtml` utility) before injecting it into the HTML string.
- **Always include/autorepair timestamp fields for custom base collections:** When creating collections programmatically with `new Collection(...)`, explicitly include or immediately add standard `AutodateField` fields named `created` (`onCreate: true`, `onUpdate: false`) and `updated` (`onCreate: true`, `onUpdate: true`) before UI code sorts by those fields. If a deployed collection may already exist without those fields, add a sequential forward migration that creates the missing fields and backfills existing records with a safe timestamp.
- **Goja VM Named Query Parameter Placeholder Syntax (`{:param}`):** Using SQL-native colon parameters (such as `:maxAttempts` or `:runId`) inside raw queries passed to `app.db().newQuery(...)` throws a Goja `missing named argument` exception, because PocketBase's underlying `dbx` Go package expects named variables to use the brace parameter format. Always format named query parameters using curly braces (e.g. `{:maxAttempts}`, `{:runId}`) inside raw SQL queries before binding values.

## Hosted PocketBase Workflow

- **Required:** Add a corresponding JavaScript migration script in `pocketbase/pb_migrations/` for any database schema changes. This ensures the hosted/remote PocketBase environment can be updated through the project's normal deployment process.
- **Prohibited during tests:** Never require a local PocketBase server to be running for unit or integration tests. Do not attempt to start, seed, reset, or migrate a local PocketBase instance as part of the `npm test` workflow.
- **Hosted Verification:** Administrative actions like diagnostic CURL cycles or database resets should only be performed when superuser credentials and environment configuration are explicitly provided in the workspace. Never attempt to modify the remote/hosted production database directly without authorization.
- **Testing Strategy:** Use pure unit tests and mocks for services and React hooks. Validate logic in isolation rather than depending on a live database connection.

## Token & URL Parameter Safety (Ampersand Issue Prevention)

- **Query Parameter Encoding:** When constructing sharing URLs or passing composite tokens via query parameters (e.g., for RSVP or Player links), ALWAYS use `encodeURIComponent(token)` to prevent the browser or HTTP clients from truncating or splitting tokens containing ampersands (`&`).
- **Defensive Parsing Fallback:** When parsing composite tokens from URL parameters, always check if the token was split by unencoded ampersands (e.g., retrieving `token` and secondary params like `s` or `p` separately) and dynamically reconstruct the original token structure (e.g. `token = `${token}&s=${sParam}``) before making API requests.

## Signed Token & HMAC Stability

- **Signed token formats are compatibility contracts:** Existing HMAC payload strings and key order must remain stable: player links sign `e=<eventId>`, RSVP/calendar event-recipient links sign `e=<eventId>&p=<profileId>`, audition links sign `a=<auditionId>`, unsubscribe links sign `p=<profileId>`, poll links sign `l=<pollId>&p=<profileId>`, and singer calendar feed links sign `p=<profileId>&c=<calendarSalt>`.
- **Use canonical helpers for shared formats:** Prefer payload/generator helpers in `pocketbase/pb_hooks_src/hmacTokens.ts` when adding or verifying signed links. If a new token shape is needed, add a named payload helper and unit coverage before using it in endpoints, email rendering, or frontend services.
- **Sign the exact unencoded payload:** Generate signatures over the canonical raw payload string, then append `&s=<signature>`, then URL-encode the whole token only at the outer URL boundary with `encodeURIComponent(token)`. Do not reorder keys, serialize with `URLSearchParams`, encode individual payload fields before signing, or change separators unless all generators, verifiers, templates, frontend fallback parsing, and tests are updated together.
- **Verify defensively and fail closed:** Public endpoints must reject missing `HMAC_SECRET`, malformed tokens, and signature mismatches. Use constant-time comparison (`$security.equal(...)`) where available, and avoid adding logs that expose `HMAC_SECRET` or full signed tokens.
- **Regression coverage required:** Changes to signed token generation, parsing, or public token routes should update `test/pb-hooks/hmacTokens.test.ts` and relevant endpoint/placeholder tests, then run `npm run check:pb-hooks` plus the frontend tests that cover generated links.

## Authentication & Session Management

- **Stale Token Resilience:** The frontend MUST handle 401 and 403 errors by automatically clearing the `pb.authStore` and redirecting to `/login`. This prevents the "stale token loop" caused by local database resets.
- **Development Hygiene:** Whenever a database reset occurs, the agent MUST explicitly instruct the user to logout and re-login on the frontend to refresh the browser's local storage.

## Architecture & Code Style

- **Modular Layers:** Maintain strict separation between:
  - `src/services/`: Pure PocketBase API calls.
  - `src/hooks/`: State coordination and business logic.
  - `src/components/`: Pure presentational "dumb" components.
- **Settings-Driven Logic (Voice Parts & Sections):** NEVER hardcode voice part labels (e.g., `'S1'`, `'A2'`) or section names in components, hooks, or utilities.
  - _Frontend:_ Always use the `useVoiceParts` hook to retrieve the current choir configuration.
  - _UX (Dropdowns):_ For required voice part selections (e.g., Singer Roster), use a placeholder option (e.g., `"-- Please Select Voice Part --"`) with an empty value (`""`) and mark the field as required.
  - _Auditions:_ Explicitly allow an "unknown" or "Not sure" state (empty value `""`) for audition requests to handle unclassified singers.
  - _Services/Backend:_ Use `settingsService.getVoicePartsAndSections()` to resolve defaults or validate inputs.
  - _Defaulting (Conversion):_ During conversion (e.g., Audition to Singer), allow the voice part to remain empty if not yet determined, rather than forcing a default from settings.
- **Type Safety:** Use shared TypeScript interfaces for all PocketBase records to ensure consistency between the backend schema and frontend state.
- **No Explicit `any`:** Do not introduce explicit `any` in TypeScript or TSX files. Use `unknown` first, then narrow with type guards, schema validation, or local helper types.
- **Safe Error Handling:** Type `catch` block errors as `unknown` and normalize them safely, for example: `const message = err instanceof Error ? err.message : String(err)`.
- **No Type Suppression:** Do not silence type errors with `as any`, `// @ts-ignore`, `// eslint-disable`, or broad assertions unless the user explicitly approves it.
- **Typed Boundaries:** If a third-party API forces an untyped boundary, isolate it in a small adapter with a named type and a short comment explaining the boundary.
- **Verification:** Before finishing TypeScript work, run `npm run lint` or the relevant typecheck command and fix all `@typescript-eslint/no-explicit-any` violations introduced by the change.
- **Stale Asset Chunk Resilience (Lazy Loading):** When adding new route modules or lazy-loaded views, ALWAYS wrap the lazy-loading import statement using the `lazyWithReload(...)` helper defined in `src/App.tsx` instead of standard `lazy(...)`. This guarantees that if a redeployment deletes old hashed script assets, the application can recover automatically with a single session-cooldowned reload.
- **No Hardcoded Inline Styles:** Do not use hardcoded inline styles (`style={{ ... }}`) for layout, sizing, or micro-adjustments in React components. Use Tailwind utility classes in `className` props — this is the project's primary styling convention. Do not create standalone component CSS files for styles that can be expressed with Tailwind utilities; standalone CSS is acceptable only for complex animations, print styles, or selectors that Tailwind cannot express. Truly dynamic values (like drag coordinates or variable offsets) are permitted only if annotated with `// @allow-inline-style - [explanation]`.

## API Load & Rate-Limit Safety

- **Use Shared Helper First:** Prefer shared utilities in `src/lib/networkSafety.ts` before writing bespoke retry/throttling code:
  - `chunkArray(...)` for bounded query chunks
  - `mapWithConcurrency(...)` for capped in-flight request counts
  - `retryOn429(...)` for exponential backoff + jitter on rate-limited reads
- **Retry Feedback in Interactive Views:** When using `retryOn429(...)` in admin/user-facing flows, provide non-blocking UI feedback via `onRetry` (for example, a toast like “Rate-limited, retrying...”) so users understand transient loading delays.
- **Use the Retry Toast Hook in React:** For React screens, prefer `useRateLimitRetryToast(...)` from `src/hooks/useRateLimitRetryToast.ts` instead of hand-rolled retry toast refs/callbacks.
- **Stable Retry Callbacks:** Do not let retry feedback callbacks become dependencies that retrigger the data fetch; keep them stable with `useCallback` or store them in a ref inside reusable hooks.
- **No Unbounded Fan-Out:** Never fire one API request per item in a large list without batching or a concurrency cap. Avoid `Promise.all(items.map(...))` for network calls unless the item count is strictly bounded and small.
- **Bulk Reads First:** Prefer bulk/aggregated reads over per-record probes (for example, fetch statuses for many event IDs in one query, then map results locally).
- **PocketBase Batch for Multi-Write UI Actions:** When one user action creates, updates, or deletes many PocketBase records of the same general workflow, consider `pb.createBatch()` before adding per-record requests. Batch writes should usually live in a service helper, use bounded chunks (commonly 50 records per batch), and return parsed batch result bodies when callers need created/updated records.
- **Batch vs Custom Endpoint:** Use client-side PocketBase batch for straightforward same-collection or simple multi-collection write sets where PocketBase's batch transaction semantics are enough. Prefer a custom `pb.send(...)` backend endpoint when the operation needs authorization-sensitive business rules, upsert/merge logic, cross-record validation, server-only data, or richer partial-failure reporting.
- **Chunk Dynamic Filters:** When building OR filters for many IDs, chunk into bounded groups (for example 20-50 IDs per query) to avoid oversized URLs and parser strain.
- **Cap Concurrency:** If multiple requests are still required, use a small concurrency limit (default 3-5 in-flight requests), not full parallel fan-out.
- **Handle 429 Explicitly:** For read paths, treat HTTP `429` as a rate-limit signal: retry with backoff and jitter a limited number of times, then surface a non-blocking warning state in UI.
- **Load Only What UI Needs:** Prefer `perPage=1` existence checks only when truly singular; otherwise query once for a set and derive booleans client-side.
- **Reduce Duplicate Fetches:** Cache or memoize repeated status lookups by stable keys (e.g., eventId + type) during a page session to prevent repeated mount/refetch storms.
- **Protect High-Traffic Views:** For admin dashboards/pages that aggregate many events/messages, explicitly review request count in code review and include a short note estimating worst-case API calls on first load.

## UI Dialog Consistency

- **Prefer App Modals Over Browser Dialogs:** In React/admin UI flows, use `useDialog()` (`dialog.confirm`, `dialog.showMessage`, `dialog.showToast`) instead of native `window.alert`, `window.confirm`, or `window.prompt`.
- **Destructive Actions:** Deletes/resets/revocations must use a danger-styled confirmation modal with clear action labels (for example `confirmLabel: 'Delete'`, `variant: 'danger'`).
- **Modal Exit Action Required:** Every modal must include a visible dismiss action button (`Cancel`, `Close`, or equivalent) in the footer/actions area; ESC key should be supported but do not rely on ESC key or backdrop click as the only exit path.
- **Allowed Exception:** Native browser dialogs are acceptable only in narrowly scoped, temporary fallback flows where the shared dialog context is not available; prefer migrating these to `useDialog` when touched.

## UI Empty State Actions

- **Empty State Action Buttons:** When rendering empty states (e.g., "No items found" or "No season bundles configured"), always include a call-to-action button (preceded by a `+` symbol for creation/addition actions, e.g., `+ Create New Bundle`) directly within the empty state container. This provides a clear, immediate action path for the user instead of requiring them to search for primary buttons in the header or toolbar.

## Recurring Failure Prevention (MANDATORY)

- **Infrastructure Audit:** Every new agent MUST verify that `src/lib/pocketbase.ts` contains the `afterSend` interceptor for stale token resilience. If missing, implement it immediately before proceeding with any feature work.
- **Log Inspection:** On any "Failed to create/update record" error (HTTP 400), the agent MUST inspect `pb_debug.log` and check for `loadAuthToken failure`. Do NOT assume data validation errors until the server-side authentication load is confirmed successful.
- **Verification Cycle:** If the agent modifies migrations locally, they MUST perform a `curl` auth cycle as defined in "PocketBase & Data Integrity" to ensure the schema matches expectations (if a local instance is running). Do not attempt on hosted/remote instances without credentials.
- **Security Audit:** Every non-trivial change MUST be verified with `rtk npm audit --audit-level=high` to ensure no high-severity vulnerabilities are introduced. This check is also enforced in the CI/CD pipeline.
- **PocketHost Hook Verification:** If the agent modifies `pb_hooks`, they MUST deploy and restart/wake the PocketHost instance, then confirm the expected hook startup log appears before testing behavior.
