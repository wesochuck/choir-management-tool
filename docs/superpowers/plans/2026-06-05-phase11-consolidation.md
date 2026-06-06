# Phase 11: Utility Extraction & Style De-duplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate redundant CSS patterns into global utility classes and standardized layouts to ensure cross-module consistency and maintainability.

**Architecture:** Move shared layout, spacing, form, and state patterns from modular CSS files into `src/index.css` and `src/admin.css`. Update modules to inherit these global utilities.

**Tech Stack:** Vanilla CSS.

---

### Task 1: Foundation - Layout & Spacing Utilities

**Files:**
- Modify: `src/index.css`
- Modify: `src/admin.css`

- [ ] **Step 1: Extract Base Flex Utilities to index.css**
  Define `.flex-col`, `.flex-row`, `.flex-center`, `.flex-between`, `.flex-wrap`, and standard gaps (`.gap-xs` through `.gap-xl`).

- [ ] **Step 2: Define Standard View Container in admin.css**
  Create `.admin-view-container` with standard flex-column layout, gap, and vertical padding to replace duplicate definitions in `MusicLibrary.css`, `Dashboards.css`, and `SetList.css`.

- [ ] **Step 3: Commit foundational utilities**

---

### Task 2: Standardizing Empty & Loading States

**Files:**
- Modify: `src/admin.css`
- Modify: `src/views/admin/music-library/MusicLibrary.css`
- Modify: `src/views/admin/Dashboards.css`
- Modify: `src/views/admin/communications/Communications.css`

- [ ] **Step 1: Create global state utilities in admin.css**
  Define `.admin-empty-state` and `.admin-loading-state` with standardized padding, alignment, and muted typography.

- [ ] **Step 2: Refactor modular CSS files**
  Remove redundant local empty/loading state definitions and update the corresponding `.tsx` files to use the global classes.

- [ ] **Step 3: Commit state standardization**

---

### Task 3: Form Layout Consolidation

**Files:**
- Modify: `src/admin.css`
- Modify: `src/components/admin/RosterComponents.css`
- Modify: `src/views/admin/music-library/MusicLibraryEditors.css`

- [ ] **Step 1: Define `.form-field-group` in admin.css**
  Standardize the `flex-col` + `gap-xs` pattern used for Label + Input pairs.

- [ ] **Step 2: Refactor Roster and Music editors**
  Replace local form group styles with the global `.form-field-group`.

- [ ] **Step 3: Commit form layout cleanup**

---

### Task 4: Card System Harmonization

**Files:**
- Modify: `src/admin.css`
- Modify: `src/views/singer/SingerDashboard.css`
- Modify: `src/views/admin/Ticketing.css`

- [ ] **Step 1: Create AppCard variants in admin.css**
  Standardize `.card-glass`, `.card-accent`, and `.card-muted` based on successful patterns in the Singer Dashboard and Admin Settings.

- [ ] **Step 2: Refactor Singer and Ticketing modules**
  Migrate local card overrides to the centralized global variants.

- [ ] **Step 3: Commit card system updates**

---

### Task 5: Final Audit & Regression Testing

**Files:**
- Modify: `src/index.css` (final cleanup)

- [ ] **Step 1: Audit all modular CSS files for remaining redundant hex codes**
  Replace hardcoded colors with existing CSS variables (`--primary`, `--border`, etc.).

- [ ] **Step 2: Run all integrity and compilation tests**
- [ ] **Step 3: Visual sweep across all dashboards and modals**
- [ ] **Step 4: Commit all final consolidation changes**
