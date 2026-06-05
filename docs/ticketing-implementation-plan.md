# Future Implementation Plan: Stripe Online Ticketing Solution

This document outlines the architecture and implementation steps to build a self-contained general admission ticketing system. The solution is designed for a "will call" door entry flow and utilizes Stripe Checkout for secure, compliant payment processing.

> [!WARNING]
> **Checkout Completion Depends on Return to Site**
> This initial implementation does not use Stripe webhooks. Purchases are finalized when the buyer is redirected back to the site after Stripe Checkout and the success page verifies the completed session. Buyers should not close the browser tab until the confirmation screen appears. If a buyer completes payment but closes the page before returning, an administrator may need to reconcile the payment manually from the Stripe Dashboard.

> [!NOTE]
> **No Checkout Reservation Hold**
> Ticket availability is checked before redirecting to Stripe and final sales are counted after successful verification. This keeps the system simple, but it does not reserve inventory while a buyer is in Stripe Checkout. In rare cases with simultaneous purchases near capacity, sales may exceed the configured capacity and require manual handling.

---

## 1. Prerequisites & Credentials

*   **Stripe Account:** Stripe account keys will be stored in the server environment variables (`STRIPE_SECRET_KEY` and `STRIPE_PUBLIC_KEY`).
*   **Discount Codes:** Choir organizers will manage coupons/promotions directly inside the Stripe Dashboard. The app will enable Stripe Checkout's native promo code validation.

---

## 2. Database Schema Changes

We will create a forward migration script in `pocketbase/pb_migrations/` to update the schema:

### A. Modify `events` Collection
Add ticketing-specific configuration:
*   `isTicketingEnabled` (boolean): Toggle public ticket sales.
*   `advancePriceCents` (number/integer): Ticket price in cents in advance of show day.
*   `dayOfPriceCents` (number/integer): Ticket price in cents on show day.
*   `ticketCapacity` (number/integer): Max tickets available for purchase.
*   `doorsOpenTime` (text, optional): Doors-open time (e.g. "6:30 PM") to show public buyers.
*   `publicDetails` (text, optional): Markdown details for the public page (parking, directions).

### B. Create `ticketPurchases` Collection
Record buyer transactions:
*   `id` (text, primary key)
*   `event` (relation to `events`, cascade delete)
*   `buyerName` (text, required)
*   `buyerEmail` (text, required)
*   `quantity` (number/integer, required)
*   `unitPriceCents` (number/integer, required)
*   `amountPaidCents` (number/integer, required)
*   `currency` (text, required, e.g. `'usd'`)
*   `stripeSessionId` (text, unique, required)
*   `stripePaymentIntentId` (text)
*   `status` (select: `paid`, `refunded`, `pending`)
*   `marketingOptIn` (boolean, defaults to `false`)
*   `fulfilledAt` (date)

---

### 3. Backend Routes (`pocketbase/pb_hooks_src/`)

### Stripe Client Helper (`stripeService.ts`)
A server-side module wrapping raw HTTP requests to Stripe:
*   `createCheckoutSession(lineItems, metadata, customerEmail)`: 
    *   **Extensible Parameters:** Accepts generic line items, a metadata object, and pre-populated customer email.
    *   **Stripe Session Ownership Safeguard:** Stores the metadata payload on the Checkout Session (e.g., `paymentType`, `eventId`, `quantity`, etc.). This ensures that `/verify-session` can securely reconstruct the purchase record directly from verified Stripe data instead of trusting client-side frontend payloads.
*   `retrieveCheckoutSession(sessionId)`: Retrieves the session payload, final amount paid (after promotion code discounts), and payment status.

### Checkout Endpoints (`checkoutEndpoints.ts`)
Adds custom router endpoints:
*   `POST /api/checkout/create-tickets-session`: 
    1. **Secure Price Calculation:** Do **not** let the frontend send the price. The backend retrieves the event record and calculates the unit price.
    2. **Sold Count Derived from Paid Purchases:** Sold count is calculated on-the-fly by summing `quantity` from existing paid `ticketPurchases` where `event = eventId` and `status = paid`. Remaining capacity is derived via `ticketCapacity - soldCount`.
    3. **Capacity Check:** Validates that the requested quantity does not exceed remaining capacity.
    4. **Day-Of Price Selection:** Retrieves the choir's global `timezone` setting and checks if today (in that timezone) is the day of the performance. If yes, applies `dayOfPriceCents`; otherwise, applies `advancePriceCents`.
    5. Initiates Stripe Checkout with `paymentType: "ticket"` in metadata, and returns the session URL.
*   `POST /api/checkout/verify-session`: 
    1. Queries Stripe using the session ID to verify the payment is successful.
    2. **Extensible Strategy Dispatch:** Inspects `paymentType` in the session metadata:
        *   **If `paymentType === "ticket"`:** Executes the Ticketing Fulfillment Strategy (creates `ticketPurchases` record idempotently, sends confirmation email, etc.).
        *   **If `paymentType === "dues"`:** Executes the Dues Fulfillment Strategy (updates `seasonalDues` record idempotently to `paid = true`).
    3. **Server-side Idempotency:** Safely retrieves and returns the existing fulfillment record if the same `stripeSessionId` is verified multiple times.

