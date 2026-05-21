# Choir Management Tool - Project Instructions

These foundational mandates MUST be followed by all agents working on this codebase to ensure technical integrity and prevent recurring infrastructure issues.

## Pocketbase version
* Always assume verison 0.36.9 is currently installed 

## PocketBase & Data Integrity
*   **Stable Migrations:** Always use explicit collection IDs (pattern: `pbc_name_001`) in JavaScript migrations. Never rely on automatically generated IDs or name-based resolution alone, as these can drift during development resets.
*   **No Stray Files in pb_migrations:** The `pocketbase/pb_migrations` directory must ONLY contain standard JavaScript migration files (`.js`). Never place or commit utility, configuration, or declaration files (such as `types.d.ts`) in the migrations folder, as PocketBase will attempt to execute them and crash. Keep `types.d.ts` in the parent `pocketbase/` directory.
*   **Correct Field Class Names:** In JavaScript migrations, always use correct SDK class names. Specifically, use all-uppercase `JSONField` (not `JsonField`) to define or append JSON fields in collection schemas to prevent ReferenceErrors at startup.
*   **Schema First:** Every database change MUST be captured in a migration file immediately. Do not manually edit the database schema via the PocketBase UI without a corresponding migration.
*   **Mandatory Verification:** After any local database reset (`rm pb_data` on a local instance only) or migration update, if a local server is running, the agent MUST run a diagnostic CURL cycle (Create/Read/Delete) using a fresh superuser token to verify permissions and field presence. Do not attempt this on the hosted/remote instance unless credentials are explicitly available.
*   **Hook Callback Isolation:** PocketHost may execute JavaScript hook callbacks in a context where helper functions declared elsewhere in the same hook file are not resolvable. Keep `onRecordAfterCreateSuccess`, `onRecordAfterUpdateSuccess`, and similar registered callbacks self-contained, or verify the exact helper pattern on PocketHost before deploying.
*   **Post-Commit Hook Failures:** An after-create/after-update hook can throw after the database write has committed, causing a client-visible HTTP 400 even though the record exists after refresh. On this symptom, inspect PocketHost logs for hook errors before changing frontend payloads, collection rules, or schema.
*   **Defensive Advisory Hooks:** Any advisory hook must wrap the entire registered callback body in `try/catch`. Its logging must also be defensive and must not assume `e.record`, `record.id`, or related records are present.
*   **File URL Retrieval:** Always use `pb.files.getURL(...)` (all-uppercase `URL`) when generating file/photo URLs from PocketBase records. Never use `pb.files.getUrl(...)` as it is deprecated in the JS SDK.
*   **Secure Filter Strings:** Always use `pb.filter(...)` to construct and parameterize any PocketBase filters containing dynamic values/variables (such as record IDs or user inputs). Never interpolate variables directly using string concatenation or template literals.
*   **Goja VM JSON Column []byte Serialization Safety:** PocketBase Goja JS VM handles JSON database columns as raw Go `[]byte` (represented in Javascript hooks as a numerical `[]uint8` array of character codes) rather than strings or standard JS objects.
    *   *The Failure Mode:* Running `JSON.stringify` or raw conversion directly on a byte slice in Goja produces a JSON array of the character numbers (e.g. `[91, 123, ...]` instead of `"[{\"id\"..."`). This structural mismatch causes client-side parse errors or blank outputs.
    *   *The Safe Pattern (Backend):* In `pb_hooks/`, always decode the raw bytes using a string conversion helper (e.g. `String.fromCharCode`) or cast appropriately before standard parsing or returning in custom HTTP endpoints.
    *   *The Safe Pattern (Frontend):* In `src/services/` (e.g. `playerService.ts`), defensively decode raw numerical arrays into standard UTF-8 strings before attempting to `JSON.parse` or assign standard objects. Refer to `decodeGoBytes` and `parseJsonField` helpers.
