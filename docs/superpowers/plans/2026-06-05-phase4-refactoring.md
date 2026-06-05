# Phase 4 Style Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate inline styles from Library & Comms Dashboards and transition to modular CSS.

**Architecture:** Create module-specific CSS files (Communications.css, MusicLibrary.css, etc.) and migrate inline `style={{...}}` attributes to named CSS classes.

**Tech Stack:** React, TypeScript, Vanilla CSS.

---

### Task 1: Communications Module Refactoring

**Files:**
- Create: `src/views/admin/communications/Communications.css`
- Modify: `src/views/admin/CommunicationView.tsx`
- Modify: `src/components/ComposeStep.tsx`
- Modify: `src/components/admin/PlaceholderPanel.tsx`
- Modify: `src/components/admin/MessageHistory.tsx`
- Modify: `src/views/admin/communications/ComposePanel.tsx`
- Modify: `src/views/admin/communications/DraftsPanel.tsx`
- Modify: `src/views/admin/communications/HistoryPanel.tsx`
- Modify: `src/views/admin/communications/SettingsPanel.tsx`
- Modify: `src/views/admin/communications/TemplatesPanel.tsx`
- Modify: `src/views/admin/communications/AutomatedTasksPanel.tsx`
- Modify: `src/views/admin/communications/CommunicationModals.tsx`

- [ ] **Step 1: Create Communications.css**
- [ ] **Step 2: Migrate ComposeStep.tsx** (Extract gap, padding, color, fontSize to `.comm-compose-*` classes)
- [ ] **Step 3: Migrate PlaceholderPanel.tsx** (Extract border, padding, gap, typography to `.comm-placeholder-*` classes)
- [ ] **Step 4: Migrate MessageHistory.tsx** (Extract list item padding, border, badges to `.comm-message-*` classes)
- [ ] **Step 5: Migrate all panels in `src/views/admin/communications/`**
- [ ] **Step 6: Import Communications.css in CommunicationView.tsx**
- [ ] **Step 7: Verify visually in browser**

---

### Task 2: Music Library Module Refactoring

**Files:**
- Create: `src/views/admin/music-library/MusicLibrary.css`
- Modify: `src/views/admin/MusicLibraryView.tsx`
- Modify: `src/views/admin/music-library/table/MusicLibraryCatalogCell.tsx`
- Modify: `src/views/admin/music-library/table/MusicLibraryTracksCell.tsx`
- Modify: `src/views/admin/music-library/table/MusicLibraryBadges.tsx`
- Modify: `src/views/admin/music-library/table/MusicLibraryRow.tsx`
- Modify: `src/views/admin/music-library/table/MusicLibraryTitleCell.tsx`

- [ ] **Step 1: Create MusicLibrary.css**
- [ ] **Step 2: Migrate Table Cells** (CatalogCell, TracksCell, Badges, TitleCell)
- [ ] **Step 3: Migrate MusicLibraryRow.tsx** (Extract row padding, background, borders)
- [ ] **Step 4: Migrate MusicLibraryView.tsx** (Extract header layout, filter gaps)
- [ ] **Step 5: Import MusicLibrary.css in MusicLibraryView.tsx**
- [ ] **Step 6: Verify visually in browser**

---

### Task 3: Roster, Auditions, and Reports Views

**Files:**
- Create: `src/views/admin/Roster.css`
- Create: `src/views/admin/Auditions.css`
- Create: `src/views/admin/Reports.css`
- Modify: `src/views/admin/RosterView.tsx`
- Modify: `src/views/admin/AuditionsView.tsx`
- Modify: `src/views/admin/ReportsView.tsx`

- [ ] **Step 1: Create Roster.css and migrate RosterView.tsx**
- [ ] **Step 2: Create Auditions.css and migrate AuditionsView.tsx**
- [ ] **Step 3: Create Reports.css and migrate ReportsView.tsx**
- [ ] **Step 4: Verify visually in browser**

---

### Task 4: Final Cleanup and Verification

**Files:**
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Remove refactored files from `legacyInlineStyleWhitelist` in `test/codebaseIntegrity.test.ts`**
- [ ] **Step 2: Run integrity tests**
  - Run: `rtk npm test test/codebaseIntegrity.test.ts`
  - Expected: PASS
- [ ] **Step 3: Run all tests to ensure no regressions**
  - Run: `rtk npm test`
- [ ] **Step 4: Commit all changes**
