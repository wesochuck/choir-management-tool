# Agent Instructions

## PocketBase Hook Safety

- PocketHost/PocketBase JavaScript hook callbacks must be self-contained. Do not register `onRecordAfterCreateSuccess`, `onRecordAfterUpdateSuccess`, or other hook callbacks that call helper functions declared elsewhere in the hook file unless you have verified that exact pattern on PocketHost.
- A thrown error in an after-create/after-update hook can return HTTP 400 to the client even after the database write has already committed. If a record appears after refresh despite `Failed to create/update record`, inspect PocketHost logs for hook errors before changing frontend payloads or collection rules.
- For advisory hooks, wrap the whole registered callback body in `try/catch`. Logging must also be defensive and must not assume `e.record`, `record.id`, or related records are present.
- When changing `pb_hooks`, deploy and restart/wake the PocketHost instance, then confirm the expected hook startup log appears before testing.

## PocketBase Migration Safety

- The `pocketbase/pb_migrations` directory must ONLY contain standard JavaScript migration files (`.js`). Never place or commit utility, configuration, or declaration files (such as `types.d.ts`) in the migrations folder, as PocketBase will attempt to execute them and crash. Keep `types.d.ts` in the parent `pocketbase/` directory.
