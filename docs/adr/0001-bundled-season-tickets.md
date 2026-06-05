# ADR 0001: Season Tickets as Bundled Individual Purchases

## Context

The choir wants to sell "Season Tickets" that grant admission to multiple upcoming performances for a single price.

We needed to decide whether a Season Ticket should be represented as a new, distinct "Pass" entity that grants access to multiple events, or if it should be an administrative construct that automatically generates individual ticket records for each event.

The system currently relies heavily on the `ticketPurchases` collection for its core logic:
- The Will Call list is driven by `ticketPurchases` tied to a specific `event`.
- Event capacity calculations count the number of `ticketPurchases` for that `event`.
- The communication module uses `ticketPurchases` to resolve "Ticket Buyer" audiences for specific events.

## Decision

We will implement Season Tickets using a **Bundled Generation Strategy**:

1. **Ticket Bundle Entity:** We will introduce a `ticketBundles` collection to represent the package (e.g., "2026-2027 Season"). It will have a fixed price, an `events` relation (multiple), and its own `capacity`.
2. **Individual Ticket Generation:** When a buyer purchases a `ticketBundle` via Stripe Checkout, the webhook fulfillment handler will create *individual* `ticketPurchases` records for *each* event included in the bundle.
3. **Bundle Tracking:** The `ticketPurchases` collection will gain an optional `bundle` relation. This allows the admin UI to visually tag bundle purchases on the Will Call list.
4. **Strict Capacity Constraint:** The effective available capacity of a bundle will be calculated as the minimum of the bundle's own capacity and the lowest remaining capacity of any individual event within the bundle (multiplied by purchase quantity). If any single event in the bundle sells out, the bundle cannot be purchased.
5. **All-or-Nothing Refunds:** Because the bundle is purchased in a single Stripe transaction, refunds (fired via `charge.refunded` webhooks or triggered in the admin dashboard) will look up *all* `ticketPurchases` by the shared Stripe Session/Intent ID and refund the entire package simultaneously. To guarantee atomicity, database modifications during the refund cascade must be wrapped in a server-side PocketBase transaction (`$app.runInTransaction`). Partial refunds for specific events within a bundle are not supported.
6. **Auto-Expiration & Late Sales:** A bundle automatically becomes unavailable for purchase based on its `saleEndDate`. When creating or editing a bundle, the `saleEndDate` will auto-populate to the end of the day (11:59 PM in the choir's local timezone) of the chronologically first concert in the package, but admins can explicitly edit it to a different date/time (e.g., to keep sales open for late/pro-rated purchases, or close it early).
7. **Consolidated Email Fulfillments:** To prevent email spam, the webhook handler will suppress individual ticket confirmation emails for bundle purchases and send a single consolidated confirmation email. Following the application's established conventions, this email will use a new default system template (e.g., `"Bundle Ticket Confirmation"`) created in the database and manageable under Communication Settings (with placeholders such as `{buyerName}`, `{bundleTitle}`, `{eventDetails}`, `{quantity}`, and `{amountPaid}`).
8. **Bundle Post-Purchase Immutability:** To avoid orphaned tickets, once a bundle has active purchases, its list of associated events is immutable, or updates must be run via a sync utility that cascades updates to existing purchases.
9. **Unified Admin UI:** The admin interface for managing and tracking bundles will be integrated directly into the existing Ticketing Dashboard ([TicketingView](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/TicketingView.tsx)) using a tabbed navigation structure:
    - **Concert Will Call:** Displays the check-in list for a selected performance. For any purchase linked to a bundle, a distinct badge (e.g., `[Season Ticket: 2026-2027 Season Pass]`) is rendered next to the buyer's name. Refunded bundle purchases are grayed out or hidden from active counts.
    - **Season Bundles:** A CRUD configuration hub for packages.
        - **List View:** Shows title, price, active toggle, capacity sold meter (e.g., `25/100 sold`), sale end date, and badges for included events.
        - **Create/Edit Modal:** Form capturing title, price, total capacity, customizable `saleEndDate` (defaults to 11:59 PM local timezone of the first concert), and multi-select checklist of ticketed events.
        - **Safe Validation Constraints:** Shows a warning banner and disables event selection if a bundle has active purchases (e.g., *"This bundle has active purchases. Included events are locked to prevent data drift"*).
    - **Bundle Orders:** Lists bundle sales chronologically (buyer name, email, purchase date, quantity, price paid, status). Contains a red **"Refund Bundle"** button that prompts a destructive action confirmation modal (`useDialog` danger variant) warning the admin:
        > [!CAUTION]
        > **Are you sure you want to refund this bundle purchase?**
        > This will issue a full Stripe refund and void all associated individual tickets on the Will Call lists. This action is permanent and cannot be undone.

## Consequences

**Positive:**
- **Zero changes to existing logic:** The Will Call UI, capacity calculations, and communication resolvers do not need to be rewritten to accommodate a new "Pass" entity. They continue to operate on standard `ticketPurchases`.
- **Clean Audit Trail:** Admins can see exactly how many people are attending an event, regardless of whether they bought a single ticket or a season ticket.

**Negative:**
- **Data Duplication:** A season ticket purchase generates multiple database rows (one per event) instead of just one. Given the scale of a community choir, this overhead is negligible.
- **Refund Inflexibility:** Admins cannot refund a buyer for a single missed concert within a season ticket package via the application. This is an acceptable trade-off for architectural simplicity.