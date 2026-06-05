# Future Implementation Plan: Stripe Online Ticketing Solution

This document outlines the architecture and implementation steps to build a self-contained general admission ticketing system. The solution is designed for a "will call" door entry flow and utilizes Stripe Checkout for secure, compliant payment processing.

> [!NOTE]
> **Webhook-Driven Fulfillment**
> This implementation utilizes Stripe Webhooks to guarantee purchase fulfillment even if the buyer closes their browser before returning to the site. This ensures robust ticket delivery, database consistency, and allows for asynchronous background processing.

> [!NOTE]
> **No Checkout Reservation Hold**
> Ticket availability is checked before redirecting to Stripe and final sales are counted after successful verification. This keeps the system simple, but it does not reserve inventory while a buyer is in Stripe Checkout. **Overselling mitigation:** The admin panel displays a warning when sold count exceeds 90% of capacity. The webhook fulfillment handler performs a final capacity check and auto-refunds via the Stripe Refund API if the purchase would exceed capacity.

---

## 1. Prerequisites & Credentials

*   **Stripe Account:** Stripe account keys will be stored in the server environment variables (`STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, and `STRIPE_WEBHOOK_SECRET`).
*   **Discount Codes:** Choir organizers will manage coupons/promotions directly inside the Stripe Dashboard. The app will enable Stripe Checkout's native promo code validation.

> [!TIP]
> **Verified Spike Results (June 2026)**
> The following Goja VM capabilities were confirmed on PocketHost production:
> - ✅ `$http.send()` — Outbound HTTPS works. Stripe API calls can live entirely in `pb_hooks_src/`.
> - ✅ `readerToString(e.request.body)` — Returns the exact raw request body bytes, safe for HMAC signature verification.
> - ✅ `$security.hs256(payload, secret)` — Computes HMAC-SHA256 correctly over raw body data.
> - ⚠️ `e.requestInfo().headers["key"]` — Did not return values for custom or standard headers. Header access for the `Stripe-Signature` header should use `e.request.header.get("Stripe-Signature")` (Go `http.Request.Header`) instead.

---

## 2. Database Schema Changes

We will create a forward migration script in `pocketbase/pb_migrations/` to update the schema.

> [!IMPORTANT]
> **Migration Conventions:**
> - The `events` collection uses ID `"pbc_1687431684"`. The `ticketPurchases` collection must use `id: "pbc_ticketPurchases_001"`.
> - Omit custom field IDs (let PocketBase auto-generate them).
> - Include `AutodateField` entries for `created` and `updated` on the new collection.

### A. Modify `events` Collection
Add ticketing-specific configuration:
*   `isTicketingEnabled` (boolean): Toggle public ticket sales.
*   `advancePriceCents` (number/integer): Ticket price in cents in advance of show day.
*   `dayOfPriceCents` (number/integer): Ticket price in cents on show day.
*   `ticketCapacity` (number/integer): Max tickets available for purchase.
*   `doorsOpenTime` (text, optional): Doors-open time (e.g. "6:30 PM") to show public buyers.
*   `publicDetails` (text, optional): Markdown details for the public page (parking, directions).
*   `eventGraphic` (file, optional): Hero image for the event. Displayed as the banner on the public ticket purchase page. `maxSelect: 1`, max 5 MB, accepts `image/jpeg`, `image/png`, `image/webp`.

### B. Create `ticketPurchases` Collection
Record buyer transactions:
*   `id` (text, primary key)
*   `event` (relation to `events`, cascade delete)
*   `buyerName` (text, required)
*   `buyerEmail` (text, required)
*   `quantity` (number/integer, required)
*   `unitPriceCents` (number/integer, required)
*   `feeCents` (number/integer, required)
*   `amountPaidCents` (number/integer, required)
*   `currency` (text, required, e.g. `'usd'`)
*   `stripeSessionId` (text, **unique index enforced at DB level**, required)
*   `stripePaymentIntentId` (text)
*   `stripeCustomerId` (text, optional): Stored if Stripe creates/returns a customer object. Enables linking repeat buyers and simplifies future refund operations.
*   `status` (select: `paid`, `refunded`, `pending`)
*   `marketingOptIn` (boolean, defaults to `false`)
*   `fulfilledAt` (date)

### C. Collection Access Rules for `ticketPurchases`
*   **List/View Rule:** `""` (unauthenticated access allowed) — required so the success page can poll for the buyer's purchase record by `stripeSessionId` without authentication.
*   **Create Rule:** `null` (API-locked) — only the webhook handler creates records via `$app.save()`.
*   **Update Rule:** `"@request.auth.role = 'admin'"` — admins only (for status changes like refunds).
*   **Delete Rule:** `"@request.auth.role = 'admin'"` — admins only.

---

### 3. Backend Routes (`pocketbase/pb_hooks_src/`)

### Stripe Client Helper (`stripeService.ts`)
A server-side module using `$http.send()` (confirmed working on PocketHost) to make raw HTTP requests to the Stripe API. Must be registered as a new `UtilityBundleName` (`'stripeService'`) in `generate-main-pb-js.ts` so its code is inlined into every callback closure that references it (per the self-contained requirement).

*   `createCheckoutSession(lineItems, metadata, customerEmail)`: 
    *   Uses `$http.send({ url: "https://api.stripe.com/v1/checkout/sessions", method: "POST", headers: { "Authorization": "Bearer " + stripeSecretKey }, body: formEncodedPayload })`.
    *   **Extensible Parameters:** Accepts generic line items, a metadata object, and pre-populated customer email.
    *   **Stripe Session Ownership Safeguard:** Stores the metadata payload on the Checkout Session (e.g., `paymentType`, `eventId`, `quantity`, etc.). This ensures that `/verify-session` can securely reconstruct the purchase record directly from verified Stripe data instead of trusting client-side frontend payloads.
*   `retrieveCheckoutSession(sessionId)`: Retrieves the session payload, final amount paid (after promotion code discounts), and payment status.

### Checkout Endpoints (`checkoutEndpoints.ts`)
Adds custom router endpoints:
*   `POST /api/checkout/create-tickets-session`: 
    1. **Secure Price Calculation:** Do **not** let the frontend send the price. The backend retrieves the event record and calculates the unit price.
    2. **Sold Count Derived from Paid Purchases:** Sold count is calculated on-the-fly by summing `quantity` from existing paid `ticketPurchases` where `event = eventId` and `status = paid`. Remaining capacity is derived via `ticketCapacity - soldCount`.
    3. **Capacity Check:** Validates that the requested quantity does not exceed remaining capacity.
    4. **Day-Of Price Selection:** Retrieves the choir's global `timezone` setting. Uses the existing `getTimezoneOffsetInfo()` and `formatInTimezone()` helpers from `hookText.ts` to determine "today" in the choir's timezone and compare date-only against the event date (also converted to the choir's timezone). If they match, applies `dayOfPriceCents`; otherwise, applies `advancePriceCents`.
    5. **Fee Calculation:** Calculates the Stripe processing fee needed to net the exact `unitPriceCents`. 
        *   Formula (in cents): `gross_cents = Math.round((unitPriceCents + 30) / (1 - 0.029))`
        *   `feeCents = gross_cents - unitPriceCents`
        *   *Note:* This formula targets Stripe's standard US domestic card rate (2.9% + $0.30). International cards (3.9% + $0.30) will under-collect. This is documented as an approximation. Guard against `unitPriceCents = 0` (free tickets) to avoid charging a fee on a free event.
    6. Initiates Stripe Checkout with **two line items** (Ticket Price and "Processing Fee"), sets `paymentType: "ticket"` in metadata, and returns the session URL.
*   `POST /api/webhook/stripe`: 
    1. **Signature Verification:** Reads the raw request body via `readerToString(e.request.body)` and the `Stripe-Signature` header via `e.request.header.get("Stripe-Signature")`. Parses the Stripe `v1` signature scheme (`t=<timestamp>,v1=<signature>`), computes `$security.hs256(timestamp + "." + rawBody, webhookSecret)`, and rejects on mismatch using `$security.equal()` for constant-time comparison. Also rejects if the timestamp is older than 300 seconds to prevent replay attacks.
    2. **Event Filtering:** Listens specifically for `checkout.session.completed` events.
    3. **Extensible Strategy Dispatch:** Inspects `paymentType` in the session metadata:
        *   **If `paymentType === "ticket"`:** Executes the Ticketing Fulfillment Strategy (creates `ticketPurchases` record idempotently, sends confirmation email, etc.).
        *   **If `paymentType === "dues"`:** Executes the Dues Fulfillment Strategy (updates `seasonalDues` record idempotently to `paid = true`).
    4. **Server-side Idempotency:** Safely ignores the event if a record with the same `stripeSessionId` already exists (enforced by unique DB index), returning a `200 OK` to Stripe to prevent retries.
    5. **Overselling Guard:** Before creating the `ticketPurchases` record, re-checks sold count vs. `ticketCapacity`. If the purchase would exceed capacity, issues an automatic refund via `$http.send()` to `POST /v1/refunds` and returns `200 OK` without creating a record.
*   `POST /api/webhook/stripe` (additional event: `charge.refunded`):
    1. When Stripe fires a `charge.refunded` event (e.g., admin refunded directly in Stripe Dashboard), looks up the `ticketPurchases` record by `stripePaymentIntentId` and updates `status` to `refunded`. This keeps the app in sync regardless of whether the refund was initiated from the app or the Stripe Dashboard.

---

## 4. Frontend Client & Routing (`src/`)

### Services (`src/services/ticketService.ts`)
Handles calling the checkout and verification backend endpoints, and fetching sales data for administrators.

### Routing (`src/App.tsx`)
Avoid route conflicts between `/tickets/:eventId` and `/tickets/order/success` by defining the static success route **before** the dynamic `:eventId` route. All new views must use `lazyWithReload()` per project convention.
*   `/tickets`: Landing page listing upcoming performances.
*   `/tickets/order/success`: Success page with a loader verifying the session. *(defined first to avoid matching `:eventId`)*
*   `/tickets/:eventId`: Selection page (Name, Email, Quantity, Opt-in).
*   `/admin/tickets`: Standalone ticket administration panel.

### Public Pages (`src/views/`)
*   `PublicTicketListView.tsx` (`/tickets`): Lists upcoming events where `isTicketingEnabled === true`.
*   `PublicTicketPurchaseView.tsx` (`/tickets/:eventId`): 
    *   Displays a hero banner using the event's `eventGraphic` (via `pb.files.getURL(event, event.eventGraphic)`), falling back to a styled gradient header if no graphic is uploaded.
    *   Displays event details, doors open time, venue, and renders the `publicDetails` markdown to HTML.
    *   **Public Markdown Sanitization:** Uses DOMPurify on the frontend to sanitize the rendered `publicDetails` HTML. (The backend `renderMarkdown` from `emailRendering.ts` is for email context only.)
    *   **Transparent Pricing:** Calculates and displays the exact base ticket price, the required processing fee, and the grand total so the buyer knows the final cost before submitting the form. (Uses the same `(sale_amount + 0.30) / (1 - 0.029)` formula client-side for display purposes).
    *   Form captures: Quantity, Buyer Name, Email Address, and Confirm Email Address.
    *   **Double-Entry Email Validation:** Frontend validation requires the Email and Confirm Email fields to match exactly, preventing email typos.
    *   **Public Checkout UX Warnings:**
        *   *After submit (loading state):* Displays: `"Opening secure Stripe Checkout…"`
    *   Opt-in checkbox for future event announcements.
*   `PublicTicketSuccessView.tsx` (`/tickets/order/success`): Displays a clean confirmation receipt. Since fulfillment is handled asynchronously by the webhook, this page can briefly poll PocketBase for the `ticketPurchases` record using the `session_id` to show the final receipt, or simply display a standard "Thank You" message if the record isn't immediately available.
    *   **Idempotent UX:** Handles both immediate fulfillment (record already created by webhook) and slightly delayed fulfillment (webhook in transit).

### Event Creation / Edit Modal (`src/components/admin/EventModal.tsx`)
Expose ticketing fields when the event type is set to `'Performance'`:
*   Add inputs for `isTicketingEnabled`, `advancePriceCents`, `dayOfPriceCents`, `ticketCapacity`, `doorsOpenTime`, and an image upload for `eventGraphic` (reusing the existing `PhotoUpload` component pattern).
*   Integrate the shared `MarkdownEditor` component for editing `publicDetails` (parking, directions, etc.).

-----

## 5. Admin Ticketing Module & Audiences

### Standalone Ticket Panel (`src/views/admin/TicketingView.tsx`)
A new navigation item for administrators containing:
*   **Ticket Sales (Events List):** View revenue, sales counts, and open the searchable **Will Call List** for check-in staff. Includes print stylesheet overrides to output clean paper layouts. Displays a **warning banner** when sold count exceeds 90% of capacity.
    *   **Will Call Requirements:** Sort the will-call list by buyer name, show purchase timestamp, show amount paid, and exclude refunded purchases from active will-call totals.
    *   **Manual Reconciliation:** Include a visible manual reconciliation note or workflow for admins to register a purchase in case a customer completed payment on Stripe but failed to redirect back to the app.
    *   **Refund Button:** Each purchase row has a "Refund" action that calls a backend endpoint `POST /api/admin/refund-ticket`. The endpoint issues `$http.send()` to Stripe's `POST /v1/refunds` API with the `stripePaymentIntentId`, then updates the local `ticketPurchases` record status to `refunded`. Uses `useDialog().confirm()` with danger styling before executing.
*   **Audience Database:** Consolidated directory of unique buyers with their total ticket purchase history and marketing opt-in statuses. Includes a "Export CSV" option.

### Ticket Confirmation Email
A new `isSystemTemplate` message template called **"Ticket Confirmation"** in the `messageTemplates` collection, enqueued by the webhook fulfillment handler via the existing `emailQueue` → `processEmailQueue` pipeline. Includes:
*   Event name, date, and venue
*   Quantity purchased and total amount paid
*   Doors-open time
*   Will-call pickup line: *"Your tickets will be at Will Call under the name: {buyerName}"*

### Communications Integration (`src/services/communication/ticketBuyerResolver.ts`)
A **separate** `ticketBuyerResolver` function (not mixed into the profile-based `resolveRecipients`) that returns `CommunicationRecipient[]` from `ticketPurchases`. The communication UI offers **"Ticket Buyers"** as a distinct audience category calling this dedicated resolver. Supports granular filters:
*   Paid buyers for a selected event.
*   All paid ticket buyers.
*   Marketing-opted-in ticket buyers.
*   *Note:* Automatically excludes refunded purchases from all recipient lists.

---

## 6. Testing Requirements

We will add regression coverage for the following scenarios:
1.  **Pricing Rules:** Verify the unit price selection correctly switches between `advancePriceCents` and `dayOfPriceCents` at midnight in the local event timezone.
2.  **Fee Calculation Math:** Verify the Stripe fee offset is calculated correctly using the `(sale_amount + 0.30) / (1 - 0.029)` rule, ensuring the final net amount matches the original ticket price. Verify `unitPriceCents = 0` produces zero fee.
3.  **Webhook Verification Rejection:** Verify `/api/webhook/stripe` rejects requests with invalid signatures, expired timestamps (>300s), and unsupported event types.
4.  **Idempotency:** Verify the webhook handler safely ignores duplicate `checkout.session.completed` events for the same `stripeSessionId` without erroring.
5.  **Sold Count Derivation:** Verify that the total sold count only includes paid purchases.
6.  **Overselling Auto-Refund:** Verify that webhook fulfillment auto-refunds and skips record creation when the purchase would exceed capacity.
7.  **Exclusion Rules:** Verify refunded purchases are excluded from will-call lists and communications filters.
8.  **XSS Sanitization:** Verify that `publicDetails` markdown rendering strips out unsafe HTML/script tags via DOMPurify.
9.  **Success Page Resilience:** Verify that the success page handles already verified session IDs gracefully.
10. **Refund Sync:** Verify that `charge.refunded` webhook events correctly update `ticketPurchases` status to `refunded`.

---

## 7. Extensibility for Member Dues Payments

To support future Stripe payments for member dues without modifying the core payment verification system:

### A. Stripe Session Metadata Setup (Dues)
When creating a dues Checkout Session, the backend/frontend will pass:
*   `paymentType = "dues"`
*   `profileId` (the singer's profile ID from the `profiles` collection)
*   `season` (the target seasonal key, e.g. `"Spring 2026"`)
*   `amountPaidCents` (the seasonal dues price)

### B. Dues Strategy Handler
Inside `checkoutEndpoints.ts` (triggered by the webhook), a specific dues fulfillment handler will be registered:
1.  Extract the completed session payload from the Stripe webhook event.
2.  Search the `seasonalDues` collection for an existing record matching `profile = profileId` and `season = season`.
3.  If no record exists, create one with `paid = true`. If a record exists but `paid = false`, update it to `paid = true`.
4.  Return the verified dues payment record.

This Strategy pattern keeps the ticketing and dues subsystems isolated while sharing the secure token, API keys, and session verification routes.

