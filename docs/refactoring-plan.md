# Refactoring Plan: Split `checkoutEndpoints.ts` and `EventModal.tsx`

## 1. `checkoutEndpoints.ts` → Multi-file under `checkout/`

### Problem

Single 1315-line file containing 8 exported handler functions plus shared utilities. All code shares the same flat scope inside the PocketBase hook generator bundle. Hard to navigate, diff-prone, and discourages targeted testing.

### Strategy

Split into 10 files under `pocketbase/pb_hooks_src/checkout/`. 

To maintain standard type safety and prevent autocomplete/compilation errors in the IDE during development, **each file must declare standard TypeScript modules with `export function` and explicit relative imports** (e.g. `import { getTimezoneSetting } from './checkoutHelpers'`). 

At bundle-time, the generator's `stripModuleSyntaxSafely` utility will automatically strip all ES imports and export keywords, yielding a flat file with hoisted global declarations where cross-file references resolve perfectly.

The generator's bundle manifest (`UTILITY_BUNDLES` in `generate-main-pb-js.ts`) supports `files: string[]` — currently lists one file. We update it to list all 10 files.

### New file structure

```
pocketbase/pb_hooks_src/checkout/
  checkoutHelpers.ts          -- getOrCreatePatronProfile, getTimezoneSetting, getChoirNameSetting, getBaseUrl
  emailHelpers.ts             -- enqueueTicketConfirmationEmail, enqueueBundleTicketConfirmationEmail
  createTicketsSession.ts     -- handleCreateTicketsSession
  createBundleSession.ts      -- handleCreateBundleSession
  createDonationSession.ts    -- handleCreateDonationSession
  stripeWebhook.ts            -- handleStripeWebhook
  adminRefundTicket.ts        -- handleAdminRefundTicket
  adminRefundBundle.ts        -- handleAdminRefundBundle
  adminRefundDonation.ts      -- handleAdminRefundDonation
  adminResendConfirmation.ts  -- handleAdminResendTicketConfirmation
```

### What each file contains

#### `checkoutHelpers.ts` (~70 lines)

```ts
import { parseJsonField } from './email/hookJson';
import type { PocketBaseApp, PocketBaseRecord } from './email/emailTypes';

declare const $app: PocketBaseApp & {
  findAuthRecordByEmail(collectionName: string, email: string): PocketBaseRecord;
};
declare const $security: {
  hs256(payload: string, secret: string): string;
  equal(a: string, b: string): boolean;
  randomString(length: number): string;
};

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

function getOrCreatePatronProfile(email: string, name: string): PocketBaseRecord { ... }
function getTimezoneSetting(): string { ... }
function getChoirNameSetting(): string { ... }
function getBaseUrl(): string { ... }
```

Moves lines 1-113 from the original, minus the `TicketingRequestEvent` interface (only used by `stripeWebhook.ts`).

#### `emailHelpers.ts` (~175 lines)

```ts
import { parseJsonField } from './email/hookJson';
import { formatInTimezone } from './email/hookText';
import type { PocketBaseApp, PocketBaseRecord } from './email/emailTypes';
import { generateSignedTicketToken } from './hmacTokens';
import { coercePocketBaseDate } from './pocketbaseDate';

// declare $app, $security, Record (same pattern)

function enqueueTicketConfirmationEmail(options: { ... }): void { ... }
function enqueueBundleTicketConfirmationEmail(options: { ... }): void { ... }
```

Moves lines 115-288.

Uses `getTimezoneSetting`, `getChoirNameSetting`, `getBaseUrl` from `checkoutHelpers` — these are plain function calls resolved at concatenation time.

#### `createTicketsSession.ts` (~175 lines)

```ts
import { parseJsonField } from './email/hookJson';
import { formatInTimezone } from './email/hookText';
import { createCheckoutSession } from './stripeService';
import { coercePocketBaseDate } from './pocketbaseDate';

// declare $app, $security, Record, AppWithTransaction

function handleCreateTicketsSession(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 290-464.

#### `createBundleSession.ts` (~180 lines)

```ts
import { createCheckoutSession } from './stripeService';
import { coercePocketBaseDate } from './pocketbaseDate';

