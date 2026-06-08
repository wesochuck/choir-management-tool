# Pending Checkout Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture "pending" records for Tickets, Bundles, and Donations immediately upon checkout initiation to enable administrative follow-up on abandoned carts.

**Architecture:** Update backend checkout endpoints to pre-save transaction records with `status: 'pending'` before redirecting to Stripe. Update the Stripe webhook to find and update these existing records.

**Tech Stack:** TypeScript, PocketBase (Goja VM), Stripe API.

---

### Task 1: Update Ticket Checkout Endpoint

**Files:**
- Modify: `pocketbase/pb_hooks_src/checkoutEndpoints.ts:180-205`

- [ ] **Step 1: Update `handleCreateTicketsSession` to pre-save the purchase record**

Modify the endpoint to create a `ticketPurchases` record before returning the session URL.

```typescript
    // ... inside handleCreateTicketsSession after createCheckoutSession call
    try {
        const session = createCheckoutSession(lineItems, metadata, email, successUrl, cancelUrl);
        
        // Pre-save pending record
        const profile = getOrCreatePatronProfile(email, name);
        const collection = $app.findCollectionByNameOrId("pbc_ticketPurchases_001");
        const record = new Record(collection, {
            event: eventId,
            profile: profile.id,
            buyerName: name,
            buyerEmail: email,
            quantity: qty,
            unitPriceCents: unitPriceCents,
            feeCents: feeCents,
            amountPaidCents: totalTicketsCents + feeCents,
            currency: "usd",
            stripeSessionId: session.id,
            status: "pending"
        });
        $app.save(record);

        return e.json(200, { url: session.url, sessionId: session.id });
    } catch (err: unknown) {
        // ...
```

- [ ] **Step 2: Commit**

```bash
rtk git add pocketbase/pb_hooks_src/checkoutEndpoints.ts
rtk git commit -m "feat(checkout): pre-save pending ticket purchase record"
```

---

### Task 2: Update Bundle Checkout Endpoint

**Files:**
- Modify: `pocketbase/pb_hooks_src/checkoutEndpoints.ts` (around `handleCreateBundleSession`)

- [ ] **Step 1: Update `handleCreateBundleSession` to pre-save the bundle purchase record**

```typescript
    // ... inside handleCreateBundleSession after createCheckoutSession call
    try {
        const session = createCheckoutSession(lineItems, metadata, email, successUrl, cancelUrl);

        // Pre-save pending record
        const profile = getOrCreatePatronProfile(email, name);
        const collection = $app.findCollectionByNameOrId("pbc_ticketPurchases_001");
        const record = new Record(collection, {
            bundle: bundleId,
            profile: profile.id,
            buyerName: name,
            buyerEmail: email,
            quantity: qty,
            unitPriceCents: bundle.get("priceCents"),
            feeCents: feeCents,
            amountPaidCents: totalBundleCents + feeCents,
            currency: "usd",
            stripeSessionId: session.id,
            status: "pending"
        });
        $app.save(record);

        return e.json(200, { url: session.url, sessionId: session.id });
    } catch (err: unknown) {
        // ...
```

- [ ] **Step 2: Commit**

```bash
rtk git add pocketbase/pb_hooks_src/checkoutEndpoints.ts
rtk git commit -m "feat(checkout): pre-save pending bundle purchase record"
```

---

### Task 3: Update Donation Checkout Endpoint

**Files:**
- Modify: `pocketbase/pb_hooks_src/checkoutEndpoints.ts` (around `handleCreateDonationSession`)

- [ ] **Step 1: Update `handleCreateDonationSession` to pre-save the donation record**

```typescript
    // ... inside handleCreateDonationSession after createCheckoutSession call
    try {
        const session = createCheckoutSession(lineItems, metadata, email, successUrl, cancelUrl);

        // Pre-save pending record
        const profile = getOrCreatePatronProfile(email, name);
        const collection = $app.findCollectionByNameOrId("pbc_donations_001");
        const record = new Record(collection, {
            amountPaidCents: amountCents,
            donorName: name,
            donorEmail: email,
            profile: profile.id,
            tributeType: tributeType,
            tributeName: tributeName,
            isAnonymous: isAnonymous,
            status: "pending",
            stripeSessionId: session.id
        });
        $app.save(record);

        return e.json(200, { url: session.url, sessionId: session.id });
    } catch (err: unknown) {
        // ...
```

- [ ] **Step 2: Commit**

```bash
rtk git add pocketbase/pb_hooks_src/checkoutEndpoints.ts
rtk git commit -m "feat(checkout): pre-save pending donation record"
```

---

### Task 4: Update Stripe Webhook Reconciliation

**Files:**
- Modify: `pocketbase/pb_hooks_src/checkoutEndpoints.ts` (inside `handleStripeWebhook`)

- [ ] **Step 1: Update Ticket path in webhook to find and update existing record**

Find the `if (paymentType === "ticket")` block.

```typescript
            // Idempotency & Reconciliation: Check if record exists
            let record: PocketBaseRecord;
            try {
                record = $app.findFirstRecordByFilter("ticketPurchases", "stripeSessionId = {:stripeSessionId}", { stripeSessionId });
                if (record.get("status") === "paid") {
                    return e.json(200, { success: true, message: "Duplicate event ignored" });
                }
                // Update existing pending record
                record.set("status", "paid");
                record.set("stripePaymentIntentId", session.payment_intent || "");
                record.set("stripeCustomerId", session.customer || "");
                record.set("fulfilledAt", new Date().toISOString());
            } catch {
                // Record not found, fallback to creation (existing logic)
                const profile = getOrCreatePatronProfile(metadata.buyerEmail || "", metadata.buyerName || "");
                const collection = $app.findCollectionByNameOrId("pbc_ticketPurchases_001");
                record = new Record(collection, {
                    event: eventId,
                    profile: profile.id,
                    buyerName: metadata.buyerName || "",
                    buyerEmail: metadata.buyerEmail || "",
                    quantity: quantity,
                    unitPriceCents: Number(metadata.unitPriceCents || 0),
                    feeCents: Number(metadata.feeCents || 0),
                    amountPaidCents: session.amount_total || 0,
                    currency: session.currency || "usd",
                    stripeSessionId: stripeSessionId,
                    stripePaymentIntentId: session.payment_intent || "",
                    stripeCustomerId: session.customer || "",
                    status: "paid",
                    marketingOptIn: metadata.marketingOptIn === "true",
                    fulfilledAt: new Date().toISOString()
                });
            }

            $app.save(record);
```

- [ ] **Step 2: Update Bundle path in webhook to find and update existing record**

Similar logic for `else if (paymentType === "bundle")`.

- [ ] **Step 3: Update Donation path in webhook to find and update existing record**

Similar logic for `else if (paymentType === "donation")`.

- [ ] **Step 4: Commit**

```bash
rtk git add pocketbase/pb_hooks_src/checkoutEndpoints.ts
rtk git commit -m "feat(checkout): update webhook to reconcile pending records"
```

---

### Task 5: Verification and Finalization

**Files:**
- Modify: `pocketbase/pb_hooks/main.pb.js` (generated)

- [ ] **Step 1: Regenerate hooks**

Run: `rtk npm run generate:pb-hooks`

- [ ] **Step 2: Run integrity checks**

Run: `rtk npm run check:pb-hooks`

- [ ] **Step 3: Commit final generated file**

```bash
rtk git add pocketbase/pb_hooks/main.pb.js
rtk git commit -m "chore(checkout): regenerate main.pb.js"
```
