# Ticketing System Donation Integration - Design Doc

**Goal:** Add a standalone donation feature to the ticketing system, allowing users to make one-time donations with tribute information (In Honor/Memory of) and allowing administrators to manage donor levels and giving history.

## Domain Language Updates

| Term | Definition |
| :--- | :--- |
| **Donation** | A voluntary financial contribution made through the ticketing system, separate from performance entry. |
| **Donor Level** | A named giving tier (e.g., "Patron") with a suggested fixed amount, managed by administrators. |
| **Tribute** | An optional dedication for a donation, either "In Memory Of" or "In Honor Of" a specific individual. |
| **Anonymous Donation** | A donation where the donor has requested to remain off public-facing acknowledgment lists. |

## 1. Data Model

### `donations` Collection (New)
*   `id`: Record ID (PocketBase standard)
*   `amountPaidCents`: (Number) Total amount in cents.
*   `donorName`: (String) Full name of the donor.
*   `donorEmail`: (String) Email for receipt and tracking.
*   `tributeType`: (Select) `none`, `memory`, `honor`.
*   `tributeName`: (String, Optional) Name of the person being honored/remembered.
*   `isAnonymous`: (Bool) Default `false`.
*   `status`: (Select) `paid`, `pending`, `refunded`.
*   `stripeSessionId`: (String) Stripe reference for idempotency.
*   `stripePaymentIntentId`: (String) For processing refunds.
*   `created`: (DateTime) Date of donation.

### `appSettings` Updates
*   Key: `donation_settings`
*   Value (JSON):
    ```json
    {
      "levels": [
        { "id": "uuid", "label": "Friend", "amount": 25, "benefit": "Mention in program" },
        { "id": "uuid", "label": "Patron", "amount": 100, "benefit": "Priority seating" }
      ],
      "choirName": "Choir Name"
    }
    ```

## 2. Backend Logic (PocketBase Hooks)

### `handleCreateDonationSession` (New Router)
*   Accepts `amountCents`, `name`, `email`, `tributeType`, `tributeName`, `isAnonymous`.
*   Validates `amountCents >= 500`.
*   Creates Stripe Checkout Session with `paymentType: "donation"` in metadata.
*   Includes all donation details in metadata for the webhook.

### `handleStripeWebhook` (Update)
*   Detects `metadata.paymentType === "donation"`.
*   Creates a record in the `donations` collection.
*   Enqueues a "Donation Receipt" system email.

### `handleAdminRefundDonation` (New Router)
*   Admin-only endpoint to trigger a Stripe refund and set donation status to `refunded`.

## 3. Frontend Architecture

### Public Donation Page (`/donate`)
*   Fetches donor levels from `appSettings`.
*   UI for selecting a level or entering a "Custom Amount".
*   Forms for contact info and tribute details.
*   Triggers the Stripe checkout redirect via the backend endpoint.

### Admin Donations View (`/admin/donations`)
*   **Mirrors Ticketing UI:**
    *   **Tab 1: History:** List of all donations with Date Range filters and Search.
    *   **Tab 2: Donor Levels:** CRUD interface for managing levels (stored in `appSettings`).
    *   **Tab 3: Summary:** Basic stats (Total raised in date range).
*   **Export:** "Export to CSV" button that respects current filters.
*   **Refund:** Button on each record to void the donation.

### Ticketing Integration
*   Add a call-to-action (CTA) card at the bottom of `PublicTicketListView` linking to `/donate`.

## 4. Verification Plan

### Automated Tests
*   **Backend:** Verify Stripe session creation and webhook persistence for donations.
*   **Frontend:** Verify calculation of total amounts and CSV formatting.

### Manual Verification
1.  Configure donor levels in Admin Settings.
2.  Make a test donation with a tribute note.
3.  Verify the `donations` record is created after webhook.
4.  Export the donations list as CSV and verify columns.
5.  Perform a refund and verify the status update.