*   **Static Collection Metadata for Asset URLs:** When returning raw records or custom JSON payloads from custom backend endpoints (`routerAdd`), do not rely on JS VM dynamic mapping of `p.collectionId` or `p.collectionName` as they may evaluate to `null` or throw errors. Instead, return the known collection ID (e.g., `"pbc_music_library_001"`) and collection name (e.g., `"musicLibrary"`) explicitly so client-side `pb.files.getURL(...)` can construct correct URLs.

## Hosted PocketBase Workflow
*   **Required:** Add the corresponding migration script for database changes.
*   **Required:** Run all project tests, linters, and typechecks (`npm run test`, `npm run lint`).
*   **Not Required during unit tests:** Spawning a local PocketBase server. Unit tests run offline or mock PocketBase interactions.
*   **Hosted Verification:** Only perform live database resets or administrative CURL cycles when superuser credentials and environment configuration are explicitly provided/available in the workspace. Never attempt to reset or modify a remote/hosted database directly.

## Token & URL Parameter Safety (Ampersand Issue Prevention)
*   **Query Parameter Encoding:** When constructing sharing URLs or passing composite tokens via query parameters (e.g., for RSVP or Player links), ALWAYS use `encodeURIComponent(token)` to prevent the browser or HTTP clients from truncating or splitting tokens containing ampersands (`&`).
*   **Defensive Parsing Fallback:** When parsing composite tokens from URL parameters, always check if the token was split by unencoded ampersands (e.g., retrieving `token` and secondary params like `s` or `p` separately) and dynamically reconstruct the original token structure (e.g. `token = `${token}&s=${sParam}``) before making API requests.


## Authentication & Session Management
*   **Stale Token Resilience:** The frontend MUST handle 401 and 403 errors by automatically clearing the `pb.authStore` and redirecting to `/login`. This prevents the "stale token loop" caused by local database resets.
*   **Development Hygiene:** Whenever a database reset occurs, the agent MUST explicitly instruct the user to logout and re-login on the frontend to refresh the browser's local storage.

## Architecture & Code Style
*   **Modular Layers:** Maintain strict separation between:
    *   `src/services/`: Pure PocketBase API calls.
    *   `src/hooks/`: State coordination and business logic.
    *   `src/components/`: Pure presentational "dumb" components.
*   **Type Safety:** Use shared TypeScript interfaces for all PocketBase records to ensure consistency between the backend schema and frontend state.
*   **No Explicit `any`:** Do not introduce explicit `any` in TypeScript or TSX files. Use `unknown` first, then narrow with type guards, schema validation, or local helper types.
*   **Safe Error Handling:** Type `catch` block errors as `unknown` and normalize them safely, for example: `const message = err instanceof Error ? err.message : String(err)`.
*   **No Type Suppression:** Do not silence type errors with `as any`, `// @ts-ignore`, `// eslint-disable`, or broad assertions unless the user explicitly approves it.
*   **Typed Boundaries:** If a third-party API forces an untyped boundary, isolate it in a small adapter with a named type and a short comment explaining the boundary.
*   **Verification:** Before finishing TypeScript work, run `npm run lint` or the relevant typecheck command and fix all `@typescript-eslint/no-explicit-any` violations introduced by the change.

## Recurring Failure Prevention (MANDATORY)
*   **Infrastructure Audit:** Every new agent MUST verify that `src/lib/pocketbase.ts` contains the `afterSend` interceptor for stale token resilience. If missing, implement it immediately before proceeding with any feature work.
*   **Log Inspection:** On any "Failed to create/update record" error (HTTP 400), the agent MUST inspect `pb_debug.log` and check for `loadAuthToken failure`. Do NOT assume data validation errors until the server-side authentication load is confirmed successful.
*   **Verification Cycle:** If the agent modifies migrations locally, they MUST perform a `curl` auth cycle as defined in "PocketBase & Data Integrity" to ensure the schema matches expectations (if a local instance is running). Do not attempt on hosted/remote instances without credentials.
*   **PocketHost Hook Verification:** If the agent modifies `pb_hooks`, they MUST deploy and restart/wake the PocketHost instance, then confirm the expected hook startup log appears before testing behavior.
