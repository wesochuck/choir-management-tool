# External Integrations

**Analysis Date:** 2026-05-26

## APIs & External Services

**Maps & Location:**
- Google Maps - Generating interactive venue location maps via URL encoding
  - SDK/Client: Direct URL construction (`https://www.google.com/maps/search/?api=1&query=...`)
  - Auth: None (public search API)

**Calendar:**
- ICS Calendar Export - Custom endpoints (`/api/calendar/download`) that output standard `.ics` formatting for event and audition schedules to be consumed by external client calendars.
  - SDK/Client: Raw text formatting in Goja VM
  - Auth: HMAC SHA-256 signed tokens

**Email Layouts:**
- Mailjet - Generates layout format templates via `mailjetRenderer.ts`. *Note: Mailjet API is not used for sending, only the rendering layout structure is mimicked for responsive HTML.*

## Data Storage

**Databases:**
- PocketBase (SQLite) - Primary database managing users, roster, events, music library, and attendance.
  - Connection: Embedded local database / Hosted via PocketHost
  - Client: `pocketbase` JS SDK (`^0.26.9` in `package.json`, production treats as `0.36.9`)
- IndexedDB (Frontend) - Client-side browser storage managing offline playlists and audio caching.
  - Client: Native Web API (`src/services/offlineMediaStore.ts`)

**File Storage:**
- PocketBase Local Storage - Stores profile photos and audio attachments (handled natively via PB's file APIs).

**Caching:**
- IndexedDB - Audio blobs caching for offline practice tracks.

## Authentication & Identity

**Auth Provider:**
- Custom / PocketBase Native Auth
  - Implementation: Email/password authentication stored in PB. JWT tokens handle active session sessions via `pb.authStore`.

## Monitoring & Observability

**Error Tracking:**
- None detected. Built-in PocketHost request logs handle general infrastructure errors.

**Logs:**
- PocketBase internal logs (`pb_debug.log`). 
- Note: System mandates require inspecting `pb_debug.log` for 400-level `loadAuthToken failure` issues on webhook operations.

## CI/CD & Deployment

**Hosting:**
- PocketHost (`ftp.pockethost.io`)

**CI Pipeline:**
- GitHub Actions - Compiles the React frontend, moves it to `pb_public/`, and transfers static files, migrations, and hooks via FTPS.
  - Key Action: `SamKirkland/FTP-Deploy-Action@v4.4.0`

## Environment Configuration

**Required env vars:**
- `POCKETHOST_USERNAME` (GitHub Actions Secret)
- `POCKETHOST_PASSWORD` (GitHub Actions Secret)
- Local environments utilize Vite-injected `.env` files (ignored in source control).
- Application Secrets: `HMAC_SECRET` is stored as an application setting directly within the database rather than a system-level env var.

**Secrets location:**
- Repository Secrets in GitHub Actions for deployments.
- Database records (`appSettings` collection) for application-level cryptographic keys.

## Webhooks & Callbacks

**Incoming:**
- `GET /api/calendar/download` - Calendar sync endpoint for `.ics` format consumption.
- `POST /api/queue/process` - Internal manual trigger to process pending background tasks like mass-emails.
- `GET /api/admin/queue-settings` and `POST /api/test-smtp` - Admin management endpoints.

**Outgoing:**
- Built-in mail client (`$app.newMailClient().send(...)`) handling transactional SMTP dispatches over standard outbound email protocol.

---

*Integration audit: 2026-05-26*
