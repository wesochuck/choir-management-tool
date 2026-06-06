# Phase 7 Style Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate static inline styles from Set List and Music Library Workflow components.

**Architecture:** Create modular CSS files (SetList.css, MusicLibraryEditors.css) and migrate inline styles to named CSS classes.

**Tech Stack:** React, TypeScript, Vanilla CSS.

---

### Task 1: Set List Components Refactoring

**Files:**
- Create: `src/views/admin/SetList.css`
- Modify: `src/views/admin/SetListView.tsx`
- Modify: `src/components/admin/SetListItemEditModal.tsx`
- Modify: `src/components/admin/SortableSetListItem.tsx`
- Modify: `src/components/admin/SetListInlineCreator.tsx`

- [ ] **Step 1: Create SetList.css**
- [ ] **Step 2: Migrate SetListView.tsx** (Extract layout, empty states, and print styles)
- [ ] **Step 3: Migrate SetListItemEditModal.tsx**
- [ ] **Step 4: Migrate SortableSetListItem.tsx**
- [ ] **Step 5: Migrate SetListInlineCreator.tsx**
- [ ] **Step 6: Verify visually**

---

### Task 2: Music Library Editors Refactoring

**Files:**
- Create: `src/views/admin/music-library/MusicLibraryEditors.css`
- Modify: `src/components/admin/MusicImportModal.tsx`
- Modify: `src/views/admin/music-library/MusicLibraryFilters.tsx`
- Modify: `src/views/admin/music-library/LearningTracksEditor.tsx`
- Modify: `src/views/admin/music-library/MultiSelectDropdown.tsx`

- [ ] **Step 1: Create MusicLibraryEditors.css**
- [ ] **Step 2: Migrate MusicImportModal.tsx** (Extract dropzone, progress bars, and table styles)
- [ ] **Step 3: Migrate MusicLibraryFilters.tsx**
- [ ] **Step 4: Migrate LearningTracksEditor.tsx**
- [ ] **Step 5: Migrate MultiSelectDropdown.tsx**
- [ ] **Step 6: Verify visually**

---

### Task 3: Music Piece Modal Refactoring

**Files:**
- Modify: `src/views/admin/music-library/MusicLibraryEditors.css`
- Modify: `src/views/admin/music-library/MusicPieceModal.tsx`

- [ ] **Step 1: Migrate MusicPieceModal.tsx** (This file has many inline styles for grids, tabs, and form layouts. Extract them all to `MusicLibraryEditors.css` using `mle-` prefixed classes.)
- [ ] **Step 2: Verify visually**

---

### Task 4: Final Cleanup and Verification

**Files:**
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Remove Phase 7 files from `legacyInlineStyleWhitelist` in `test/codebaseIntegrity.test.ts`**
- [ ] **Step 2: Run integrity tests**
  - Run: `rtk npm test test/codebaseIntegrity.test.ts`
  - Expected: PASS
- [ ] **Step 3: Run all tests**
- [ ] **Step 4: Commit changes**
