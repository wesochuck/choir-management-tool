# Choir Management Tool

A React + TypeScript + PocketBase web app for choir admins and singers.

## What It Does

- Admin roster management with singer login accounts.
- Event scheduling for performances and rehearsals.
- Bulk rehearsal generation from a performance date.
- Singer dashboard with RSVP and calendar download.
- Mobile-friendly attendance check-in with folder tracking.
- Venue templates and seating chart assignment tools.
- Public audition requests with admin-configured slots.
- Email and text reminder templates from the admin settings screen.

## Local Development

Install dependencies:

```bash
npm install
```

Run PocketBase:

```bash
cd pocketbase
./pocketbase serve --http=127.0.0.1:8090 --migrationsDir=pb_migrations
```

Run the frontend:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/`.

## Verification

Run these before handing work back:

```bash
npm run build
npm run lint
npm test
```

`npm test` uses Node's built-in test runner and covers reusable domain logic without adding a test framework dependency.

## PocketBase Notes

- Schema changes must go in `pocketbase/pb_migrations/`.
- If using a non-default data dir, pass `--migrationsDir=pb_migrations`; otherwise PocketBase may not discover the project migrations.
- After migration changes, run a real API smoke test against PocketBase. At minimum verify auth, create, read, update, and delete for affected collections.
- Restart the running PocketBase server after applying migrations so the app can see new collections.
- The frontend clears stale auth tokens on 401/403 responses. After a database reset, log out and log back in if a browser already has an old token.

Create or reset a local superuser:

```bash
cd pocketbase
./pocketbase superuser upsert admin@example.test password123
```

## Agent Hints

- Keep API calls in `src/services/`, state coordination in `src/hooks/`, and presentational UI in `src/components/`.
- `profiles` is a base collection linked to auth collection `users`. Singer creation should create both a `users` auth record and a linked `profiles` record.
- `/admin/settings` controls public audition availability, audition slots, email templates, and text message templates.
- Text support intentionally uses `sms:` links so it works without storing carrier or Twilio secrets in the browser app.
- Seating auto-paint logic lives in `src/lib/seatingAlgorithm.ts` so it can be tested independently.
- Calendar ICS text generation lives in `calendarUtils.createICS`; browser download behavior wraps it in `calendarUtils.generateICS`.
