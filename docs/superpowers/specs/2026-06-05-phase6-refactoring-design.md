# Design Spec: Phase 6 Style Refactoring (Singer Experience & Public Forms)

**Date:** 2026-06-05
**Topic:** Style Refactoring Phase 6
**Status:** DRAFT

## Goal
Eliminate static inline styles from singer-facing dashboards, public application forms (auditions, ticketing), and various administrative utility components. Transition these to modular Vanilla CSS files to ensure maintainability, responsiveness, and consistent branding.

## Architecture & Strategy

### 1. Modular CSS Files
We will introduce module-specific CSS files to keep the styling logic focused:
- `src/views/singer/SingerDashboard.css`: Styles for the singer-facing dashboard and event cards.
- `src/views/singer/Profile.css`: Styles for the singer profile edit view.
- `src/views/PublicForms.css`: Shared styles for public-facing forms like Auditions and Ticketing.
- `src/components/admin/RosterUtils.css`: Styles for Roster-related utility components like SingerLookupModal, RosterImportModal, and CheckInList.
- `src/components/LivePreview.css`: Styles for the message preview component.

### 2. Naming Convention
- **Singer Dashboard**: Prefix classes with `sd-` (e.g., `.sd-event-card`).
- **Profile**: Prefix classes with `prof-` (e.g., `.prof-avatar-wrap`).
- **Public Forms**: Prefix classes with `pub-` (e.g., `.pub-form-card`).
- **Roster Utils**: Prefix classes with `roster-ut-` (e.g., `.roster-ut-import-table`).
- **Live Preview**: Prefix classes with `preview-` (e.g., `.preview-phone-shell`).

### 3. Shared Utility Extraction
Common patterns such as glass-cards, centered loading states, and responsive grids will be standardized.

## Detailed Component Designs

### Singer Dashboard & Profile
- **`sd-glass-card`**: Implementation of the "glass-card" style used for dashboard widgets.
- **`sd-poll-item`**: Styles for the quick poll interactive elements.
- **`prof-notification-row`**: Layout for the notification preferences with toggles and labels.

### Public Forms (Ticketing & Auditions)
- **`pub-purchase-card`**: Stylized cards for ticket bundles and event listings.
- **`pub-success-icon`**: Large, centered success checkmark for transaction confirmation.
- **`pub-checkout-form`**: Consistent layout for checkout and application forms.

### Roster Utilities
- **`roster-ut-lookup-item`**: Styles for searchable list items in the lookup modal.
- **`roster-ut-import-progress`**: Styling for the import progress bar and status text.
- **`roster-ut-checkin-row`**: Compact, high-contrast rows for rehearsal check-in.

### Live Preview
- **`preview-email-frame`**: Styled container mimicking an email client header.
- **`preview-phone-shell`**: Visual representation of a mobile phone for SMS previews.

## Verification Plan
1. **Automated Verification**: `npm test` (specifically `test/codebaseIntegrity.test.ts`) must pass after removing files from the whitelist.
2. **Visual Verification**: Manual inspection of singer views and public transaction flows.
3. **Responsive Check**: Ensure public-facing forms remain mobile-friendly and accessible.
