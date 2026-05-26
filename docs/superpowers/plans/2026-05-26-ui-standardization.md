# UI Standardization & Visual Debt Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the admin UI by removing redundant headers, unifying input styling, and replacing fragile inline styles with reusable CSS classes from the design system.

**Architecture:** We will expand `src/admin.css` with a few key utility classes (`.form-select`, `.card-accent`) and use them to refactor existing views. This ensures that future theme changes only need to touch CSS, not individual component files.

**Tech Stack:** React, TypeScript, CSS Variables (Design Tokens)

---

### Task 1: Design System Expansion & Palette Definition

**Files:**
- Modify: `src/index.css`
- Modify: `src/admin.css`

- [x] **Step 1: Define shared section palette in index.css**
```css
/* index.css - Add to :root */
  --section-red: #EF4444;
  --section-orange: #F97316;
  --section-amber: #F59E0B;
  --section-green: #10B981;
  --section-cyan: #06B6D4;
  --section-blue: #3B82F6;
  --section-indigo: #6366F1;
  --section-purple: #8B5CF6;
  --section-pink: #EC4899;
  --section-slate: #64748B;
```

- [x] **Step 2: Add .form-select and .card-accent to admin.css**
```css
/* admin.css */
.form-select {
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--surface);
  color: var(--text);
  font-size: 0.95rem;
  width: 100%;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: var(--primary);
}

.card-accent {
  background-color: var(--primary-light);
  border: 1px solid rgba(74, 117, 89, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
}
```

- [x] **Step 3: Commit**
```bash
git add src/index.css src/admin.css
git commit -m "style: expand design tokens and add shared admin utility classes"
```

---

### Task 2: Standardize AuditionsView

**Files:**
- Modify: `src/views/admin/AuditionsView.tsx`

- [x] **Step 1: Remove redundant h1 and switch to admin-view-header**
Replace the top `flex-responsive` div with:
```tsx
<div className="admin-view-header">
  <div className="admin-view-titles">
    {/* Page title is already handled by PageLayout in App.tsx */}
  </div>
  <div className="admin-view-actions">
    <button className="btn btn-primary" onClick={() => { setEditingAudition(null); setIsModalOpen(true); }}>
      Add Audition
    </button>
    <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
      {showSettings ? 'Hide Settings' : 'Configure Times & Settings'}
    </button>
    <a className="btn btn-ghost" href="/auditions" target="_blank" rel="noopener noreferrer">Preview Public Form</a>
  </div>
</div>
```

- [x] **Step 2: Replace manual select styling with .form-select**
Update the status and performance filters to use `className="form-select"`.

- [x] **Step 3: Commit**
```bash
git add src/views/admin/AuditionsView.tsx
git commit -m "refactor: remove redundant header and standardize inputs in AuditionsView"
```

---

### Task 3: Standardize RsvpDashboardView

**Files:**
- Modify: `src/views/admin/RsvpDashboardView.tsx`

- [x] **Step 1: Remove redundant h1 and switch to admin-view-header**
Remove the `<h1>Event RSVPs</h1>` and the containing `flex-responsive` div.

- [x] **Step 2: Switch "Active Event" banner to .card-accent**
Replace the inline `style={{ ... }}` on the active event card with `className="card-accent"`.

- [x] **Step 3: Use .form-select for the event picker**
```tsx
<select 
  value={selectedEventId} 
  onChange={(e) => setSelectedEventId(e.target.value)}
  className="form-select"
>
```

- [x] **Step 4: Commit**
```bash
git add src/views/admin/RsvpDashboardView.tsx
git commit -m "refactor: remove redundant header and standardize layout in RsvpDashboardView"
```

---

### Task 4: Refactor SeatingView Header & Controls

**Files:**
- Modify: `src/admin.css`
- Modify: `src/views/admin/SeatingView.tsx`

- [x] **Step 1: Move Seating-specific styles to admin.css**
```css
/* admin.css */
.seating-controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--space-sm);
  flex-wrap: wrap;
}

.seating-control-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
```

- [x] **Step 2: Apply classes to SeatingView.tsx**
Replace inline styles in the header area with the new classes.

- [x] **Step 3: Commit**
```bash
git add src/admin.css src/views/admin/SeatingView.tsx
git commit -m "style: migrate SeatingView inline styles to admin.css"
```

---

### Task 5: Palette Unification in RosterView

**Files:**
- Modify: `src/views/admin/RosterView.tsx`

- [x] **Step 1: Replace hardcoded hex values with CSS variables**
```tsx
const PALETTE_COLORS = [
  'var(--section-red)',
  'var(--section-orange)',
  'var(--section-amber)',
  'var(--section-green)',
  'var(--section-cyan)',
  'var(--section-blue)',
  'var(--section-indigo)',
  'var(--section-purple)',
  'var(--section-pink)',
  'var(--section-slate)',
];
```

- [x] **Step 2: Commit**
```bash
git add src/views/admin/RosterView.tsx
git commit -m "refactor: use design tokens for section palette in RosterView"
```

---

### Task 6: Final Verification

- [x] **Step 1: Run Lint & Build**
```bash
npm run lint && npm run build
```

- [x] **Step 2: Final Commit**
```bash
git commit --allow-empty -m "chore: complete UI standardization cleanup"
```
