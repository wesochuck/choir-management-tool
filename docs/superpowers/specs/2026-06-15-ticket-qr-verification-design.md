# Ticket QR Verification — Design Spec

**Date:** 2026-06-15  
**Status:** Proposed

---

## 1. Overview

Embed a scannable QR code in ticket purchase confirmation emails (both single-event and bundle/season-pass) and on the post-payment success page. When scanned by door staff on an admin-authenticated device, the QR verifies that the purchase is paid and covers the concert being scanned at. No check-in, no tally, no per-attendee tracking — just validation.

### Scope

- Embedded QR in three ticket-related emails: Ticket Confirmation, Bundle Ticket Confirmation, Ticket Concert Reminder.
- QR displayed on the `/tickets/order/success` post-payment page.
- A new admin scanner view at `/admin/tickets/scan` with camera-based scanning and a manual-entry fallback.
- A new admin-auth validation endpoint `POST /api/tickets/validate`.
- A new public proof-of-payment endpoint `GET /api/tickets/scan-context` for the success page.
- Tokens for new purchases only (no backfill, no resend button).
- Single HMAC-signed token per `ticketPurchases` row.

### Out of scope

- Per-attendee tokens or names.
- Check-in counts, scan history, replay protection.
- Tokens for pre-existing purchases.
- Token expiry or revocation (refund is the only invalidation path).
- A public self-scan URL.

---

## 2. Data Model & Token Format

### No new collections

The feature works entirely off existing `ticketPurchases` rows. No `scanToken` field, no `ticketCheckIns` collection, no QR-storage collection. The token is dynamically derivable from `ticketPurchaseId + HMAC_SECRET`, so storing it would be unnecessary and a security regression (secret rotation would leave stale tokens recoverable from the database).

### Token format

Per AGENTS.md §6 — signed raw payload, signature appended, full token URL-encoded only at the outer URL boundary.

```
t=<ticketPurchaseId>&s=<hmacSha256(t=<ticketPurchaseId>, HMAC_SECRET)>
```

- Add `getTicketPayload(purchaseId)` and `generateSignedTicketToken(app, purchaseId, secretOverride?)` to `pocketbase/pb_hooks_src/hmacTokens.ts`, mirroring the existing `getPlayerPayload` / `generateSignedPlayerToken` pattern.
- Extend `parseSignedToken` to accept the `t` key.
- Tokens are opaque to clients; only the webhook (mint), the validate endpoint (verify), and the `scan-context` endpoint (mint on demand) touch the secret.

### Validation rules (`POST /api/tickets/validate`)

1. Parse the token, require keys `t` and `s`. Reject malformed tokens.
2. Recompute signature, compare constant-time. Reject mismatches.
3. Look up `ticketPurchases` by id. Not found → `not_found`.
4. `status !== "paid"` → `not_paid` (covers refunded, pending).
5. `purchase.event === eventId` (from request body) → valid.
6. `purchase.bundle` is set and the loaded bundle's `events[]` includes `eventId` → valid, return `isBundlePass: true` and the full `bundleEvents` list.
7. Otherwise → `wrong_event` (token is real and paid, just not for this concert).

Success returns `{ valid: true, buyerName, quantity, eventTitle, eventDate, isBundlePass, bundleEvents? }`.

Failure returns `{ valid: false, reason }` where reason is one of: `malformed`, `bad_signature`, `not_found`, `not_paid`, `wrong_event`.

---

## 3. Endpoint Contracts

### 3.1 `POST /api/tickets/validate`

- **Auth:** Admin only (`e.auth?.get("role") === "admin"`, 403 otherwise). Same pattern as the existing refund endpoints.
- **Request:** `{ token: string, eventId: string }`
- **Response (200, valid):** `{ valid: true, buyerName, quantity, eventId, eventTitle, eventDate, isBundlePass, bundleEvents? }`
- **Response (200, invalid):** `{ valid: false, reason: string }`
- **Response (400):** malformed body (missing token or eventId).
- Returns 200 for both valid and invalid — a single result-panel render path on the frontend.

### 3.2 `GET /api/tickets/scan-context`

