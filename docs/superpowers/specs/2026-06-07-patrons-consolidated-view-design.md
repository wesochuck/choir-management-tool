# Design Spec: Patrons Consolidated View

**Date:** 2026-06-07
**Status:** Draft
**Topic:** Consolidating non-singer contact information (ticket buyers and donors) into a unified admin dashboard section.

## 1. Purpose & Goals
The choir admin currently lacks a central "CRM-style" view of community members who are not singers. This design introduces a "Patrons" section that consolidates ticket buyers and donors into a unified list, allowing for better relationship management and targeted communication.

### Goals:
- Provide a single list of all community supporters (donors and ticket buyers).
- Distinguish between "Singers" (active/idle roster members) and "Community Patrons" (non-singers).
- Enable multi-select "handoff" to the Communications tool for direct messaging.
- Maintain a clean Singer Roster by keeping non-singer patrons out of roster views.

## 2. Architecture: Unified Profile Model
We will use the existing `profiles` collection as the single source of truth for all individuals.

- **Singer:** A profile with a non-empty `voicePart`.
- **Patron:** A profile without a `voicePart` and without an `admin` role account.
- **Singing Patron:** A singer who also has purchase/donation history.

### Data Flow & Linking:
1. **Existing Data:** A migration will scan `ticketPurchases` and `donations`, finding or creating a `profile` record for each unique email.
2. **New Transactions:** Public checkout flows (tickets/donations) will automatically perform a "upsert" lookup on `profiles` by email.
3. **Implicit Filtering:**
    - `RosterView.tsx` continues to filter for `voicePart != ""`.
    - `PatronsView.tsx` filters for anyone with a linked record in `ticketPurchases` or `donations`.

## 3. Database Changes
### Collection: `ticketPurchases`
- Add `profile` (RelationField, single, optional, collection: `profiles`).

### Collection: `donations`
- Add `profile` (RelationField, single, optional, collection: `profiles`).

### Migration
- Create a forward migration `1719500000_link_patron_profiles.js`.
- **Logic:**
    - Iterate through unique emails in `ticketPurchases` and `donations`.
    - Find existing profile or create new one.
    - Update transaction records with the `profile` ID.

## 4. Proposed UI Components

### 4.1. Patrons Dashboard (`src/views/admin/PatronsView.tsx`)
- **Stats Summary:** Lifetime Value (Total $), Total Patrons count, New Patrons (last 30 days).
- **Search/Filters:**
    - Name/Email search.
    - Toggle: "Show Singers" vs "Hide Singers".
    - Filter by "Donor Level" (from settings).
- **Patrons Table:**
    - Columns: Name, Email, Type (Singer/Patron), Lifetime Giving, Total Tickets, Last Activity Date.
    - Checkbox selection for each row.
- **Bulk Action Bar:**
    - Appears when >= 1 item is selected.
    - Button: "Send Message to Selected".

### 4.2. Communication Tool Integration
- **Handoff:** Clicking "Send Message" redirects to `/admin/communications?recipientIds=id1,id2...`.
- **Service Update:** `recipientResolver.ts` will be updated to accept a list of explicit IDs, bypassing standard voice part/roster filters.

### 4.3. Profile Detail Update (`src/views/admin/ProfileView.tsx`)
- Add a "Patronage History" tab (visible to admins only).
- Lists linked `ticketPurchases` and `donations` for that specific profile.

## 5. Success Criteria
- [ ] Admins can see a consolidated list of 100% of ticket buyers and donors.
- [ ] Non-singer patrons do NOT appear in the Singer Roster.
- [ ] Admins can select 5 patrons and successfully land in the Communications compose window with those 5 pre-selected.
- [ ] Lifetime value correctly aggregates both ticket sales and donations for a single individual.

## 6. Implementation Phases
1. **Database Migration:** Add fields and backfill historical data.
2. **Service Layer:** Update `ticketService` and `donationService` to handle profile linking during checkout.
3. **Backend Resolver:** Update `recipientResolver.ts` for explicit ID targeting.
4. **Patrons View:** Build the new dashboard view and table.
5. **Admin Dashboard:** Add link to the new section.
6. **Profile View:** Add history tab.
