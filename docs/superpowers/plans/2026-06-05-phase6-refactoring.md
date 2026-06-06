# Phase 6 Style Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate static inline styles from Singer Experience components and Public Transaction forms.

**Architecture:** Create modular CSS files (SingerDashboard.css, Profile.css, PublicForms.css, etc.) and migrate inline styles to named CSS classes.

**Tech Stack:** React, TypeScript, Vanilla CSS.

---

### Task 1: Singer Experience Refactoring

**Files:**
- Create: `src/views/singer/SingerDashboard.css`
- Create: `src/views/singer/Profile.css`
- Modify: `src/views/singer/DashboardView.tsx`
- Modify: `src/views/singer/ProfileView.tsx`
- Modify: `src/components/singer/EventCard.tsx`

- [ ] **Step 1: Create SingerDashboard.css & Profile.css**
- [ ] **Step 2: Migrate DashboardView.tsx** (Extract glass-card, poll item, and preview content styles)
- [ ] **Step 3: Migrate ProfileView.tsx** (Extract notification rows, avatar wraps, and help text)
- [ ] **Step 4: Migrate EventCard.tsx**
- [ ] **Step 5: Verify visually**

---

### Task 2: Public Forms & Transaction Screens

**Files:**
- Create: `src/views/PublicForms.css`
- Modify: `src/views/PublicAuditionView.tsx`
- Modify: `src/views/PublicTicketPurchaseView.tsx`
- Modify: `src/views/PublicTicketListView.tsx`
- Modify: `src/views/PublicTicketSuccessView.tsx`
- Modify: `src/views/PublicBundlePurchaseView.tsx`

- [ ] **Step 1: Create PublicForms.css**
- [ ] **Step 2: Migrate layout containers across all public views**
- [ ] **Step 3: Migrate purchase cards, success icons, and pricing summaries**
- [ ] **Step 4: Migrate checkout and application forms**
- [ ] **Step 5: Verify visually**

---

### Task 3: Roster Utilities Refactoring

**Files:**
- Create: `src/components/admin/RosterUtils.css`
- Modify: `src/components/admin/SingerLookupModal.tsx`
- Modify: `src/components/admin/RosterImportModal.tsx`
- Modify: `src/components/admin/CheckInList.tsx`
- Modify: `src/components/admin/SingerRsvpHistoryTab.tsx`
- Modify: `src/components/admin/AuditionModal.tsx`

- [ ] **Step 1: Create RosterUtils.css**
- [ ] **Step 2: Migrate Lookup and Import modals** (Extract scroll areas, progress bars, and table sticky headers)
- [ ] **Step 3: Migrate CheckInList.tsx**
- [ ] **Step 4: Migrate RSVP History and Audition modal**
- [ ] **Step 5: Verify visually**

---

### Task 4: Live Preview & Remaining Components

**Files:**
- Create: `src/components/LivePreview.css`
- Modify: `src/components/LivePreview.tsx`

- [ ] **Step 1: Create LivePreview.css**
- [ ] **Step 2: Migrate email frame and phone shell representations**
- [ ] **Step 3: Verify visually**

---

### Task 5: Final Cleanup and Verification

**Files:**
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Remove Phase 6 files from `legacyInlineStyleWhitelist` in `test/codebaseIntegrity.test.ts`**
- [ ] **Step 2: Run integrity tests**
  - Run: `rtk npm test test/codebaseIntegrity.test.ts`
  - Expected: PASS
- [ ] **Step 3: Run all tests**
- [ ] **Step 4: Commit changes**