- **Auth:** Public, with proof-of-payment gating (`session_id` + `purchase_id` pair must match).
- **Query params:** `?session_id=<stripeSessionId>&purchase_id=<ticketPurchaseId>`
- **Validation:**
  - Both params present and non-empty → 400 otherwise.
  - Single `ticketPurchases` record where `id == purchase_id` AND `stripeSessionId == session_id`. None → 404.
  - `status === "paid"` → 409 otherwise (refund race with success-page load).
- **Response (200):** `{ token, qrDataUri, buyerName, eventTitle, eventDate, isBundlePass }`
- **Rate limit:** Light in-memory per-IP limit (e.g., 10 req/min). PocketHost-friendly, swappable to a collection-backed limiter later.
- **QR image fallback:** Also serves the QR PNG at `GET /api/tickets/qr-image?token=<encoded>` (admin-auth) as a fallback for email clients that strip data URIs and for the scanner's manual-entry "preview" UX.

### 3.3 Route registration

Add both new endpoints to `pocketbase/pb_hooks_src/checkoutEndpoints.ts` with new `handleValidateScan` and `handleGetScanContext` exports. Register in `pocketbase/pb_hooks_src/generate-main-pb-js.ts` alongside the existing routes (~line 1047).

**Frontend service methods** in `src/services/ticketService.ts`:

```ts
ticketService.validateScan(token: string, eventId: string): Promise<ValidationResult>
ticketService.getScanContext(sessionId: string, purchaseId: string): Promise<ScanContext>
```

Both follow the existing `pb.send(...)` pattern with matching Vitest coverage in `test/ticketService.test.ts`.

---

## 4. Email Integration

### 4.1 Template update (forward migration)

Add `{{TICKET_QR}}` to the three ticket email templates via a new forward migration file. Positioned after the order details and before the sign-off.

- **Ticket Confirmation** (single event): `{{TICKET_QR}}` with caption "Show this QR at the door for verification."
- **Bundle Ticket Confirmation:** `{{TICKET_QR}}` with caption "Valid for any of the included performances."
- **Ticket Concert Reminder:** `{{TICKET_QR}}` with caption "Don't have your QR? It's in your original confirmation email."

### 4.2 Queue processor (`queueProcessor.ts`)

Extend the placeholder-protection block (lines 202-220) with a `%%TICKETQR%%` sentinel to shield `{{TICKET_QR}}` from the markdown renderer. After the existing `{{EVENT_INFO}}` substitution block, add:

- Read `filters.ticketToken` and `filters.qrDataUri` from the queue record's metadata.
- If both present, substitute `{{TICKET_QR}}` with a styled `<img>` tag:
  ```html
  <img src="data:image/png;base64,..."
       style="display:block; margin:20px auto; max-width:240px;
              border:1px solid #e2e8f0; border-radius:8px;
              padding:8px; background:#fff"
       alt="Ticket QR Code" />
  ```
- For bundle emails, prepend a styled caption `<p style='text-align:center; color:#475569; font-size:13px; margin:8px 0 0;'>Valid for any of the included performances</p>` above the img.
- For plain-text: replace `{{TICKET_QR}}` with `[QR code included in HTML view — open this email in a client that displays images]`.

### 4.3 Stripe webhook (`checkoutEndpoints.ts`)

At the existing email-enqueue blocks (line 622 for single, line 740 for bundle, plus the reminder cron at `generate-main-pb-js.ts:513`):

