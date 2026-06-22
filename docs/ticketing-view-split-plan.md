# TicketingView Split Plan (Reviewed & Updated)

**File**: `src/views/admin/TicketingView.tsx` (1926 lines)

## Strategy

Extract each tab and modal into its own file under `src/views/admin/ticketing/`, each owning its own TanStack Query calls. Zero prop drilling between parent and tab components — queries are deduplicated by cache key.

## Extracted Files

| File | Source lines | Owns |
|---|---|---|
| `TicketingWillCallTab.tsx` | 370 | Performance selector, stats cards, search/sort, will call DataTable, refund/resend mutations, inline mobile cards, CSV export button |
| `TicketingBundlesTab.tsx` | 300 | Bundle listing DataTable, bundle CRUD mutations, inline mobile cards, Create New Bundle button, Form modal instance |
| `TicketingOrdersTab.tsx` | 100 | Bundle orders DataTable, refund mutation, inline mobile cards, resend modal instance |
| `TicketingShareTab.tsx` | 90 | QR/share links for storefront, concerts, bundles |
| `TicketingConfirmationSettings.tsx` | 120 | Confirmation page text editor (almost already standalone) |
| `BundleFormModal.tsx` | 160 | Bundle create/edit modal form (owns all form state, event list query) |
| `ResendConfirmationModal.tsx` | 65 | Resend ticket confirmation modal (owns email field, resend mutation) |

## Remaining `TicketingView.tsx` (~80 lines)

- `activeTab` state + `setActiveTab`
- `AdminPageHeader` + `AdminPageTabs` (tabs only, no tab-specific actions)
- Static header actions (`Scan Tickets` button)
- Conditional rendering of the 5 tab components

## Query Ownership

Each tab re-uses `queryKeys.ticketing.*` keys so TanStack Query deduplicates:

- **TicketingWillCallTab**: `events()`, `purchasesByEvent()`, `allPurchases()`, `timezone()`, `missingEvents()`
- **TicketingBundlesTab**: `bundles()`, `allPurchases()`, `events()`, `timezone()`
- **TicketingOrdersTab**: `allPurchases()`, `bundles()`, `events()`, `timezone()`
- **TicketingShareTab**: `events()`, `bundles()`, `logoUrl`, `timezone()`
- **TicketingConfirmationSettings**: `confirmationPage()`
- **BundleFormModal**: `events()`, `timezone()`
- **ResendConfirmationModal**: none

*Note on query harmonization:* Both `purchasesByEvent(eventId)` and `allPurchases()` must use the same `refetchInterval: 3000` configuration across all tabs to prevent scheduling duplicate parallel requests.

## Action Buttons Placement (Zero Prop Drilling)

In the original layout, action buttons (`Create New Bundle` and `Export Will Call CSV`) were placed in the parent's `AdminPageTabs` actions slot. To achieve zero prop drilling, these buttons are moved directly into their respective tab layouts:
1. **`Create New Bundle`**: Placed at the top right of the "Season Bundles Configuration" card in `TicketingBundlesTab`.
2. **`Export Will Call CSV`**: Placed next to the "Select Performance" dropdown in `TicketingWillCallTab`.
3. **`Scan Tickets`**: Stays in the main header actions of `TicketingView` as it is a static route link.

## Mutations

Moved alongside their consumers:

- **TicketingWillCallTab**: `refundMutation`, `resendConfirmationMutation`
- **TicketingBundlesTab**: `saveBundleMutation`, `deleteBundleMutation`
- **TicketingOrdersTab**: `refundBundleMutation`
- **TicketingConfirmationSettings**: `saveMutation`
- **ResendConfirmationModal**: `resendConfirmationMutation`

## Invariant Checksum

- `fetchMissingTicketingEvents` moves with `TicketingWillCallTab` (only consumer)
- `getBundleSoldQty` moves with `TicketingBundlesTab` (used by bundles tab only)
- `sortPurchases`, `filteredPurchases` move with `TicketingWillCallTab`
- `bundleOrders` moves with `TicketingOrdersTab`
- All handler functions move with their respective tabs
- All column definitions move with their respective tabs
- Resend modal references a `TicketPurchase`-shaped object from orders tab — the fake-object cast stays

## Order of Execution

1. `TicketingConfirmationSettings.tsx`
2. `ResendConfirmationModal.tsx`
3. `BundleFormModal.tsx`
4. `TicketingWillCallTab.tsx`
5. `TicketingBundlesTab.tsx`
6. `TicketingOrdersTab.tsx`
7. `TicketingShareTab.tsx`
8. Simplify `TicketingView.tsx` to the tab switcher and imports
