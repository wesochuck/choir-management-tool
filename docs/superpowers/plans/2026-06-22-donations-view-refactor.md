# DonationsView Refactoring Plan

> **Goal:** Reduce `src/views/admin/DonationsView.tsx` from ~970 lines to ~450 lines by extracting UI components, business logic hooks, and aligning write operations with the codebase's `useMutation` convention.

**Current state:** DonationsView is the 3rd largest view in the app. It already uses TanStack Query for reads (`useQuery`) and DataTable for the history table, but its 4 write paths (`handleRefund`, `handleSavePublicSettings`, `handleSaveLevel`, `handleDeleteLevel`) are raw service calls + manual `queryClient.invalidateQueries` — inconsistent with the rest of the codebase which wraps writes in `useMutation`. Level CRUD state (7 `useState` calls) and all JSX are inline.

---

## File Structure

### New files

| File | Responsibility | Est. Lines |
|------|---------------|------------|
| `src/views/admin/donations/DonationStatsCards.tsx` | 3 stat cards (count, total, avg) | ~90 |
| `src/views/admin/donations/DonationFilters.tsx` | Search + date range + sort + clear | ~75 |
| `src/views/admin/donations/DonationMobileCard.tsx` | Mobile card renderer for DataTable | ~70 |
| `src/views/admin/donations/PortalConfigCard.tsx` | Button text + description form + save | ~55 |
| `src/views/admin/donations/DonorLevelGrid.tsx` | Level cards grid (or empty state) | ~80 |
| `src/views/admin/donations/DonorLevelModal.tsx` | CRUD modal form (label, amount, benefit) | ~70 |
| `src/views/admin/donations/useDonationFilters.ts` | Filter/sort state + `useMemo` derived data | ~70 |
| `src/views/admin/donations/useDonationLevels.ts` | Level CRUD `useMutation`s + modal state | ~70 |
| `src/views/admin/donations/donationColumns.ts` | `ColumnDef<DonationRecord>[]` array | ~60 |

### Modified files

| File | Change |
|------|--------|
| `src/views/admin/DonationsView.tsx` | Strip inline JSX/hooks/columns; compose from extracts | ~970→~450 |
| `src/components/ui/index.ts` | Ensure all needed UI components are exported (check) |
| `src/lib/queryKeys.ts` | Potentially add donations-specific invalidation helpers |

---

## Step-by-step Implementation

### Step 1: Extract `useDonationFilters` hook — ~70 lines saved

Create `src/views/admin/donations/useDonationFilters.ts`:

- Move filter state (`searchQuery`, `startDate`, `endDate`, `sortBy`)
- Move `handleSetStartDate`, `handleClearFilters`
- Move `filteredDonations` `useMemo` (search + date filter)
- Move `sortedDonations` `useMemo` (sort logic)
- Move `filteredStats` `useMemo` (count, total, avg)
- Return `{ searchQuery, setSearchQuery, startDate, setStartDate: ..., endDate, setEndDate, sortBy, setSortBy, handleClearFilters, filteredDonations: ..., sortedDonations, filteredStats }`
- Keep `safeLocalStorage` and `STORAGE_KEY_START_DATE` inside the hook

### Step 2: Extract `useDonationLevels` hook + migrate to `useMutation` — ~70 lines saved

Create `src/views/admin/donations/useDonationLevels.ts`:

- Move modal state: `isModalOpen`, `editingLevel`, `levelLabel`, `levelAmount`, `levelBenefit`
- Move `openLevelModal`, `setIsModalOpen`
- Create `saveSettingsMutation = useMutation(...)` — calls `donationService.saveDonationSettings`
- Create `saveLevelMutation` that calls `saveSettingsMutation.mutateAsync` with the updated levels array
- Create `deleteLevelMutation` using the same pattern
- Note: Keep `onSuccess` and `onError` handling at the call sites using `mutateAsync` with `try/catch` per `AGENTS.md`.
- Return `{ isModalOpen, editingLevel, levelLabel, setLevelLabel, levelAmount, setLevelAmount, levelBenefit, setLevelBenefit, openLevelModal, closeModal, saveLevelMutation, deleteLevelMutation, settings, saving: saveSettingsMutation.isPending }`

### Step 3: Extract `handleRefund` to `useMutation` in the view (or keep inline in a small hook)

The refund path is simple enough to stay as a `useMutation` directly in the view. Note that per `AGENTS.md`, user-triggered actions should keep error handling at the call site using `mutateAsync` instead of putting it in the mutation's `onError`.

```ts
const refundMutation = useMutation({
  mutationFn: (donationId: string) => donationService.adminRefundDonation(donationId),
});

// inside the component:
const handleRefund = async (id: string) => {
  if (!await dialog.confirm({ ... })) return;
  
  try {
    dialog.showToast('Processing refund...');
    await refundMutation.mutateAsync(id);
    dialog.showToast('Refund processed successfully.');
    queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
  } catch {
    await dialog.showMessage({ ... });
  }
};
```

This follows the exact pattern from `TicketingWillCallTab.tsx:84`.

### Step 4: Extract `DonationStatsCards` — ~85 lines saved

Create `src/views/admin/donations/DonationStatsCards.tsx`:

- Accept `{ count, totalCents, avgCents }: { count: number; totalCents: number; avgCents: number }` (no timezone needed)
- Render 3 stat cards (identical structure, different colors/icons)
- Format monetary values inline

### Step 5: Extract `DonationFilters` — ~68 lines saved

Create `src/views/admin/donations/DonationFilters.tsx`:

