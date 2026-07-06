# Message Patrons (Donors & Ticket Buyers) — Implementation Plan

Enable admins to message Ticket Buyers and Donors from the Communications tool, including adding marketing consent tracking to the public donation flow.

---

## Proposed Changes

### Task 1: Add `marketingOptIn` to the `donations` Collection

#### [NEW] `pocketbase/pb_migrations/<timestamp>_add_donation_marketing_opt_in.js`

Run `date +%s` to get the timestamp, then create a migration to add `marketingOptIn` (boolean, default: `false`) to the `donations` collection. Follow the existing `BoolField` pattern from `1719000000_add_ticketing.js` (which added the same field to `ticketPurchases`).

#### [MODIFY] `pocketbase/pb_hooks_src/checkout/createDonationSession.ts`

- Read `marketingOptIn` from the request body: `const marketingOptIn = !!body.marketingOptIn;`
- Include it in Stripe metadata: `marketingOptIn: String(marketingOptIn)`
- Include it in the pre-saved pending record: `marketingOptIn: marketingOptIn`

#### [MODIFY] `pocketbase/pb_hooks_src/checkout/stripeWebhook.ts`

In the donation completion handler (around line 533):
- Read `marketingOptIn` from Stripe metadata: `const marketingOptIn = metadata.marketingOptIn === 'true';`
- When updating the existing pending record to paid, set `marketingOptIn` if not already set.
- In the fallback creation path (record not found), include `marketingOptIn` in the new `Record` constructor.

After hook source changes, run:
```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

#### [MODIFY] `src/services/donationService.ts`

Add `marketingOptIn: boolean` to the `DonationRecord` interface:
```ts
export interface DonationRecord extends RecordModel {
  // ... existing fields ...
  marketingOptIn: boolean;
}
```

---

### Task 2: Add Marketing Consent to the Public Donation Form

#### [MODIFY] `src/views/PublicDonationView.tsx`

Add a checkbox above the checkout button, following the same pattern used in `PublicTicketPurchaseView.tsx` (line 264-272):
```tsx
<label className="flex items-center gap-2 text-sm text-text-muted">
  <input
    type="checkbox"
    checked={marketingOptIn}
    onChange={(e) => setMarketingOptIn(e.target.checked)}
  />
  Send me updates about upcoming concerts and events.
</label>
```

- Add `const [marketingOptIn, setMarketingOptIn] = useState(false);`
- Pass `marketingOptIn` in the mutation payload to `donationService.createDonationSession()`:
  ```ts
  { amountCents, email, name, tributeType, tributeName, isAnonymous, marketingOptIn }
  ```

---

### Task 3: Add `targetAudiences` to the Communication Type System

#### [MODIFY] `src/services/communication/types.ts`

Add to `CommunicationFilters`:
```ts
export interface CommunicationFilters {
  eventId: string;
  rsvp: RsvpFilter;
  voiceParts: string[];
  globalStatus: string;
  profileIds?: string[];
  targetAudiences: ('Members' | 'Ticket Buyers' | 'Donors')[];
}
```

Non-member recipients use sentinel values matching the existing convention in `communicationService.resolveTicketBuyerRecipients`:
- `voicePart`: `'Ticket Buyer'` or `'Donor'` (not a real voice part, displayed as-is)
- `globalStatus`: `'Paid'` (not a real member status, distinguishes them in the UI)
- `phone`: `''` (not collected from patrons)

---

### Task 4: Create a Donor Resolver

#### [NEW] `src/services/communication/donorResolver.ts`

Following the existing pattern in `ticketBuyerResolver.ts`:

```ts
import { pb } from '../../lib/pocketbase';
import type { DonationRecord } from '../donationService';
import type { CommunicationRecipient } from './types';