---

## 4. Frontend Client & Routing (`src/`)

### Services (`src/services/ticketService.ts`)
Handles calling the checkout and verification backend endpoints, and fetching sales data for administrators.

### Routing (`src/App.tsx`)
Avoid route conflicts between `/tickets/:eventId` and `/tickets/order/success` by defining success route explicitly:
*   `/tickets`: Landing page listing upcoming performances.
*   `/tickets/:eventId`: Selection page (Name, Email, Quantity, Opt-in).
*   `/tickets/order/success`: Success page with a loader verifying the session.
*   `/admin/tickets`: Standalone ticket administration panel.

### Public Pages (`src/views/`)
*   `PublicTicketListView.tsx` (`/tickets`): Lists upcoming events where `isTicketingEnabled === true`.
*   `PublicTicketPurchaseView.tsx` (`/tickets/:eventId`): 
    *   Displays event details, doors open time, venue, and renders the `publicDetails` markdown to HTML.
    *   **Public Markdown Sanitization:** Before rendering `publicDetails`, sanitizes the output HTML to strip unsafe tags/scripts.
    *   Form captures: Quantity, Buyer Name, Email Address, and Confirm Email Address.
    *   **Double-Entry Email Validation:** Frontend validation requires the Email and Confirm Email fields to match exactly, preventing email typos.
    *   **Public Checkout UX Warnings:**
        *   *On form before submit:* Displays: `"After payment, Stripe will return you to this site to confirm your order. Please keep the browser window open until you see your confirmation screen."`
        *   *After submit (loading state):* Displays: `"Opening secure Stripe Checkout… after payment, please wait to be returned here for confirmation."`
    *   Opt-in checkbox for future event announcements.
*   `PublicTicketSuccessView.tsx` (`/tickets/order/success`): Polling screen that calls `/api/checkout/verify-session?session_id=...` and renders a clean confirmation receipt once validated.
    *   **Verification Loading State:** Displays: `"Confirming your ticket purchase. Please do not close this page."`
    *   **Idempotent UX:** Gracefully handles already verified sessions by displaying the receipt details.

### Event Creation / Edit Modal (`src/components/admin/EventModal.tsx`)
Expose ticketing fields when the event type is set to `'Performance'`:
*   Add inputs for `isTicketingEnabled`, `advancePriceCents`, `dayOfPriceCents`, `ticketCapacity`, and `doorsOpenTime`.
*   Integrate the shared `MarkdownEditor` component for editing `publicDetails` (parking, directions, etc.).

-----

## 5. Admin Ticketing Module & Audiences

### Standalone Ticket Panel (`src/views/admin/TicketingView.tsx`)
A new navigation item for administrators containing:
*   **Ticket Sales (Events List):** View revenue, sales counts, and open the searchable **Will Call List** for check-in staff. Includes print stylesheet overrides to output clean paper layouts.
    *   **Will Call Requirements:** Sort the will-call list by buyer name, show purchase timestamp, show amount paid, and exclude refunded purchases from active will-call totals.
    *   **Manual Reconciliation:** Include a visible manual reconciliation note or workflow for admins to register a purchase in case a customer completed payment on Stripe but failed to redirect back to the app.
*   **Audience Database:** Consolidated directory of unique buyers with their total ticket purchase history and marketing opt-in statuses. Includes a "Export CSV" option.

### Communications Integration (`src/services/communication/recipientResolver.ts`)
Update `resolveRecipients` to support granular **Ticket Buyers** targets instead of one broad group:
*   Paid buyers for a selected event.
*   All paid ticket buyers.
*   Marketing-opted-in ticket buyers.
*   *Note:* Automatically exclude refunded purchases from all recipient lists.

---

## 6. Testing Requirements

We will add regression coverage for the following scenarios:
1.  **Pricing Rules:** Verify the unit price selection correctly switches between `advancePriceCents` and `dayOfPriceCents` at midnight in the local event timezone.
2.  **Verification Rejection:** Verify `/api/checkout/verify-session` rejects unpaid sessions, sessions for the wrong event, or malformed metadata.
3.  **Idempotency:** Verify `/api/checkout/verify-session` returns the existing record instead of creating duplicates when re-requested.
4.  **Sold Count Derivation:** Verify that the total sold count only includes paid purchases.
5.  **Exclusion Rules:** Verify refunded purchases are excluded from will-call lists and communications filters.
6.  **XSS Sanitization:** Verify that `publicDetails` markdown rendering strips out unsafe HTML/script tags.
7.  **Success Page Resilience:** Verify that the success page handles already verified session IDs gracefully.

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
Inside `checkoutEndpoints.ts`, a specific dues fulfillment handler will be registered:
1.  Verify the session payment is complete with Stripe.
2.  Search the `seasonalDues` collection for an existing record matching `profile = profileId` and `season = season`.
3.  If no record exists, create one with `paid = true`. If a record exists but `paid = false`, update it to `paid = true`.
4.  Return the verified dues payment record.

This Strategy pattern keeps the ticketing and dues subsystems isolated while sharing the secure token, API keys, and session verification routes.

