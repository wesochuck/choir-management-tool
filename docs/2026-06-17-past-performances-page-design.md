# Past Performances — Dedicated Page & Homepage Enhancement

## Overview

Add a dedicated paginated past performances page and refine the homepage past performances section.

## Changes

### 1. Event Service — `src/services/eventService.ts`

- **Add `getRecentPerformances(limit: number)`** — fetches `limit` most recent past performances. Same filter as `getPastPerformances` but parameterized by count.
- **Add `getPastPerformancesPaginated(page: number, perPage: number)`** — returns a paginated list of past performances. Returns `{ items, totalPages, totalItems }` instead of just items.
- **Remove `getPastPerformances()`** — replaced by the two methods above.

### 2. Homepage — `src/views/PublicLandingView.tsx`

- Call `getRecentPerformances(3)` instead of `getPastPerformances()`.
- Increase image height from `h-40` to `h-48` (taller cards).
- Maintain existing `md:grid-cols-2 lg:grid-cols-3` grid.
- Add "See All Past Performances →" link below the grid, pointing to `/performances`.

### 3. New View — `src/views/PublicPastPerformancesView.tsx`

- Route: `/performances`.
- Fetches paginated past performances via `getPastPerformancesPaginated(page, 12)`.
- 2-column grid: `md:grid-cols-2`.
- Image at `h-64` with `object-cover rounded`.
- Same card structure as homepage (title, date, venue, publicDetails, eventGraphic).
- Inline pagination via existing `Pagination` component at `src/components/common/Pagination.tsx` (`currentPage`, `totalPages`, `onPageChange`).
- Loading spinner, error state.
- Uses `PublicLayout` wrapper.

### 4. Routing — `src/App.tsx`

- Add lazy-loaded import for `PublicPastPerformancesView`.
- Add route: `<Route path="/performances" element={<PublicPastPerformancesView />} />`.

### 5. Navigation — `src/components/common/PublicLayout.tsx`

- Add "Performances" link (`to="/performances"`) in both desktop and mobile nav.
- Position between "Auditions" and "History".

### 6. Query Keys — `src/lib/queryKeys.ts`

- Add `queryKeys.events.pastPerformancesList = (page: number) => [...queryKeys.events.all, 'pastPerformances', page] as const` for the paginated page. The homepage continues using `queryKeys.events.publicList`.

### 7. Tests — `test/views/`

- Update `PublicLandingView.test.tsx` to mock `getRecentPerformances` instead of `getPastPerformances`.
- Add `PublicPastPerformancesView.test.tsx` — basic render test (loading, data, empty, error).

## Non-Goals

- No changes to admin views.
- No changes to the `events` collection schema.
- No changes to ticket-related views.
