# Patrons Consolidated View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate ticket buyers and donors into a unified "Patrons" dashboard with multi-select messaging capabilities.

**Architecture:** Use the existing `profiles` collection as a CRM for all contacts. Transactions (tickets/donations) will be linked to profiles via a new relation field. The Roster remains singer-focused, while the new Patrons view provides a community-wide perspective.

**Tech Stack:** React (TypeScript), PocketBase, CSS.

---

### Task 1: Database Migration - Profile Linking

**Files:**
- Create: `pocketbase/pb_migrations/1719500000_link_patron_profiles.js`

- [ ] **Step 1: Create the migration to add profile relations and backfill data**

```javascript
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  const donations = app.findCollectionByNameOrId("pbc_donations_001");
  const profiles = app.findCollectionByNameOrId("pbc_1687431683"); // profiles

  // 1. Add profile relation to ticketPurchases
  ticketPurchases.fields.add(new RelationField({
    name: "profile",
    collectionId: profiles.id,
    maxSelect: 1,
  }));
  app.save(ticketPurchases);

  // 2. Add profile relation to donations
  donations.fields.add(new RelationField({
    name: "profile",
    collectionId: profiles.id,
    maxSelect: 1,
  }));
  app.save(donations);

  // 3. Backfill profiles
  const emails = new Set();
  
  // Collect unique emails
  app.db().newQuery("SELECT buyerEmail as email, buyerName as name FROM ticketPurchases").all().forEach(r => emails.add(JSON.stringify({email: r.email, name: r.name})));
  app.db().newQuery("SELECT donorEmail as email, donorName as name FROM donations").all().forEach(r => emails.add(JSON.stringify({email: r.email, name: r.name})));

  emails.forEach(json => {
    const data = JSON.parse(json);
    let profile;
    try {
      profile = app.findFirstRecordByFilter("profiles", "expand.user.email = {:email}", { email: data.email });
    } catch (e) {
       // Search by name if email relation check is complex in migration context
       try {
         profile = app.findFirstRecordByFilter("profiles", "name = {:name}", { name: data.name });
       } catch (e2) {
         // Create new patron profile
         profile = new Record(profiles, {
           name: data.name,
           globalStatus: 'Active'
         });
         app.save(profile);
       }
    }

    // Link transactions
    app.db().newQuery("UPDATE ticketPurchases SET profile = {:pid} WHERE buyerEmail = {:email}").bind({ pid: profile.id, email: data.email }).execute();
    app.db().newQuery("UPDATE donations SET profile = {:pid} WHERE donorEmail = {:email}").bind({ pid: profile.id, email: data.email }).execute();
  });
}, (app) => {
  // Rollback fields
  const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  const donations = app.findCollectionByNameOrId("pbc_donations_001");
  
  ticketPurchases.fields.removeByName("profile");
  app.save(ticketPurchases);
  
  donations.fields.removeByName("profile");
  app.save(donations);
});
```

- [ ] **Step 2: Run migration check**

Run: `rtk npm run check:pb-hooks` (or equivalent to verify schema integrity)

- [ ] **Step 3: Commit**

```bash
rtk git add pocketbase/pb_migrations/1719500000_link_patron_profiles.js
rtk git commit -m "db: add profile relations to ticketing and donations"
```

---

### Task 2: Service Layer Updates - Auto-Linking

**Files:**
- Modify: `src/services/ticketService.ts`
- Modify: `src/services/donationService.ts`

- [ ] **Step 1: Update ticketService to link profiles on purchase**

In `src/services/ticketService.ts`, find the purchase creation logic (or mock the pattern if handled by hooks) and ensure the `profile` field is populated by looking up the email in the `profiles` collection.

- [ ] **Step 2: Update donationService to link profiles on donation**

In `src/services/donationService.ts`, ensure `createDonation` (if exists) or the public donation flow links the profile.

- [ ] **Step 3: Commit**

```bash
rtk git add src/services/ticketService.ts src/services/donationService.ts
rtk git commit -m "feat: link profiles during ticket and donation checkout"
```

---

### Task 3: Backend Resolver - Explicit Targeting

**Files:**
- Modify: `src/services/communication/recipientResolver.ts`
- Modify: `src/services/communication/types.ts`

- [ ] **Step 1: Add profileIds to CommunicationFilters type**

In `src/services/communication/types.ts`:
```typescript
export interface CommunicationFilters {
  // ... existing
  profileIds?: string[]; // New field
}
```

- [ ] **Step 2: Update resolveRecipients to handle explicit IDs**

In `src/services/communication/recipientResolver.ts`:
```typescript
export async function resolveRecipients(filters: CommunicationFilters): Promise<CommunicationRecipient[]> {
  if (filters.profileIds && filters.profileIds.length > 0) {
    const profiles = await pb.collection('profiles').getFullList<Profile>({
      filter: filters.profileIds.map(id => `id = "${id}"`).join(' || '),
      expand: 'user'
    });
    return profiles.map(profileToRecipient);
  }
  // ... rest of existing logic
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/services/communication/recipientResolver.ts src/services/communication/types.ts
rtk git commit -m "feat: support explicit profile ID targeting in recipient resolver"
```

---

### Task 4: Patrons Dashboard View

**Files:**
- Create: `src/views/admin/PatronsView.tsx`
- Create: `src/views/admin/PatronsView.css`

- [ ] **Step 1: Implement PatronsView with selection and handoff**

The view should:
1. Fetch all profiles that have either a ticket purchase or a donation.
2. Calculate lifetime value (LTV).
3. Provide checkboxes for multi-select.
4. "Send Message" button redirects to `/admin/communications?recipientIds=id1,id2`.

- [ ] **Step 2: Create CSS for PatronsView**

Ensure consistent styling with `RosterView` and `AdminDashboardView`.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/PatronsView.tsx src/views/admin/PatronsView.css
rtk git commit -m "feat: add Patrons dashboard view with multi-select messaging"
```

---

### Task 5: Admin Dashboard Integration

**Files:**
- Modify: `src/views/admin/AdminDashboardView.tsx`

- [ ] **Step 1: Add Patrons link to the dashboard**

```typescript
const dashboardSections = [
  {
    title: "People & membership",
    dotColor: "var(--section-green)",
    links: [
      { to: '/admin/roster', icon: '👥', iconClass: 'ic-green', label: 'Manage Roster', desc: 'Add singers and track status' },
      { to: '/admin/patrons', icon: '🌟', iconClass: 'ic-sage', label: 'Patrons', desc: 'Consolidated view of donors and ticket buyers' }, // New link
      // ...
    ]
  },
  // ...
]
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/AdminDashboardView.tsx
rtk git commit -m "feat: add Patrons section to admin dashboard"
```

---

### Task 6: Profile History Tab

**Files:**
- Modify: `src/views/admin/ProfileView.tsx`

- [ ] **Step 1: Add Patronage History tab to ProfileView**

Show a list of ticket purchases and donations linked to this profile.

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/ProfileView.tsx
rtk git commit -m "feat: add patronage history tab to profile view"
```
