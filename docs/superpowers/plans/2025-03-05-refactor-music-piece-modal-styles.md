# Refactor MusicPieceModal Inline Styles

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all remaining static inline styles from `MusicPieceModal.tsx` to `MusicLibraryEditors.css`.

**Architecture:** Utilize existing `mle-` prefixed classes where available, and create new ones for missing styles to ensure 100% removal of inline styles.

**Tech Stack:** React, CSS

---

### Task 1: Update MusicLibraryEditors.css with New Classes

**Files:**
- Modify: `src/views/admin/music-library/MusicLibraryEditors.css`

- [ ] **Step 1: Add missing classes to CSS**

```css
.mle-tracks-tab-content {
    gap: var(--space-xs);
}

.mle-movements-tab-content {
    gap: var(--space-md);
}

.mle-movements-list-container {
    gap: var(--space-sm);
}

.mle-movement-item-btn-danger {
    color: var(--danger) !important;
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/music-library/MusicLibraryEditors.css
rtk git commit -m "style(mle): add missing classes for music piece modal refactor"
```

### Task 2: Refactor MusicPieceModal.tsx to Use CSS Classes

**Files:**
- Modify: `src/views/admin/music-library/MusicPieceModal.tsx`

- [ ] **Step 1: Replace inline styles with CSS classes**

Replace `style={{ gap: 'var(--space-xs)' }}` at line 1059 with `className="flex-col mle-tracks-tab-content"`.
Replace the large `style` object at line 1076 with `className="mle-tracks-editor-fallback-container"`.
Replace `style={{ gap: 'var(--space-md)' }}` at line 1105 with `className="flex-col mle-movements-tab-content"`.
Replace `style={{ justifyContent: 'space-between', alignItems: 'center' }}` at line 1106 with `className="flex-row animate-fade-in mle-movements-section-header"`.
Replace `style={{ margin: 0, color: 'var(--primary)' }}` at line 1107 with `className="text-md mle-movements-section-title"`.
Replace `style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}` at line 1110 with `className="card mle-movements-empty-state"`.
Replace `style={{ gap: 'var(--space-sm)' }}` at line 1114 with `className="flex-col mle-movements-list-container"`.
Replace `style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}` at line 1123 with `className="flex-row mle-movement-item-header"`.
Replace `style={{ alignItems: 'center', gap: '8px' }}` at line 1125 with `className="flex-row mle-movement-item-title-row"`.
Replace `style={{ fontSize: '14px' }}` at line 1126 with `className="mle-movement-item-title-strong"`.
Replace `style={{ alignItems: 'center', gap: 'var(--space-sm)' }}` at line 1139 with `className="flex-row mle-movement-item-actions"`.
Replace `style={{ fontSize: '12px', padding: '4px 8px', height: '28px', minHeight: 'auto' }}` at line 1144 with `className="btn btn-ghost btn-sm mle-movement-item-btn"`.
Replace `style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px', height: '28px', minHeight: 'auto' }}` at line 1152 with `className="btn btn-ghost btn-sm mle-movement-item-btn mle-movement-item-btn-danger"`.
Replace `style={{ gap: '4px', marginTop: 'var(--space-sm)' }}` at line 1160 with `className="flex-col mle-movement-tracks-editor-wrapper"`.
Replace `style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}` at line 1164 with `className="mle-movement-tracks-editor-label"`.
Replace `style={{ padding: 'var(--space-md)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted, #f8fafc)' }}` at line 1184 with `className="card mle-movement-add-form-container"`.
Replace `style={{ marginTop: 0, marginBottom: 'var(--space-sm)', color: 'var(--primary)' }}` at line 1185 with `className="text-sm mle-movement-add-title"`.
Replace `style={{ gap: 'var(--space-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}` at line 1186 with `className="flex-row mle-movement-add-inputs-row"`.
Replace `style={{ gap: '4px', flex: '2 1 200px' }}` at line 1187 with `className="flex-col mle-movement-add-name-group"`.
Replace `style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }}` at line 1198 with `className="card mle-movement-add-input-field"`.
Replace `style={{ gap: '4px', flex: '1 1 100px' }}` at line 1204 with `className="flex-col mle-movement-add-duration-group"`.
Replace `style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }}` at line 1215 with `className="card mle-movement-add-input-field"`.
Replace `style={{ height: '36px', minHeight: '36px', padding: '0 16px', fontSize: '13px' }}` at line 1224 with `className="btn btn-primary mle-movement-add-submit-btn"`.

- [ ] **Step 2: Verify no static inline styles remain**

Run: `rtk grep "style={{" src/views/admin/music-library/MusicPieceModal.tsx`
Expected: Only dynamic styles (if any) or NO matches. (Task says 23 static styles remain, we should eliminate all of them).

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/music-library/MusicPieceModal.tsx
rtk git commit -m "refactor(mle): remove static inline styles from MusicPieceModal"
```
