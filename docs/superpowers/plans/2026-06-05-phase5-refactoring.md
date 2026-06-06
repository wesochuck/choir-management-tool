# Phase 5 Style Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate static inline styles from Admin Dashboards & Ticketing interfaces.

**Architecture:** Create modular CSS files (Dashboards.css, Ticketing.css, etc.) and migrate inline styles to named CSS classes.

**Tech Stack:** React, TypeScript, Vanilla CSS.

---

### Task 1: Shared Dashboards Refactoring

**Files:**
- Create: `src/views/admin/Dashboards.css`
- Modify: `src/views/admin/AdminDashboardView.tsx`
- Modify: `src/views/admin/RsvpDashboardView.tsx`
- Modify: `src/views/admin/PollsDashboardView.tsx`

- [ ] **Step 1: Create Dashboards.css**
- [ ] **Step 2: Migrate AdminDashboardView.tsx** (Note: The dotColor is dynamic, annotate it)
- [ ] **Step 3: Migrate RsvpDashboardView.tsx** (Extract event header, labels, and empty states)
- [ ] **Step 4: Migrate PollsDashboardView.tsx** (Extract response panel, grids, and previews)
- [ ] **Step 5: Verify visually**

---

### Task 2: Ticketing View Refactoring

**Files:**
- Create: `src/views/admin/Ticketing.css`
- Modify: `src/views/admin/TicketingView.tsx`

- [ ] **Step 1: Create Ticketing.css**
- [ ] **Step 2: Migrate layout containers and headers**
- [ ] **Step 3: Migrate stat grid and metric cards**
- [ ] **Step 4: Migrate tables (Purchase & Bundle)**
- [ ] **Step 5: Migrate bundle creation form**
- [ ] **Step 6: Verify visually**

---

### Task 3: Venues and Resources Refactoring

**Files:**
- Create: `src/views/admin/Venues.css`
- Create: `src/views/admin/Resources.css`
- Modify: `src/views/admin/VenuesView.tsx`
- Modify: `src/views/admin/ResourcesView.tsx`

- [ ] **Step 1: Create Venues.css and migrate VenuesView.tsx**
- [ ] **Step 2: Create Resources.css and migrate ResourcesView.tsx**
- [ ] **Step 3: Verify visually**

---

### Task 4: Poll Selection Modal Refactoring

**Files:**
- Create: `src/components/admin/PollSelectionModal.css`
- Modify: `src/components/admin/PollSelectionModal.tsx`

- [ ] **Step 1: Create PollSelectionModal.css and migrate the component**
- [ ] **Step 2: Verify visually**

---

### Task 5: Final Cleanup and Verification

**Files:**
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Remove Phase 5 files from `legacyInlineStyleWhitelist` in `test/codebaseIntegrity.test.ts`**
- [ ] **Step 2: Run integrity tests**
  - Run: `rtk npm test test/codebaseIntegrity.test.ts`
  - Expected: PASS
- [ ] **Step 3: Run all tests**
- [ ] **Step 4: Commit changes**
