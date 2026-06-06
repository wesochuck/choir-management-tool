# Design Spec: Phase 5 Style Refactoring (Admin Dashboards & Ticketing)

**Date:** 2026-06-05
**Topic:** Style Refactoring Phase 5
**Status:** DRAFT

## Goal
Eliminate inline styles from administrative dashboards, summary views, and ticketing interfaces. Transition these to modular Vanilla CSS files to ensure maintainability, responsiveness, and consistency.

## Architecture & Strategy

### 1. Modular CSS Files
We will introduce several module-specific CSS files to keep the styling logic focused:
- `src/views/admin/Dashboards.css`: Shared styles for Admin, RSVP, and Polls dashboards.
- `src/views/admin/Ticketing.css`: Styles for the ticketing dashboard, bundle management, and order tables.
- `src/views/admin/Venues.css`: Styles for venue templates and grid layout.
- `src/views/admin/Resources.css`: Styles for singer resource management and cards.
- `src/components/admin/PollSelectionModal.css`: Specific styles for the poll selection and creation modal.

### 2. Naming Convention
- **Dashboards**: Prefix classes with `db-` (e.g., `.db-stat-card`).
- **Ticketing**: Prefix classes with `ticket-` (e.g., `.ticket-order-table`).
- **Venues**: Prefix classes with `venue-` (e.g., `.venue-card-grid`).
- **Resources**: Prefix classes with `res-` (e.g., `.res-link-display`).
- **Poll Modal**: Prefix classes with `poll-sel-` (e.g., `.poll-sel-list-container`).

### 3. Shared Utility Extraction
Common patterns like standard form field containers or centered empty states will be standardized within their modules.

## Detailed Component Designs

### Dashboards (Admin, RSVP, Polls)
- **`db-view-container`**: Standard padding and gap for dashboard views.
- **`db-active-event-card`**: Styles for the "Active Event" summary area in the RSVP dashboard.
- **`db-poll-response-panel`**: Layout for the multi-column poll results view.
- **`db-empty-dashboard`**: Styled placeholder for dashboard views without data.

### Ticketing Module
- **`ticket-dashboard-header`**: Alignment for the ticketing view header and action buttons.
- **`ticket-stat-grid`**: Layout for the ticketing performance metrics (Sales, Revenue, etc.).
- **`ticket-order-table`**: Specific styling for the purchase and bundle tables, including refunded row opacities.
- **`ticket-bundle-form`**: Styles for the complex bundle creation/edit form.

### Venues & Resources
- **`venue-card-grid`**: Grid layout for venue/resource cards (`repeat(auto-fill, minmax(320px, 1fr))`).
- **`res-link-text`**: Text-body with `word-break: break-all` for resource links.

## Verification Plan
1. **Automated Verification**: `npm test` (specifically `test/codebaseIntegrity.test.ts`) must pass after removing files from the whitelist.
2. **Visual Verification**: Manual inspection of all dashboard and ticketing views to ensure no regressions in layout or visual hierarchy.
3. **Responsive Check**: Verify that the grid layouts and tables behave correctly on mobile and tablet devices.
