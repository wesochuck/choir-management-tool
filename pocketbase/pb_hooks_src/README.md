# PocketBase Backend Hook Sources

This directory contains the pure TypeScript source code for the PocketBase backend hooks.

## Workflow

**NEVER edit `pocketbase/pb_hooks/main.pb.js` directly.** It is a source-generated file designed for PocketHost safety.

1.  **Edit**: Modify the files in this directory (`pocketbase/pb_hooks_src/email/*.ts`).
2.  **Generate**: Run `npm run generate:pb-hooks` to update the production hook file.
3.  **Verify**: Run `npm run check:pb-hooks` to ensure the output is correct and pass integrity tests.

## Why this exists

PocketHost requires backend callbacks (hooks, crons, routers) to be **self-contained**. To avoid massive manual code duplication while keeping the code maintainable and testable, we use a generator that inlines all shared helpers into every individual callback closure.

## Structure

- `email/`: Shared utilities for text, JSON, rendering, and dispatch logic.
- `maintenance/`: Scheduled maintenance tasks (dispatched via `POST /api/maintenance/run`).
- `generate-main-pb-js.ts`: The deterministic generator script.
- `templates/`: (Optional) snippets for the hook file structure.

## Scheduled maintenance

PocketHost calls `POST /api/maintenance/run` on a schedule (recommended: every 5 minutes).

Do not add new PocketBase cron jobs for scheduled maintenance. Add a
maintenance task under `pocketbase/pb_hooks_src/maintenance/` and register
it in `runMaintenance(...)`.

Authentication: `MAINTENANCE_SECRET` env var (mirrors `HMAC_SECRET`).
Admin users are also authorized.

`pocketbase/pb_hooks/main.pb.js` is generated. Do not edit it directly.
