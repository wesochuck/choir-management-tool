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

## PocketBase JS SDK Usage

- Always use `pb.files.getURL(...)` (all-uppercase `URL`) when generating file/photo URLs from PocketBase records. Never use `pb.files.getUrl(...)` as it is deprecated in the JS SDK.
- Always use `pb.filter(...)` to parameterize and construct filter strings that include dynamic variables (e.g. IDs, names, search tokens). Never interpolate variables directly into PocketBase filter strings via template literals or string concatenation.

