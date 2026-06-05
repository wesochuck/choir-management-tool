# Communications Module Style Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all static inline styles from the Communications module and move them to `src/views/admin/communications/Communications.css`.

**Architecture:** Use `comm-` prefixed classes for all moved styles. Annotate dynamic styles with `// @allow-inline-style`. Ensure `Communications.css` is imported where needed.

**Tech Stack:** React (TypeScript), CSS

---

### Task 1: Update Communications.css

**Files:**
- Modify: `src/views/admin/communications/Communications.css`

- [ ] **Step 1: Add new classes to Communications.css**

```css
/* Utility classes for Communications refactor */
.comm-flex-0-0-150 { flex: 0 0 150px; }
.comm-flex-1 { flex: 1; }
.comm-flex-1-max-300 { flex: 1; maxWidth: 300px; }
.comm-items-center { alignItems: center; }
.comm-items-center-gap-6 { alignItems: center; gap: 6px; }
.comm-justify-end-gap-sm { justify-content: flex-end; gap: var(--space-sm); }
.comm-gap-xs { gap: 2px; }
.comm-gap-sm { gap: 8px; }
.comm-gap-6px { gap: 6px; }
.comm-opacity-80 { opacity: 0.8; }
.comm-empty-state { padding: var(--space-xl); textAlign: center; }
.comm-empty-state-centered { textAlign: center; padding: 40px 0; }
.comm-empty-state-small { textAlign: center; padding: 20px; color: var(--text-muted); }

/* Template specific */
.comm-template-editor-footer {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  border-top: 1px solid var(--border);
  background: var(--bg-light, #f8fafc);
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}

.comm-btn-small-padding { padding: 4px 10px; height: 30px; }

.comm-template-list-scroll { maxHeight: 100%; overflow-y: auto; padding: var(--space-md); flex: 1; }
.comm-template-list-header { marginBottom: var(--space-md); gap: var(--space-sm); }
.comm-template-info-box {
  background: #f8fafc;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #475569;
}

.comm-template-preview-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.comm-template-items-container { maxHeight: calc(100vh - 400px); overflow-y: auto; padding: var(--space-sm) 0; }

.comm-color-slate-800 { color: #1e293b; }
.comm-color-slate-900 { color: #0f172a; }
.comm-color-error { color: #ef4444; }

.comm-font-95 { font-size: 0.95rem; }

.comm-text-ellipsis-max-350 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 350px;
}

.comm-history-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
```

Wait, I should use kebab-case for CSS properties. Correcting.

```css
/* Utility classes for Communications refactor */
.comm-flex-0-0-150 { flex: 0 0 150px; }
.comm-flex-1 { flex: 1; }
.comm-flex-1-max-300 { flex: 1; max-width: 300px; }
.comm-items-center { align-items: center; }
.comm-items-center-gap-6 { align-items: center; gap: 6px; }
.comm-justify-end-gap-sm { justify-content: flex-end; gap: var(--space-sm); }
.comm-gap-xs { gap: 2px; }
.comm-gap-sm { gap: 8px; }
.comm-gap-6px { gap: 6px; }
.comm-opacity-80 { opacity: 0.8; }
.comm-empty-state { padding: var(--space-xl); text-align: center; }
.comm-empty-state-centered { text-align: center; padding: 40px 0; }
.comm-empty-state-small { text-align: center; padding: 20px; color: var(--text-muted); }

/* Template specific */
.comm-template-editor-footer {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  border-top: 1px solid var(--border);
  background: var(--bg-light, #f8fafc);
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}

.comm-btn-small-padding { padding: 4px 10px; height: 30px; }

.comm-template-list-scroll { max-height: 100%; overflow-y: auto; padding: var(--space-md); flex: 1; }
.comm-template-list-header { margin-bottom: var(--space-md); gap: var(--space-sm); }
.comm-template-info-box {
  background: #f8fafc;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #475569;
}

.comm-template-preview-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.comm-template-items-container { max-height: calc(100vh - 400px); overflow-y: auto; padding: var(--space-sm) 0; }

.comm-color-slate-800 { color: #1e293b; }
.comm-color-slate-900 { color: #0f172a; }
.comm-color-error { color: #ef4444; }

.comm-font-95 { font-size: 0.95rem; }

.comm-text-ellipsis-max-350 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 350px;
}

.comm-history-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/communications/Communications.css
rtk git commit -m "style: add new utility classes to Communications.css"
```

### Task 2: Refactor TemplatesPanel.tsx

**Files:**
- Modify: `src/views/admin/communications/TemplatesPanel.tsx`

- [ ] **Step 1: Import CSS if missing and refactor styles**

```tsx
// Add import if missing
import './Communications.css';
```

