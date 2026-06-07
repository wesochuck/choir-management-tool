# Donations View In-Line Summary Refactor - Design Doc

**Goal:** Consolidate the Donations dashboard by moving summary statistics into the History tab as an "in-line" responsive header, mirroring the Ticketing dashboard, and adding sticky filter persistence.

## 1. UI Refactor

### Tab Layout
*   **Remove:** The "Summary" tab and associated conditional block.
*   **Update:** The "History" tab will now be the primary landing view.

### Consolidated Header Card
*   **Location:** Top of the "History" tab, above the results table.
*   **Component:** A `flex-responsive` card container.
*   **Left Column (Filters):**
    *   Search Input (Name/Email).
    *   Start Date Picker (label: "View From").
    *   End Date Picker (label: "To").
    *   "Clear Filters" button.
*   **Right Column (Live Stats):**
    *   **Donation Count:** Number of records matching active filters.
    *   **Total Raised:** Sum of `amountPaidCents` for records matching active filters.
    *   **Average Donation:** `Total Raised / Count`.

## 2. Filter Persistence (Sticky Logic)

### Behavior
*   The **Start Date** filter will persist between sessions for the individual admin user.
*   **Default:** If no saved date is found, show all donations.
*   **Storage:** Use `localStorage` via the `safeLocalStorage` utility.
*   **Key:** `donations_view_filter_start_date`.

### Interaction
*   Updating the "Start Date" picker immediately saves the value to storage.
*   Clicking "Clear Filters" or "Reset" removes the value from storage.

## 3. Data Logic

### Calculation Scope
*   Stats are derived from the `filteredDonations` memo.
*   `filteredDonations` will remain context-aware, filtering by search query and the (potentially sticky) date range.

## 4. Verification Plan

### Manual Verification
1.  Navigate to `/admin/donations`. Verify the "Summary" tab is gone.
2.  Set a "Start Date". Verify the "Total Raised" stat updates to only include donations after that date.
3.  Refresh the page. Verify the "Start Date" remains set and the list/stats are still filtered.
4.  Clear the filters. Verify the stat returns to all-time totals and the "Start Date" input is empty.
5.  Search for a donor. Verify stats update to reflect only that donor's contributions.
