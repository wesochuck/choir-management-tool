# Design Doc: Pending Checkout Tracking

Tracking checkout attempts (Tickets, Bundles, Donations) before redirection to Stripe to allow administrative follow-up on abandoned carts.

## Problem Statement

Currently, the application only records a transaction when Stripe successfully notifies the backend via a webhook (`checkout.session.completed`). If a user abandons the Stripe checkout page, there is no record of the attempt, making it impossible for administrators to follow up with potential customers or donors who encountered issues or changed their minds.

## Goals

- Capture user intent and contact information immediately upon clicking "Pay".
- Provide administrators with a list of "Pending/Abandoned" transactions.
- Reconcile pending records with successful Stripe payments automatically.

## Architecture & Data Flow

### 1. Pre-Save Strategy (Backend Shadow Records)

When a checkout session is initiated via the API, the backend will "pre-save" a record to the database with `status: 'pending'` before returning the Stripe URL to the frontend.

**Affected Endpoints (in `checkoutEndpoints.ts`):**
- `handleCreateTicketsSession`
- `handleCreateBundleSession`
- `handleCreateDonationSession`

### 2. Reconciliation Strategy (Find-or-Create)

The Stripe webhook (`handleStripeWebhook`) will be updated to search for an existing record by `stripeSessionId`.

- **If found**: Update `status` to `'paid'`, fill in Payment Intent ID, set `fulfilledAt`, and send the receipt.
- **If not found**: Create a new record from scratch (existing logic) to ensure robustness against pre-save failures.

## Implementation Details

### Collection Schema Checks

- **`ticketPurchases`**: Already supports `status: ['paid', 'refunded', 'pending']`.
- **`donations`**: Already supports `status: ['paid', 'pending', 'refunded']`.
- **`stripeSessionId`**: Both collections have a unique index on this field.

### Endpoint Modifications

Each creation endpoint will follow this pattern:
1. Validate inputs (Capacity, Price, Date).
2. Call Stripe to create a session.
3. Create and save a record in the appropriate collection:
   - `status`: `'pending'`
   - `stripeSessionId`: `session.id`
   - `buyerEmail`/`donorEmail`: From request
   - `buyerName`/`donorName`: From request
   - Metadata: Prices, quantities, etc.
4. Return Stripe URL and Session ID.

### Webhook Modifications

1. Extract `stripeSessionId` from the Stripe event.
2. Attempt to find the record: `app.findFirstRecordByFilter("collection", "stripeSessionId = {:id}", { id: sessionId })`.
3. If found, update and save.
4. If not found, create new.

## Security Considerations

- **Backend-Only Access**: Record creation happens inside the Goja JS VM on the server. The `ticketPurchases` and `donations` collections remain API-locked (`createRule: null`) for public users, preventing unauthorized record insertion.
- **Sensitive Data**: No credit card or sensitive Stripe data is stored in our database; we only store the Stripe Session ID for reconciliation.

## Validation & Testing Plan

### Automated Tests
- **Endpoint Tests**: Verify that calling the checkout creation endpoints results in a `pending` record in the database.
- **Webhook Tests**: Verify that the webhook correctly updates a `pending` record to `paid` and doesn't create a duplicate.
- **Cleanup Tests**: (Future) Verify that old `pending` records can be identified.

### Manual Verification
- Start a checkout, wait on the Stripe page, and verify the record appears as `pending` in the PocketBase Admin UI.
- Complete the checkout and verify the record updates to `paid`.
- Start a checkout, close the tab, and verify the record stays `pending`.