Replace inline styles with classes:
- `style={{ flex: '0 0 150px' }}` -> `className="comm-compose-field comm-flex-0-0-150"`
- `style={{ gap: '4px', ... }}` -> `className="flex-row comm-template-editor-footer"`
- `style={{ padding: '4px 10px', height: '30px' }}` -> `className="btn btn-sm comm-btn-small-padding ..."`
- `style={{ padding: previewDevice === 'mobile' ? '30px 15px' : '0' }}` -> `// @allow-inline-style - dynamic padding based on preview device`
- `style={{ maxWidth: previewDevice === 'mobile' ? '375px' : '100%', ... }}` -> `// @allow-inline-style - dynamic layout based on preview device`
- `style={{ color: '#1e293b' }}` -> `className="comm-color-slate-800"`
- `style={{ color: '#0f172a' }}` -> `className="comm-color-slate-900"`
- `style={{ padding: previewDevice === 'mobile' ? '16px' : '24px' }}` -> `// @allow-inline-style - dynamic padding based on preview device`
- `style="text-align: center; padding: 40px 0;"` -> `class="text-muted comm-empty-state-centered"` (in the HTML string)
- `style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)' }}` -> `className="flex-row comm-justify-end-gap-sm"`
- `style={{ height: '32px', ... }}` -> `className="btn btn-primary btn-sm comm-template-preview-btn"`
- `style={{ gap: '8px' }}` -> `className="flex-col comm-gap-sm"`
- `style={{ gap: '2px' }}` -> `className="flex-col comm-gap-xs"`
- `style={{ alignItems: 'center', gap: '6px' }}` -> `className="flex-row comm-compose-header-row comm-items-center-gap-6"`
- `style={{ fontSize: '0.95rem' }}` -> `className="comm-font-95"`
- `style={{ opacity: 0.8 }}` -> `className="badge badge-concert comm-message-badge comm-opacity-80"`
- `style={{ whiteSpace: 'nowrap', ... }}` -> `className="text-muted text-xs comm-text-ellipsis-max-350"`
- `style={{ gap: '6px' }}` -> `className="flex-row comm-gap-6px"`
- `style={{ color: '#ef4444' }}` -> `className="btn btn-ghost btn-sm comm-color-error"`
- `style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}` -> `className="comm-empty-state-small"`

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/communications/TemplatesPanel.tsx
rtk git commit -m "style: refactor TemplatesPanel to use CSS classes"
```

### Task 3: Refactor SettingsPanel.tsx

**Files:**
- Modify: `src/views/admin/communications/SettingsPanel.tsx`

- [ ] **Step 1: Refactor styles**

Ensure `import './Communications.css';` is present.

- `style={{ alignItems: 'center' }}` -> `className="comm-compose-header-row comm-items-center"`
- `style={{ flex: 1, maxWidth: '300px' }}` -> `className="card comm-compose-input comm-flex-1-max-300"`
- `style={{ justifyContent: 'flex-end' }}` -> `className="flex-row comm-justify-end"`

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/communications/SettingsPanel.tsx
rtk git commit -m "style: refactor SettingsPanel to use CSS classes"
```

### Task 4: Refactor DraftsPanel.tsx

**Files:**
- Modify: `src/views/admin/communications/DraftsPanel.tsx`

- [ ] **Step 1: Refactor styles**

Ensure `import '../communications/Communications.css';` (or correct path) is present.

- `style={{ padding: '40px', textAlign: 'center' }}` -> `className="comm-empty-state"`

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/admin/communications/DraftsPanel.tsx
rtk git commit -m "style: refactor DraftsPanel to use CSS classes"
```

### Task 5: Refactor MessageHistory.tsx

**Files:**
- Modify: `src/components/admin/MessageHistory.tsx`

- [ ] **Step 1: Refactor styles**

Ensure `import '../../views/admin/communications/Communications.css';` is present.

- `style={{ paddingRight: searchTerm ? '32px' : '12px' }}` -> `// @allow-inline-style - dynamic padding based on search state`
- `style={{ backgroundColor: '#94a3b8', color: 'white' }}` -> `className="badge badge-muted comm-message-badge comm-color-muted-bg"` (Add this to CSS too if needed, or use existing)
- `style={{ opacity: 0.8 }}` -> `className="badge badge-concert comm-message-badge comm-opacity-80"`
- `style={{ gap: '6px' }}` -> `className="flex-row comm-gap-6px"`
- `style={{ padding: 'var(--space-xl)', textAlign: 'center' }}` -> `className="comm-empty-state"`

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/admin/MessageHistory.tsx
rtk git commit -m "style: refactor MessageHistory to use CSS classes"
```

### Task 6: Refactor PlaceholderPanel.tsx

**Files:**
- Modify: `src/components/admin/PlaceholderPanel.tsx`

- [ ] **Step 1: Refactor styles**

Ensure `import '../../views/admin/communications/Communications.css';` is present.

- `style={{ color: p.color, backgroundColor: p.bgColor }}` -> `// @allow-inline-style - dynamic colors from placeholder definition`

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/admin/PlaceholderPanel.tsx
rtk git commit -m "style: refactor PlaceholderPanel to use CSS classes"
```

### Task 7: Final Verification

- [ ] **Step 1: Grep for remaining unannotated styles**

Run: `rtk grep "style=" src/components/admin/MessageHistory.tsx src/components/admin/PlaceholderPanel.tsx src/views/admin/communications/TemplatesPanel.tsx src/views/admin/communications/SettingsPanel.tsx src/views/admin/communications/DraftsPanel.tsx`

Expected: Only lines with `// @allow-inline-style`.

---
