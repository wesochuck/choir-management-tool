# Ticketing System Donation Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone donation feature to the ticketing system, including a public donation page, administrative management for giving history and donor levels, and Stripe integration.

**Architecture:** 
- **Database:** A new `donations` collection for tracking payments and tribute info.
- **Backend:** New API endpoints for creating donation sessions and processing refunds, with webhook updates for fulfillment.
- **Frontend:** A public `/donate` route and an admin `/admin/donations` dashboard that mirrors the ticketing UI.

**Tech Stack:** PocketBase (Migrations & JS Hooks), React (TypeScript), Stripe API.

---

### Task 1: Database Migration

**Files:**
- Create: `pocketbase/pb_migrations/1719300000_add_donations_collection.js`

- [ ] **Step 1: Create the migration file**

```javascript
migrate((app) => {
  // 1. Create donations collection
  const donations = new Collection({
    id: "pbc_donations_001",
    name: "donations",
    type: "base",
    system: false,
    listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    createRule: null, 
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    fields: [
      { name: "amountPaidCents", type: "number", required: true },
      { name: "donorName", type: "text", required: true },
      { name: "donorEmail", type: "text", required: true },
      { name: "tributeType", type: "select", values: ["none", "memory", "honor"] },
      { name: "tributeName", type: "text" },
      { name: "isAnonymous", type: "bool", defaultValue: false },
      { name: "status", type: "select", values: ["paid", "pending", "refunded"] },
      { name: "stripeSessionId", type: "text" },
      { name: "stripePaymentIntentId", type: "text" },
      // MANDATORY timestamp fields
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_donations_stripeSessionId` ON `donations` (`stripeSessionId`)"]
  });
  app.save(donations);

  // 2. Create Donation Receipt template
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  const template = new Record(templates, {
    title: "Donation Receipt",
    subject: "Thank you for your donation to {choirName}!",
    content: "Dear {donorName},\n\nThank you so much for your generous donation of ${amountPaid} to {choirName}.\n\n{tributeSection}\n\nYour support helps us continue to share music with our community.\n\nWarmly,\n{choirName}",
    type: "Email",
    isSystemTemplate: true
  });
  app.save(template);

  // 3. Initialize donation settings
  const settings = app.findCollectionByNameOrId("appSettings");
  const donationSettings = new Record(settings, {
    key: "donation_settings",
    isPublic: true,
    value: JSON.stringify({
      levels: [
        { id: "level-1", label: "Friend", amount: 25, benefit: "Mention in program" },
        { id: "level-2", label: "Supporter", amount: 50, benefit: "Mention in program" },
        { id: "level-3", label: "Patron", amount: 100, benefit: "Priority seating" },
        { id: "level-4", label: "Benefactor", amount: 250, benefit: "Invitation to VIP reception" }
      ]
    })
  });
  app.save(donationSettings);
}, (app) => {
  // Down migration
  try {
    const donations = app.findCollectionByNameOrId("pbc_donations_001");
    app.delete(donations);
  } catch (e) {}
  
  try {
    const template = app.findFirstRecordByFilter("pbc_templates_001", "title = 'Donation Receipt'");
    app.delete(template);
  } catch (e) {}

  try {
    const setting = app.findFirstRecordByFilter("appSettings", "key = 'donation_settings'");
    app.delete(setting);
  } catch (e) {}
});
```

- [ ] **Step 2: Commit**

```bash
rtk git add pocketbase/pb_migrations/1719300000_add_donations_collection.js
rtk git commit -m "db: add donations collection and settings"
```

---

### Task 2: Backend Stripe Integration

**Files:**
- Modify: `pocketbase/pb_hooks_src/checkoutEndpoints.ts`
- Modify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`

- [ ] **Step 1: Implement `handleCreateDonationSession` and update Webhook**
- [ ] **Step 2: Implement `handleAdminRefundDonation`**
- [ ] **Step 3: Register new routes**
- [ ] **Step 4: Run generation and verification**
- [ ] **Step 5: Commit**

---

### Task 3: Frontend Donation Service

**Files:**
- Create: `src/services/donationService.ts`

- [ ] **Step 1: Implement `donationService`**
- [ ] **Step 2: Commit**

---

### Task 4: Admin Donations Dashboard

**Files:**
- Create: `src/views/admin/DonationsView.tsx`
- Modify: `src/views/admin/AdminDashboardView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `DonationsView.tsx`**
- [ ] **Step 2: Add "Donations" card to `AdminDashboardView.tsx`**
- [ ] **Step 3: Register route in `App.tsx`**
- [ ] **Step 4: Commit**

---

### Task 5: Public Donation Page and Integration

**Files:**
- Create: `src/views/PublicDonationView.tsx`
- Modify: `src/views/PublicTicketListView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement `PublicDonationView.tsx`**
- [ ] **Step 2: Add Donation CTA to `PublicTicketListView.tsx`**
- [ ] **Step 3: Register public route in `App.tsx`**
- [ ] **Step 4: Commit**

---

### Task 6: Verification

- [ ] **Step 1: Run full verification suite**
- [ ] **Step 2: Manual Check**
