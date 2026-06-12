# Donations View In-Line Summary Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the Donations dashboard by moving summary statistics into the History tab as an "in-line" responsive header and adding sticky filter persistence.

**Architecture:** 
- **View:** Refactor `DonationsView.tsx` to remove the Summary tab and integrate stats into the History view.
- **Persistence:** Use `safeLocalStorage` to keep the "Start Date" filter sticky across sessions.
- **Logic:** Drive summary stats from the `filteredDonations` memo for real-time updates.

**Tech Stack:** React (TypeScript), CSS, LocalStorage.

---

### Task 1: Filter Persistence and Logic Updates

**Files:**
- Modify: `src/views/admin/DonationsView.tsx`

- [ ] **Step 1: Implement sticky start date and dynamic summary calculations**

```typescript
// Inside DonationsView component:

// 1. Update initial state for startDate using safeLocalStorage
const [startDate, setStartDate] = useState(() => 
  safeLocalStorage.getItem('donations_view_filter_start_date') || ''
);

// 2. Update setStartDate to also save to localStorage
const handleSetStartDate = (val: string) => {
  setStartDate(val);
  if (val) {
    safeLocalStorage.setItem('donations_view_filter_start_date', val);
  } else {
    safeLocalStorage.removeItem('donations_view_filter_start_date');
  }
};

// 3. Update handleClearFilters
const handleClearFilters = () => {
  setSearchQuery('');
  setStartDate('');
  setEndDate('');
  safeLocalStorage.removeItem('donations_view_filter_start_date');
};

// 4. Derive summary stats from filteredDonations memo
const filteredStats = useMemo(() => {
  const active = filteredDonations.filter(d => d.status === 'paid');
  const total = active.reduce((acc, d) => acc + d.amountPaidCents, 0);
  const count = active.length;
  const avg = count > 0 ? total / count : 0;
  return { total, count, avg };
}, [filteredDonations]);
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/DonationsView.tsx
rtk git commit -m "feat: add sticky date filter and dynamic stats logic to donations view"
```

---

### Task 2: Layout Refactor (Tabs and Header)

**Files:**
- Modify: `src/views/admin/DonationsView.tsx`

- [ ] **Step 1: Remove Summary tab and refactor History header**

Remove the "Summary" tab button. Wrap filters and new stats into a `flex-responsive` card in the History tab.

```tsx
// Inside return block:

// 1. Remove Summary button from .donation-tabs
// 2. Update History tab content:

{activeTab === 'history' && (
  <>
    <AppCard className="donation-header-card flex-responsive">
      <div className="donation-filters-column">
        <div className="donation-search-row">
          <div className="donation-search-input-wrapper">
            <label className="text-label">Search</label>
            <input 
              type="text" 
              placeholder="Search name or email..." 
              className="donation-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="donation-date-input-wrapper">
            <label className="text-label">View From</label>
            <input 
              type="date" 
              className="donation-input"
              value={startDate}
              onChange={e => handleSetStartDate(e.target.value)}
            />
          </div>
          <div className="donation-date-input-wrapper">
            <label className="text-label">To</label>
            <input 
              type="date" 
              className="donation-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="donation-filter-actions">
             <button className="btn btn-ghost" onClick={handleClearFilters}>
               Reset
             </button>
          </div>
        </div>
      </div>

      <div className="donation-stats-column">
        <div className="donation-stats-inline">
          <div className="donation-stat-item">
            <span className="text-muted small uppercase bold">Donations</span>
            <span className="donation-stat-value">{filteredStats.count}</span>
          </div>
          <div className="donation-stat-item">
            <span className="text-muted small uppercase bold">Total Raised</span>
            <span className="donation-stat-value donation-color-primary">
              ${(filteredStats.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="donation-stat-item">
            <span className="text-muted small uppercase bold">Average</span>
            <span className="donation-stat-value">
              ${(filteredStats.avg / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard noPadding>
      {/* ... existing table ... */}
    </AppCard>
  </>
)}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/DonationsView.tsx
rtk git commit -m "refactor: consolidate donations summary into history view header"
```

---

### Task 3: CSS Styling

**Files:**
- Modify: `src/views/admin/Donations.css`

- [ ] **Step 1: Update styles for the responsive header and stats column**

```css
.donation-header-card {
  gap: var(--space-xl);
  align-items: flex-start;
}

.donation-filters-column {
  flex: 3;
  width: 100%;
}

.donation-stats-column {
  flex: 2;
  width: 100%;
  border-left: 1px solid var(--border);
  padding-left: var(--space-xl);
}

.donation-stats-inline {
  display: flex;
  justify-content: space-around;
  height: 100%;
  align-items: center;
}

.donation-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

@media (max-width: 1024px) {
  .donation-stats-column {
    border-left: none;
    border-top: 1px solid var(--border);
    padding-left: 0;
    padding-top: var(--space-md);
  }
  
  .donation-stats-inline {
    justify-content: flex-start;
    gap: var(--space-xl);
  }
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/Donations.css
rtk git commit -m "style: add responsive layout for donations header and inline stats"
```

---

### Task 4: Verification

- [ ] **Step 1: Run full verification suite**

Run: `rtk npx tsc -b && rtk npm run lint`

- [ ] **Step 2: Manual Check**
1. Navigate to `/admin/donations`.
2. Confirm the "Summary" tab is gone.
3. Set a "Start Date". Confirm stats update.
4. Reload the page. Confirm "Start Date" is still set and list is filtered.
5. Search for a name. Confirm stats update to reflect only that search result.

---

## Mobile-First Responsive Polish (Tailwind Conversion)

To support mobile-first experiences, eliminate horizontal scrolling, and resolve UI wrapping issues on mobile viewports:

### 1. Filter Deck Grid Configuration
* **Structure:** Set `grid-cols-1 md:grid-cols-4` for the primary grid container to stack components on mobile.
* **Date Row Flex Box:** Group the **From Date** and **To Date** inputs inside a single nested container `md:col-span-2 flex flex-row gap-4` using `flex-1 min-w-0` on children to guarantee a consistent horizontal spacing layout that shrinks dynamically without overlapping or touching on mobile screens.

### 2. Actions & Navigation Bar Layout
* **Action Buttons:** Compress button elements on small screens (Export CSV and Add Level) into compact icon-only styles using `hidden md:inline` on button texts and `px-3 md:px-6` padding rules to prevent tab title collision.
* **Tab Spacing:** Reduce spacing between tabs on mobile (`gap-3 md:gap-6`) to keep all navigation controls sitting cleanly on a single line.

### 3. Responsive History Views
* **Desktop View (`hidden md:block`):** Standard `<table>` with columns for Date, Donor, Email, Amount, Tribute, Status, and Actions.
* **Mobile View (`md:hidden`):** Card-based list view where each donation is a distinct block with clear status tags, donor info, tribute labels, and a full-width refund action button.

- [ ] **Step 3: Verification**
  * Confirm `rtk npm run build` compiles with zero TS/Vite compilation errors.
  * Confirm `rtk npm run lint` passes with zero errors on the modified DonationsView.tsx file.

