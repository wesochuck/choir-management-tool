# Design Spec: Phase 4 Style Refactoring (Library & Comms Dashboards)

**Date:** 2026-06-05
**Topic:** Style Refactoring Phase 4
**Status:** DRAFT

## Goal
Eliminate inline styles from complex tabular and workflow dashboards, specifically Communications, Music Library, Roster, Auditions, and Reports. Transition these to modular Vanilla CSS files to ensure maintainability, responsiveness, and consistency.

## Architecture & Strategy

### 1. Modular CSS Files
Instead of further bloating `admin.css`, we will introduce module-specific CSS files:
- `src/views/admin/communications/Communications.css`
- `src/views/admin/music-library/MusicLibrary.css`
- `src/views/admin/Roster.css`
- `src/views/admin/Auditions.css`
- `src/views/admin/Reports.css`

These files will be imported directly into their respective main view components.

### 2. Naming Convention
- **Communications**: Prefix classes with `comm-` (e.g., `.comm-compose-field`).
- **Music Library**: Prefix classes with `ml-` (e.g., `.ml-table-row`).
- **Roster**: Prefix classes with `roster-` (e.g., `.roster-tab-btn`).
- **Auditions**: Prefix classes with `audition-` (e.g., `.audition-slot-badge`).
- **Reports**: Prefix classes with `report-` (e.g., `.report-stat-card`).

### 3. Shared Utility Extraction
Common patterns identified during research (like recurring gaps in flex containers) will be moved to `admin.css` if they are truly global, or kept as local module classes if specific to the workflow.

## Detailed Component Designs

### Communications Module
- **`comm-form-field`**: Standard container for label + input + validation text.
- **`comm-placeholder-panel`**: Styles for the placeholder side panel, including the scrollable area and the clickable tokens.
- **`comm-message-item`**: Styles for the message history list items, ensuring proper padding and borders.
- **`comm-wizard-footer`**: Standardized alignment for wizard navigation buttons.

### Music Library Module
- **`ml-table-cell`**: Standardized padding and vertical alignment for table cells.
- **`ml-title-stack`**: Flex-col container for piece titles and their metadata badges.
- **`ml-track-indicator`**: Styles for the track/headphone icons.

### Auditions View
- **`audition-config-card`**: Styles for the enabled/disabled status card.
- **`audition-slot-grid`**: Grid or flex-wrap layout for audition time slots.
- **`audition-table`**: Specific table overrides for the audition applications list.

### Reports View
- **`report-grid`**: Layout for the statistics cards at the top.
- **`report-card-stat`**: Styling for individual stat cards (Total Rehearsals, etc.).
- **`report-attendance-table`**: Highlight logic for singers with multiple absences (moved to CSS class `.report-row-danger`).

## Verification Plan
1. **Automated Verification**: `npm test` (specifically `test/codebaseIntegrity.test.ts`) must pass after removing files from the whitelist.
2. **Visual Verification**: Manual inspection of all refactored views to ensure no regressions in layout, spacing, or typography.
3. **Responsive Check**: Verify that views still behave correctly on mobile and tablet breakpoints.