- Accept `{ searchQuery, onSearchChange, startDate, onStartDateChange, endDate, onEndDateChange, sortBy, onSortChange, onClear, hasActiveFilters }`
- Render filter deck grid (search, date range, sort, clear button)
- Pass through slot/prefix for search icon

### Step 6: Extract `DonationMobileCard` — ~65 lines saved

Create `src/views/admin/donations/DonationMobileCard.tsx`:

- Accept `{ donation: DonationRecord; timezone: string; onRefund: (id: string) => void }`
- Move the full `renderMobileCard` callback from DataTable
- Handle anonymous badge, tribute display, refund button

### Step 7: Extract `donationColumns` — ~60 lines saved

Create `src/views/admin/donations/donationColumns.ts`:

- Export `createDonationColumns(timezone: string, onRefund: (id: string) => void): ColumnDef<DonationRecord>[]`
- Re-create the same column defs with `onRefund` callback

### Step 8: Extract `PortalConfigCard` — ~40 lines saved

Create `src/views/admin/donations/PortalConfigCard.tsx`:

- Accept `{ buttonText, onButtonTextChange, description, onDescriptionChange, onSave, isSaving }`
- **CRITICAL:** Fix the "draft wiping" bug. Initialize local draft state only once (using a `useRef` to gate initialization) so that background query refetches do not overwrite unsaved user typing.
- Render portal config card with CTA heading, description textarea, save button
- Loading spinner inside button when saving

### Step 9: Extract `DonorLevelGrid` — ~80 lines saved

Create `src/views/admin/donations/DonorLevelGrid.tsx`:

- Accept `{ levels: DonationLevel[]; onEdit: (l: DonationLevel) => void; onDelete: (id: string) => void; onAdd: () => void }`
- Render info notice panel
- Render grid of level cards or empty state
- Render edit/delete buttons per level card

### Step 10: Extract `DonorLevelModal` — ~57 lines saved

Create `src/views/admin/donations/DonorLevelModal.tsx`:

- Accept `{ isOpen, onClose, editingLevel, label, onLabelChange, amount, onAmountChange, benefit, onBenefitChange, onSave, isSaving }`
- Render Modal with form fields (label, amount, benefit)
- Cancel + Save footer with loading state

### Step 11: Rewrite `DonationsView.tsx`

After all extractions, the view becomes a composition:

```tsx
export default function DonationsView() {
  const timezone = useChoirSettings().timezone;
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<'history' | 'levels'>('history');
  useDocumentTitle('Donations');

  // Queries
  const donationsQuery = useQuery({ queryKey: queryKeys.donations.paid, ... });
  const settingsQuery = useQuery({ queryKey: queryKeys.donations.settings, ... });
  const loading = donationsQuery.isLoading || settingsQuery.isLoading;

  // Derived state
  const { searchQuery, setSearchQuery, ... sortedDonations, filteredStats, ... } = useDonationFilters(donationsQuery.data ?? []);

  // Mutations
  const refundMutation = useMutation({ ... });  // inline, small

  // Level CRUD
  const { isModalOpen, editingLevel, ..., openLevelModal, ... } = useDonationLevels(settingsQuery.data);

  // handleRefund wrapper for the mutation
  const handleRefund = async (id: string) => {
    if (!await dialog.confirm({ ... })) return;
    refundMutation.mutate(id);
  };

  // handleExportCSV stays inline (~50 lines) — it's a pure data transform, no state

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader title="Donations & Giving" ... />
      <TabGroup value={activeTab} onTabChange={...}>
        <Tab panel="history">Donation History</Tab>
        <Tab panel="levels">Tiers & Page Settings</Tab>

        <TabPanel name="history">
          <div className="flex flex-col gap-6">
            <DonationStatsCards count={filteredStats.count} totalCents={filteredStats.total} avgCents={filteredStats.avg} />
            <AppCard noPadding>
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-800">Donations Register</h3>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <DonationFilters ... />
                <DataTable
                  columns={donationColumns(timezone, handleRefund)}
                  data={sortedDonations}
                  isLoading={loading}
                  emptyState={{ ... }}
                  pageSize={25}
                  paginationLabel="donations"
                  renderMobileCard={(d) => <DonationMobileCard donation={d} timezone={timezone} onRefund={handleRefund} />}
                />
              </div>
            </AppCard>
          </div>
        </TabPanel>

        <TabPanel name="levels">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <PortalConfigCard ... />
            <DonorLevelGrid levels={settings?.levels ?? []} onEdit={openLevelModal} onDelete={...} onAdd={() => openLevelModal()} />
          </div>
        </TabPanel>
      </TabGroup>

      <DonorLevelModal ... />
    </div>
  );
}
```

Estimated final size: ~150 lines of imports + ~300 lines of composition = **~450 lines**.

---

## Verification

| Check | Command |
|-------|---------|
| ESLint (no new warnings) | `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/views/admin/donations/ src/views/admin/DonationsView.tsx` |
| TypeScript | `rtk npx tsc --noEmit` (or confirm build passes) |
| Tests | `rtk npx vitest run src/views/admin/donations/` (if any created) |

---

## Risk Assessment

- **No data model changes.** This is purely structural — no schema, service, or query key changes.
- **`useMutation` migration of `handleSavePublicSettings`, `handleSaveLevel`, `handleDeleteLevel`** changes error handling from try/catch to mutation `onError`. Behavior should be identical; confirm with the existing pattern.
- **`handleExportCSV` stays inline** (~30 lines, pure data transform). Not worth extracting.
- **Barrel exports** — verify `src/components/ui/index.ts` exports `FormField`, or import directly.
- **No generated files affected.**
- **No test changes needed** unless we add tests for the new hooks/components.
