# PocketHost deploy runbook

Operational steps for shipping a change to the hosted PocketBase backend on
PocketHost (`ftp.pockethost.io`, instance path `/choir-manager/`).

## Layout

```text
pocketbase/
  pb_hooks_src/        # TypeScript source for hooks, crons, endpoints (edited)
  pb_hooks/            # Generated main.pb.js bundle (committed; never edited)
  pb_migrations/       # Forward-only schema migrations
.github/workflows/main.yml  # FTPS deploy job, runs on push to main
```

## Why the source is split

`main.pb.js` is generated from `pb_hooks_src/` because PocketHost requires
hooks, crons, routers, and callbacks to be self-contained Goja-compatible
JavaScript. The generator inlines shared utilities per callback so the
uploaded bundle has no top-level imports. AGENTS.md §4 enforces this.

## Pre-deploy checks (run on the feature branch)

After editing any file under `pocketbase/pb_hooks_src/`:

```bash
rtk npm run generate:pb-hooks     # rebuilds pocketbase/pb_hooks/main.pb.js
rtk npm run check:pb-hooks        # re-runs generator + integrity test
rtk npx tsc -b --force            # typechecks hooks + frontend
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 pocketbase/pb_hooks_src/
rtk npx vitest run test/pb-hooks/ # hook unit + integrity tests
```

`check:pb-hooks` fails if the generator output differs from the committed
`main.pb.js`, which catches forgotten regeneration. Commit the regenerated
`main.pb.js` alongside the source change (the workflow uploads it).

## Deploy

Push to `main` triggers `.github/workflows/main.yml`:

1. `npm ci` + `npm audit --audit-level=high`
2. `npm run build` (builds the frontend into `dist/`)
3. Copies `dist/` → `deploy/pb_public/`, plus
   `pocketbase/pb_migrations/` → `deploy/pb_migrations/`,
   `pocketbase/pb_hooks/` → `deploy/pb_hooks/`
4. FTPS uploads `deploy/` to `ftp.pockethost.io:/choir-manager/`

Required GitHub Actions secrets: `POCKETHOST_USERNAME`, `POCKETHOST_PASSWORD`.

The workflow verifies `/api/hooks/health` after upload and compares the
reported source fingerprint with the generated bundle it deployed. This
prevents an old PocketBase process from making a deployment look healthy.
If the verification step reports that PocketHost did not load the expected
fingerprint, restart the instance and rerun the failed workflow. Cold-start
can be slow on free-tier PocketHost.

## Verify the new code is live

1. Open the PocketHost logs (or `pb_debug.log` if exposed) and confirm the
   expected hook startup line appears for the modified file.
2. Smoke-test the affected flow against production:
   - **Every hook deployment** — confirm the `Verify deployed PocketBase hook
     fingerprint` workflow step passed. A JSON response from an older hook
     bundle is not sufficient; the fingerprint must match.
   - **HMAC token changes** — request a known link (player link, RSVP link,
     ticket scan URL) and verify it parses via the same `parseSignedToken`
     contract. Tokens issued before the deploy were signed with whatever
     secret was active at the time, so back-compat is not automatic.
   - **Endpoint / router changes** — `curl` the path with a known payload.
   - **Cron changes** — wait for the next run, or temporarily invoke the
     cron function from a Goja console.
   - **Migrations** — check that the migration applied on the next admin UI
     load. Do not edit historical migrations; create a new one.

## HMAC_SECRET handling

`HMAC_SECRET` is read from the host environment via `$os.getenv("HMAC_SECRET")`
(see `pocketbase/pb_hooks_src/hmacTokens.ts`). After the d766f84 security fix:

- The secret is **no longer** stored in the `appSettings` collection. Existing
  rows of `appSettings` with key `HMAC_SECRET` are ignored.
- Configure the secret in the PocketHost instance environment variables
  (not in the database). The deploy workflow does not push env vars; that
  has to be set in the PocketHost dashboard.
- Tokens issued before the d766f84 deploy will fail verification after the
  deploy because the secret source changed. Coordinate the cutover if there
  are outstanding player/RSVP/calendar links in users' inboxes.

Never log `HMAC_SECRET` or a full signed token. AGENTS.md §6 enforces this.

## First-Run Experience & Setup

On fresh installations, the application runs a guided first-run wizard to claims the instance, configure essential parameters, and verify third-party integrations:

1. **Owner Claim**: The first person to visit the site creates the owner admin account. Only superusers (authorized through PocketBase `_superusers` collection) can initiate the setup wizard.
2. **Environment Configuration**: Administrators must set the following environment variables in their PocketHost dashboard:
   - `HMAC_SECRET`: For signed URL token verification.
   - `MAINTENANCE_SECRET`: For background cron worker authentication.
   - `APP_URL`: The public-facing origin URL of the app.
3. **Integration Verification**:
   - Outgoing SMTP: Functional email test required to ensure email notifications and player RSVP invites can be delivered.
   - Stripe Payments (if Ticket Sales module enabled): Validates Stripe credentials.
4. **Initial Data Import (Optional)**: Provides downloadable CSV templates for bulk importing roster performers and library music pieces with network-rate safety checks.
5. **Final Review**: Confirms the configuration and seals the setup, unlocking standard application routes.

If troubleshooting is needed or the admin account is lost during setup, run the Recovery flow by requesting a password reset email or executing the recovery logic.

## Rollback

```bash
git revert <sha>          # on a new branch
git push origin main       # triggers another deploy
```

PocketHost free-tier keeps the previous bundle in its FTPS state until the
new upload overwrites it; the revert restores the prior `pb_hooks/`. For
schema changes, write a new forward migration that undoes the change
instead of editing the historical migration.

## Local development

Most tests do not require a running PocketBase server. Hook behavior is
unit-tested with mocked `$app`, `$security`, `$os` globals. The focused
`check:pb-hooks:runtime` safeguard is the exception: it starts PocketBase
0.36.9 against a temporary data directory and shuts it down after one
guarded-route probe.

Use that runtime probe as an explicit diagnostic when changing callback
generation or investigating a PocketHost-only scope failure:

```bash
rtk env POCKETBASE_BIN=/path/to/pocketbase npm run check:pb-hooks:runtime
```

It is intentionally not part of the deployment workflow.

If you do start a local PocketBase, do **not** commit any state changes
from it. Use unit tests and mocks for hook coverage.