export async function resolveDonors(
  optInOnly = false
): Promise<CommunicationRecipient[]> {
  let filter = "status = 'paid'";
  const params: { [key: string]: string | boolean } = {};
  if (optInOnly) {
    filter += ' && marketingOptIn = {:optIn}';
    params.optIn = true;
  }

  const donations = await pb.collection('donations').getFullList<DonationRecord>({
    filter: pb.filter(filter, params),
    sort: 'donorName',
  });

  const unique = new Map<string, CommunicationRecipient>();
  donations.forEach((d) => {
    if (!unique.has(d.donorEmail)) {
      unique.set(d.donorEmail, {
        id: d.id,
        name: d.donorName,
        email: d.donorEmail,
        phone: '',
        voicePart: 'Donor',
        globalStatus: 'Paid',
      });
    }
  });

  return Array.from(unique.values());
}
```

---

### Task 5: Update the Recipient Resolver to Aggregate Audiences

#### [MODIFY] `src/services/communication/recipientResolver.ts`

Add imports for the sub-resolvers:
```ts
import { resolveTicketBuyers } from './ticketBuyerResolver';
import { resolveDonors } from './donorResolver';
```

Update `resolveRecipients`:
- Default `targetAudiences` to `['Members']` if not set (backward-compatible).
- Run up to three parallel queries based on selected audiences (members via existing profile logic, ticket buyers via `resolveTicketBuyers()`, donors via `resolveDonors()`).
- Merge results, deduplicating by email. Prefer the member version of any duplicate (members have more complete data like voice part + phone).
- Apply the existing rules:
  - *Ticket Buyers with eventId:* query all buyers for that event (ignore `marketingOptIn` — transactional/emergency updates).
  - *Ticket Buyers without eventId:* query all past ticket buyers but require `marketingOptIn = true`.
  - *Donors:* always require `marketingOptIn = true` (no event-specific donation targeting).
- Members-only path is unchanged when `targetAudiences` is `['Members']`.

---

### Task 6: Update the Compose UI

#### [MODIFY] `src/views/admin/communications/useCommunicationDraft.ts`

**Default filter initialization** (line ~67): Add `targetAudiences: ['Members']` to the initial filter state:
```ts
const [filters, setFilters] = useState<CommunicationFilters>({
  eventId: routeState?.initialEventId || '',
  rsvp: 'All',
  voiceParts: [],
  globalStatus: 'Active',
  profileIds: initialProfileIds.length > 0 ? initialProfileIds : undefined,
  targetAudiences: ['Members'],
});
```

**Draft restoration** (`handleResumeDraft`, line ~159): Restore `targetAudiences` from the saved draft's filters:
```ts
targetAudiences: Array.isArray(mFilters?.targetAudiences)
  ? (mFilters.targetAudiences as CommunicationFilters['targetAudiences'])
  : ['Members'],
```

#### [MODIFY] `src/views/admin/communications/AudienceStep.tsx`

**Audience Type checkbox group** — add a prominent checkbox group at the top of the "Audience Filters" card, before the existing dropdowns:

```tsx
<div className="flex flex-col gap-2">
  <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
    Audience Types
  </label>
  <div className="flex flex-row flex-wrap gap-3">
    {(['Members', 'Ticket Buyers', 'Donors'] as const).map((audience) => (
      <label key={audience} className="flex items-center gap-1.5 text-sm text-text">
        <input
          type="checkbox"
          checked={filters.targetAudiences.includes(audience)}
          onChange={(e) => {
            const next = e.target.checked
              ? [...filters.targetAudiences, audience]
              : filters.targetAudiences.filter((a) => a !== audience);
            updateFilter('targetAudiences', next);
          }}
        />
        {audience}
      </label>
    ))}
  </div>
</div>
```

**Conditional filter visibility:**
- Hide "Voice Part / Section" and "Member Status" dropdowns if `Members` is not checked.
- Keep "Event Context" visible if `Members` or `Ticket Buyers` is checked.
- "RSVP Status" only applies to Members and should be hidden when Members is unchecked.

---

### Task 7: Update Query Keys

#### [MODIFY] `src/lib/queryKeys.ts`

The `resolvedRecipients` query key should include `targetAudiences`:
```ts
resolvedRecipients: (filters: CommunicationFilters) =>
  ['communications', 'resolvedRecipients', filters] as const,
```
Since `CommunicationFilters` now includes `targetAudiences`, this automatically changes the query key when audiences change, invalidating the cached query. No explicit change needed if the key is computed from the entire filters object.

---

### Task 8: Tests

#### Appended to `test/views/admin/communications/useCommunicationDraft.test.ts`

- Verify default `targetAudiences` is `['Members']` for new drafts.
- Verify `handleResumeDraft` restores `targetAudiences` from saved draft data.

#### [NEW] `test/services/communication/donorResolver.test.ts`

- `resolveDonors(true)` filters by `marketingOptIn = true`.
- `resolveDonors(false)` returns all paid donors.
- Dedeuplicates by email.
- Returns correct `CommunicationRecipient` shape with `voicePart: 'Donor'`, `globalStatus: 'Paid'`, `phone: ''`.

---

## Verification Plan

### PocketBase Hooks
```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

### Automated Tests
```bash
rtk npx vitest run test/views/admin/communications/useCommunicationDraft.test.ts
rtk npx vitest run test/services/communication/donorResolver.test.ts
```

### Manual Verification
- Verify the public donation form renders the marketing opt-in checkbox and passes the flag through to Stripe + PocketBase.
- Verify the Communications wizard's Audience step shows the three-audience checkbox group and conditionally hides/shows member-specific filters.
- Verify audience counts: select all three audiences with an event → check the total recipient count includes members + ticket buyers for that event + opt-in donors.
