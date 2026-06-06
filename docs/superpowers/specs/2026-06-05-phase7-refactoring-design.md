# Design Spec: Phase 7 Style Refactoring (Set List & Music Workflow)

**Date:** 2026-06-05
**Topic:** Style Refactoring Phase 7
**Status:** DRAFT

## Goal
Eliminate static inline styles from Set List management views, Music Library filters, and related complex metadata editors. Transition these to modular Vanilla CSS files to ensure maintainability and consistency.

## Architecture & Strategy

### 1. Modular CSS Files
We will introduce specific CSS files for the complex workflows in this phase:
- `src/views/admin/SetList.css`: Styles for the set list view, sortable items, and inline creator.
- `src/views/admin/music-library/MusicLibraryEditors.css`: Styles for the learning tracks editor, multi-select dropdown, piece modal, and music import modal.

### 2. Naming Convention
- **Set List**: Prefix classes with `sl-` (e.g., `sl-item-card`, `sl-creator-input`).
- **Music Editors**: Prefix classes with `mle-` (e.g., `mle-track-upload-row`, `mle-modal-grid`).

### 3. Shared Utility Extraction
- Standardize the gap and padding logic for the complex forms in the Music Piece Modal.
- Extract the sticky header and drag-and-drop styles for the Set List.

## Detailed Component Designs

### Set List Components
- **`sl-view-container`**: Main container for the set list view.
- **`sl-header-stats`**: The summary stats row at the top of the set list.
- **`sl-sortable-item`**: The draggable card representation of a set list item.
- **`sl-item-actions`**: The action buttons block inside a sortable item.
- **`sl-creator-bar`**: The inline search/create input bar.

### Music Library Editors
- **`mle-filter-bar`**: The sticky/fixed filter bar in the Music Library.
- **`mle-track-row`**: A single row in the learning tracks editor.
- **`mle-modal-grid`**: The 2-column or 3-column grid used in the Music Piece modal.
- **`mle-import-dropzone`**: The drag-and-drop zone for the Music Import Modal.

## Verification Plan
1. **Automated Verification**: `npm test` (specifically `test/codebaseIntegrity.test.ts`) must pass after removing files from the whitelist.
2. **Visual Verification**: Manual inspection of the Set List drag-and-drop functionality and the complex Music Piece Modal.
3. **Responsive Check**: Ensure the Set List view remains usable on smaller admin screens.