```ts
const token = generateSignedTicketToken($app, record.id);
const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(token)}`;
const qrDataUri = fetchQrPngDataUri(scanUrl, 480);
// Include ticketToken and qrDataUri in the queue record's filters JSON.
```

- `baseUrl` is the existing computed base URL from `appSettings` (reused).
- `fetchQrPngDataUri(url, sizePx)` calls `$http.send` to a third-party QR service (`api.qrserver.com/v1/create-qr-code/?data=...&size=480x480`), reads the PNG response body, and base64-encodes it to `data:image/png;base64,...`. At 480px with error correction H the payload is ~6-8KB. The HTTP call happens once per purchase at fulfillment time — one call, not fan-out.

### 4.4 Why third-party QR service (not a vendored encoder)

PocketBase's Goja engine lacks `canvas`, `Buffer`, `zlib`/`deflate`, and native PNG encoding — all required to render a QR code matrix to a PNG data URI from scratch. A pure-JS QR encoder can build the module matrix, but it cannot serialize it to PNG bytes without these APIs. By fetching the PNG from a service, we get a clean, reliable image with no Goja compatibility workarounds. The trade-off is an external HTTP call at fulfillment time; if the service is unreachable, the email is still enqueued and sent (just without the QR image — the success page QR covers this gap). A self-hosted QR endpoint can replace this later if needed.

### 4.5 QR helper module

A single small file `pocketbase/pb_hooks_src/email/qrHelper.ts` containing:

- `fetchQrPngDataUri(url: string, sizePx: number): string` — calls the QR service, returns a `data:image/png;base64,...` string. Returns empty string on failure (graceful degradation).
- Used by the webhook (for email enqueue) and by `GET /api/tickets/qr-image` (for the hosted-image fallback).

---

## 5. Admin Scanner View (`/admin/tickets/scan`)

### 5.1 Route

Registered in `src/App.tsx` via `lazyWithReload(...)` inside the existing admin auth-gated routes. View component at `src/views/admin/TicketScanView.tsx`.

### 5.2 Layout

**Event selector** — a `<select>` listing all events with `isTicketingEnabled=true && type='Performance' && isArchived=false && date >= @now`, sorted by date ascending. Selection is mirrored to the URL (`?eventId=...`) and persisted to `localStorage` so refreshing the page keeps the door-staff's choice.

**Camera scanner** — uses `getUserMedia({ video: { facingMode: 'environment' } })` for the rear camera. Video stream renders to a `<canvas>`; a frame is sampled every ~150ms and decoded with `jsQR`. On successful decode, the token is immediately sent to `validateScan`. Graceful degradation:
- Before camera grant: "📷 Tap to start camera" overlay.
- After permission denial or `getUserMedia` failure: "Camera blocked — paste the token below" message.

**Manual entry** — always visible. A single text input accepting the raw token (`t=...&s=...`) or a full URL (the frontend extracts the `token` query param). This covers laptops without cameras, broken cameras, and damaged QRs.

**Result panel** — fixed at bottom on mobile. Shows the most recent scan:

- **Valid (single):** green card with ✓, event title/date, buyer name, "Quantity: N ticket(s)". Auto-clears after 6 seconds.
- **Valid (bundle pass):** green card with scanned event at top, then "Season Pass — also valid at:" sub-list of other bundle events.
- **Invalid:** red card with reason mapped to a short message:
  - `malformed` / `bad_signature` → "QR code is not valid"
  - `not_found` → "Ticket not found"
  - `not_paid` → "Ticket has been refunded"
  - `wrong_event` → "This ticket is for a different concert"

A short history strip (last 5 scans) appears below the result card to help door staff catch repeat attempts.

### 5.3 Scanner result component

`src/components/admin/ScanResultCard.tsx` — isolated for testability. Accepts the validation result as props and renders the green/red card.

### 5.4 TicketingView entry point

Add a "Scan Tickets" button or tab on the admin `TicketingView` dashboard linking to `/admin/tickets/scan`.

---

## 6. Files Changed

### New files

| File | Purpose |
|------|---------|
| `pocketbase/pb_hooks_src/email/qrHelper.ts` | `fetchQrPngDataUri` helper wrapping the third-party QR service |
| `pocketbase/pb_hooks_src/ticketScan/ticketValidation.ts` | `handleValidateScan` and `handleGetScanContext` handlers |
| `pocketbase/pb_migrations/1720000000_add_qr_placeholder_to_ticket_emails.js` | Forward migration updating the three email templates |
| `src/views/admin/TicketScanView.tsx` | Scanner view |
| `src/components/admin/ScanResultCard.tsx` | Result panel component |
| `test/ticketScanValidation.test.ts` | Backend validation logic tests |

### Modified files

| File | Change |
|------|--------|
| `pocketbase/pb_hooks_src/hmacTokens.ts` | Add `t` key, `getTicketPayload`, `generateSignedTicketToken` |
| `pocketbase/pb_hooks_src/checkoutEndpoints.ts` | Token+QR generation at enqueue time; register new route handlers |
| `pocketbase/pb_hooks_src/generate-main-pb-js.ts` | Register new routes |
| `pocketbase/pb_hooks_src/email/queueProcessor.ts` | Handle `{{TICKET_QR}}` placeholder |
| `src/services/ticketService.ts` | Add `validateScan`, `getScanContext` |
| `src/views/PublicTicketSuccessView.tsx` | Call `getScanContext` and render QR inline |
| `src/views/admin/TicketingView.tsx` | Add "Scan Tickets" entry point |
| `src/App.tsx` | Register `/admin/tickets/scan` route |
| `package.json` | Add `jsQR` dependency |
| `test/hmacTokens.test.ts` | Add `t` key test cases |
| `test/ticketService.test.ts` | Add `validateScan` / `getScanContext` test cases |

---

## 7. Dependencies

- **jsQR** (~43KB, MIT, zero peer deps) — added to `package.json`. Used in the admin scanner view for camera-based QR decoding.
- **qrcode** — already a dependency. Not used for the email QR (server-side uses the third-party service); `QRCodeShareCard.tsx` continues using it for the existing marketing QRs.
- **Third-party QR service** — `api.qrserver.com` called via `$http.send` at fulfillment time. Free, no API key required. For email-inline QRs and the hosted-image fallback endpoint.

---

## 8. Testing

| Test file | What it covers |
|-----------|----------------|
| `test/hmacTokens.test.ts` | `getTicketPayload`, `generateSignedTicketToken`, `parseSignedToken` with `t` key |
| `test/ticketScanValidation.test.ts` | Pure-function validate logic: valid single, valid bundle, invalid signature, refunded, wrong event, malformed token |
| `test/ticketService.test.ts` | `validateScan` and `getScanContext` with mocked `pb.send` |
| `test/ticketScanView.test.ts` (optional) | Scanner view component with jsdom, if desired |

All tests use the existing Vitest → `node:test` compatibility layer. Mock pattern follows `mock.fn()` / `mock.method()` (see AGENTS.md §3).

### Checks to run

```bash
rtk npx vitest run test/hmacTokens.test.ts
rtk npx vitest run test/ticketScanValidation.test.ts
rtk npx vitest run test/ticketService.test.ts
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
rtk npm run typecheck
```

---

## 9. Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token per purchase | One HMAC token per `ticketPurchases` row | No per-attendee records exist; `quantity` field captures group size |
| QR rendering in email | Inline base64 data URI via third-party QR service | Goja lacks canvas/zlib/PNG encoding; fetching PNG via `$http.send` is the simplest reliable path. No external deps installed, one HTTP call per purchase. Fallback: the success page QR covers cases where the service is unreachable at fulfillment time. |
| Scanner UI | Camera + manual-entry fallback, admin-only | Rear camera for phones; manual paste for laptops and camera-blocked browsers |
| Bundle handling | Single QR covers all events in the bundle | `POST /api/tickets/validate` checks `bundle.events[]` membership dynamically |
| QR on success page | `GET /api/tickets/scan-context` public endpoint gated by `session_id` | Avoids leaking HMAC secret to the URL; proof-of-payment via Stripe session_id match |
| Existing purchases | No backfill, no resend button | Keeps scope tight; per user preference |
| Per-attendee tracking | None | User explicitly said "we don't need to check them in, just verify" |
| Replay / expiry | None | Same reason; refund is the only invalidation |
| No schema change | Token is computed, not stored | Simpler; secret rotation works; one less collection to manage |

---

## 10. Validation Checklist

- [ ] TypeScript: no `any`, no `as any`, no `// @ts-ignore`.
- [ ] Migrations: forward migration only, no historical migration edits, uses `JSONField` not `JsonField`.
- [ ] Generated files: `pocketbase/pb_hooks/main.pb.js` not edited directly; generated via `npm run generate:pb-hooks`.
- [ ] PocketBase rules: new public endpoint validates `session_id` match before returning token.
- [ ] Secrets: `HMAC_SECRET` never logged or returned to clients.
- [ ] Token contract: `t=<id>&s=<sig>` payload matches AGENTS.md §6 canonical format.
- [ ] Network safety: single `$http.send` calls, no fan-out.
- [ ] Email images: inline data URI, no remote image blocking.
- [ ] AGENTS.md prefix rule: all shell commands use `rtk`.