function handleCreateBundleSession(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 466-646.

#### `createDonationSession.ts` (~75 lines)

```ts
import { parseJsonField } from './email/hookJson';
import { createCheckoutSession } from './stripeService';

function handleCreateDonationSession(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 648-725.

#### `stripeWebhook.ts` (~390 lines)

```ts
import { parseJsonField } from './email/hookJson';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';

// declare $app, $security, Record, AppWithTransaction, GoHttpRequest

interface TicketingRequestEvent extends PocketBaseRequestEvent {
  request: GoHttpRequest;
}

declare function readerToString(reader: unknown, maxBytes?: number): string;

function handleStripeWebhook(e: TicketingRequestEvent): unknown { ... }
```

Moves lines 727-1117. Also moves the `TicketingRequestEvent`, `GoHttpRequest` interfaces and `readerToString` declaration (currently at lines 30-39 and line 17).

#### `adminRefundTicket.ts` (~35 lines)

```ts
import { refundPaymentIntent } from './stripeService';

function handleAdminRefundTicket(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 1119-1152.

#### `adminRefundBundle.ts` (~45 lines)

```ts
import { refundPaymentIntent } from './stripeService';

function handleAdminRefundBundle(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 1154-1198.

#### `adminRefundDonation.ts` (~35 lines)

```ts
import { refundPaymentIntent } from './stripeService';

function handleAdminRefundDonation(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 1200-1233.

#### `adminResendConfirmation.ts` (~80 lines)

```ts
function handleAdminResendTicketConfirmation(e: PocketBaseRequestEvent): unknown { ... }
```

Moves lines 1235-1315.

### Generator manifest change (`generate-main-pb-js.ts`)

```ts
checkoutEndpoints: {
  files: [
    'checkout/checkoutHelpers.ts',
    'checkout/emailHelpers.ts',
    'checkout/createTicketsSession.ts',
    'checkout/createBundleSession.ts',
    'checkout/createDonationSession.ts',
    'checkout/stripeWebhook.ts',
    'checkout/adminRefundTicket.ts',
    'checkout/adminRefundBundle.ts',
    'checkout/adminRefundDonation.ts',
    'checkout/adminResendConfirmation.ts',
  ],
  symbols: [
    'handleCreateTicketsSession',
    'handleStripeWebhook',
    'handleAdminRefundTicket',
    'handleCreateBundleSession',
    'handleAdminRefundBundle',
    'handleCreateDonationSession',
    'handleAdminRefundDonation',
    'handleAdminResendTicketConfirmation',
  ],
  dependsOn: [
    'stripeService',
    'hookText',
    'timezone',
    'hookJson',
    'hmacTokens',
    'ticketScanValidation',
    'pocketbaseDate',
  ],
},
```

### Verification

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

### Risk assessment

- **Low.** Pure file relocation and imports. No logic changes.
- The generator already supports `files: string[]` — it transpiles each file independently and concatenates the output. The `stripModuleSyntaxSafely` function removes import/export statements, leaving all declarations in shared scope. Since all functions use hoisted `function` keyword (not `const` lambdas), cross-file references resolve regardless of concatenation order.
- `TicketingRequestEvent` and `GoHttpRequest` move into `stripeWebhook.ts` (their only consumer), which is cleaner.
- The `readerToString` declaration moves into `stripeWebhook.ts`.
- The `AppWithTransaction` interface is used by both `stripeWebhook.ts` and `adminRefundBundle.ts` — it needs to be declared in each file (or extracted to a shared type declaration). Since TypeScript interfaces are erased at compile-time and don't appear in the transpiled JS output, duplication is safe.

---

## 2. `EventModal.tsx` → Extract `InlineVenueCreator` and `EventTicketsTab`

### Problem

1121-line component. Concerns mixed: core form state, venue creation (55 lines), ticketing config (250 lines), bulk rehearsal config, dirty detection, deletion workflow. Each tab panel is deep JSX nesting that's hard to navigate.

### Strategy

Extract two self-contained sub-components to separate files. After extraction, EventModal drops from 1121 → ~660 lines.

### New files

#### `src/components/admin/InlineVenueCreator.tsx` (~55 lines)

Props interface:

```ts
interface InlineVenueCreatorProps {
  isAddingNewVenue: boolean;
  newVenueName: string;
  setNewVenueName: (v: string) => void;
  newVenueRows: string;
  setNewVenueRows: (v: string) => void;
  newVenueAddress: string;
  setNewVenueAddress: (v: string) => void;
  isSavingVenue: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
}
```

Moves from EventModal:
- State: lines 138-142 (`isAddingNewVenue`, `newVenueName`, `newVenueRows`, `newVenueAddress`, `isSavingVenue`)
- Handler: `handleCreateVenueInline` (lines 238-278)
- Reset effect: lines 183-190 (resets venue state on close)
- JSX: lines 677-730 (the inline venue form section)

The `dialog` calls inside `handleCreateVenueInline` reference `useDialog()` — the component needs its own instance.

#### `src/components/admin/EventTicketsTab.tsx` (~250 lines)

Props interface:

```ts
interface EventTicketsTabProps {
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  initialData?: Event | null;
  isGraphicRemoved: boolean;
  graphicPreviewUrl: string;
  advancePriceInput: string;
  setAdvancePriceInput: (v: string) => void;
  dayOfPriceInput: string;
  setDayOfPriceInput: (v: string) => void;
  eventGraphicFile: File | null;
  setEventGraphicFile: (f: File | null) => void;
  setIsGraphicRemoved: (v: boolean) => void;
}
```

Moves from EventModal:
- Query: `hasPurchases` query (lines 116-123)
- JSX: lines 867-1116 (the entire `activeTab === 'tickets'` render block)
- Memo: `dayOfLiveText` calculation (lines 68-101) is moved **entirely inside `EventTicketsTab.tsx`** so that it calculates internally, eliminating `dayOfLiveText` as a prop.

*Note: The `advancePriceInput` and `dayOfPriceInput` states **must remain inside the parent `EventModal.tsx`** (passed down as props). Because `EventTicketsTab` is unmounted when switching tabs, declaring these string input states inside the child would result in partial typing state being lost on tab switches.*

This component imports `ticketService`, `queryKeys`, `pb`, `useQuery`, `Modal`, `Input`, `Textarea`, `Button`, `Select` — it has its own `useQuery` setup.

In EventModal, the control flow becomes:
```tsx
{formData.type === 'Performance' && activeTab === 'tickets' && (
  <EventTicketsTab
    formData={formData}
    setFormData={setFormData}
    initialData={initialData}
    graphicPreviewUrl={graphicPreviewUrl}
    advancePriceInput={advancePriceInput}
    setAdvancePriceInput={setAdvancePriceInput}
    dayOfPriceInput={dayOfPriceInput}
    setDayOfPriceInput={setDayOfPriceInput}
    eventGraphicFile={eventGraphicFile}
    setEventGraphicFile={setEventGraphicFile}
    isGraphicRemoved={isGraphicRemoved}
    setIsGraphicRemoved={setIsGraphicRemoved}
  />
)}
```

And the `hasPurchases` query is removed from EventModal (moved into EventTicketsTab).

### What stays in EventModal (~680 lines)

- Imports (shared between tabs): `React`, `useNavigate`, `useQuery` (for audition settings), `types`, `useDialog`, `Modal`, `Select`, `Button`, `Input`, `Textarea`, `pb`, `settingsService`, `queryKeys`, `useChoirSettings`, timezone utils
- Core state: `formData`, `eventGraphicFile`, `graphicPreviewUrl`, `isGraphicRemoved`, `shouldBulkAdd`, `bulkCount`, `bulkDay`, `bulkTime`, `bulkVenue`, `isSubmitting`, `titleInputRef`, `activeTab`, `isAddingNewVenue`, new venue state, `isSavingVenue`, `advancePriceInput`, `dayOfPriceInput`
- Effects: form init (lines 144-181), venue reset (lines 183-190), `bulkVenue` sync (lines 192-196), `graphicPreviewUrl` (lines 56-66)
- Memos: `startDate` (lines 198-212), `endTime` (lines 214-224), `isDirty` (lines 329-423)
- Handlers: `handleSubmit` (lines 280-327), `handleClose` (lines 425-439), `handleDelete` (lines 441-464)
- Audition check: lines 226-236
- Details tab JSX: lines 531-864 (title, type, date, duration, call time, RSVP toggle, venue, parent, details textarea, bulk rehearsal config)
- Modal shell: lines 466-530, 1117-1121

### Verification

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
```

### Risk assessment

- **Low.** Pure extraction with explicit props. No logic changes.
- `InlineVenueCreator` gets its own `useDialog()` call — the `showMessage` inside `handleCreateVenueInline` still works, just in a child component.
- The `hasPurchases` query moves into `EventTicketsTab` with the same `enabled` guard (`isOpen && !!initialData?.id`). The `isOpen` prop isn't passed — but `EventTicketsTab` is only rendered when the tab is active, which implies `isOpen` is true. Add `isOpen` to props if the query needs to stay lazy-gated on modal open state.
- `advancePriceInput` / `dayOfPriceInput` state is retained in parent `EventModal.tsx` to prevent text input state from resetting on tab unmounting.

---

## Implementation order

### Phase 1: `checkoutEndpoints.ts` split
1. Create `pocketbase/pb_hooks_src/checkout/` directory
2. Create 10 files with copied content (no logic changes)
3. Delete `pocketbase/pb_hooks_src/checkoutEndpoints.ts`
4. Update `UTILITY_BUNDLES['checkoutEndpoints']` in `generate-main-pb-js.ts`
5. Run `rtk npm run generate:pb-hooks && rtk npm run check:pb-hooks`

### Phase 2: `EventModal.tsx` extraction
1. Create `src/components/admin/InlineVenueCreator.tsx`
2. Create `src/components/admin/EventTicketsTab.tsx`
3. Update `EventModal.tsx` — remove extracted code, import and render new components
4. Run `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0`
