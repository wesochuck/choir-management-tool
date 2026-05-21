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

- PocketHost/PocketBase JavaScript hook callbacks must be self-contained. Do not register `onRecordAfterCreateSuccess`, `onRecordAfterUpdateSuccess`, or other hook callbacks that call helper functions declared elsewhere in the hook file unless you have verified that exact pattern on PocketHost.
- A thrown error in an after-create/after-update hook can return HTTP 400 to the client even after the database write has already committed. If a record appears after refresh despite `Failed to create/update record`, inspect PocketHost logs for hook errors before changing frontend payloads or collection rules.
- For advisory hooks, wrap the whole registered callback body in `try/catch`. Logging must also be defensive and must not assume `e.record`, `record.id`, or related records are present.
- When changing `pb_hooks`, deploy and restart/wake the PocketHost instance, then confirm the expected hook startup log appears before testing.

## PocketBase Migration Safety

- The `pocketbase/pb_migrations` directory must ONLY contain standard JavaScript migration files (`.js`). Never place or commit utility, configuration, or declaration files (such as `types.d.ts`) in the migrations folder, as PocketBase will attempt to execute them and crash. Keep `types.d.ts` in the parent `pocketbase/` directory.
- Always use correct SDK class names in JavaScript migrations. Specifically, use all-uppercase `JSONField` (not `JsonField`) when defining or appending JSON fields in collection schemas, otherwise PocketBase will throw a ReferenceError at startup.

## Hosted PocketBase Workflow

- **Required:** Add the corresponding migration script for database changes.
- **Required:** Run all project tests, linters, and typechecks (`npm run test`, `npm run lint`).
- **Not Required during unit tests:** Spawning a local PocketBase server. Unit tests run offline or mock PocketBase interactions.
- **Hosted Verification:** Only perform live database resets or administrative CURL cycles when superuser credentials and environment configuration are explicitly provided/available in the workspace. Never attempt to reset or modify a remote/hosted database directly.

## PocketBase JS SDK Usage

- Always use `pb.files.getURL(...)` (all-uppercase `URL`) when generating file/photo URLs from PocketBase records. Never use `pb.files.getUrl(...)` as it is deprecated in the JS SDK.
- Always use `pb.filter(...)` to parameterize and construct filter strings that include dynamic variables (e.g. IDs, names, search tokens). Never interpolate variables directly into PocketBase filter strings via template literals or string concatenation.

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


