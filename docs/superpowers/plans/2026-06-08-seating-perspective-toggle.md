# Seating Perspective Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle to the Seating Finder view allowing singers to flip the stage map horizontally between "Singer View" and "Director View" perspectives, while keeping the HUD grounded in the singer's physical position.

**Architecture:** Use `localStorage` for persistence of the `seating-perspective` state. Apply conditional `flex-direction` to the seating rows in `SeatingFinderView.tsx` and update descriptive labels.

**Tech Stack:** React (TypeScript), CSS (Vanilla), LocalStorage.

---

### Task 1: Perspective State and Persistence

**Files:**
- Modify: `src/views/singer/SeatingFinderView.tsx`

- [ ] **Step 1: Add perspective type and state**
Add the type and state initialization at the top of the component.

```tsx
// Inside SeatingFinderView component
type Perspective = 'singer' | 'director';

const [perspective, setPerspective] = useState<Perspective>(() => {
  return (localStorage.getItem('seating-perspective') as Perspective) || 'singer';
});
```

- [ ] **Step 2: Add persistence effect**
Add a `useEffect` to save the choice.

```tsx
useEffect(() => {
  localStorage.setItem('seating-perspective', perspective);
}, [perspective]);
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/singer/SeatingFinderView.tsx
rtk git commit -m "feat(seating): add perspective state and persistence"
```

---

### Task 2: Perspective Toggle UI

**Files:**
- Modify: `src/views/singer/SeatingFinderView.tsx`
- Modify: `src/views/singer/SeatingFinderView.css`

- [ ] **Step 1: Add Toggle UI above the Stage Layout**
Find the `h3` "Interactive Stage Layout" and add the toggle buttons above or beside it.

```tsx
<div className="flex-row perspective-toggle-wrapper">
  <button 
    className={`btn btn-sm ${perspective === 'singer' ? 'btn-primary' : 'btn-ghost'}`}
    onClick={() => setPerspective('singer')}
  >
    Singer View
  </button>
  <button 
    className={`btn btn-sm ${perspective === 'director' ? 'btn-primary' : 'btn-ghost'}`}
    onClick={() => setPerspective('director')}
  >
    Director View
  </button>
</div>
```

- [ ] **Step 2: Add CSS for the toggle**
Add styling to `SeatingFinderView.css`.

```css
.perspective-toggle-wrapper {
  justify-content: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
  background: var(--surface-muted);
  padding: 4px;
  border-radius: var(--radius-md);
  width: max-content;
  margin-left: auto;
  margin-right: auto;
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/singer/SeatingFinderView.tsx src/views/singer/SeatingFinderView.css
rtk git commit -m "feat(seating): add perspective toggle UI"
```

---

### Task 3: Visual Map Transformation

**Files:**
- Modify: `src/views/singer/SeatingFinderView.tsx`

- [ ] **Step 1: Apply conditional flexDirection to rows**
Update the row rendering logic to respect the perspective.

```tsx
<div 
  className="stage-seat-row"
  style={{ 
    flexDirection: perspective === 'director' ? 'row-reverse' : 'row' 
  }}
>
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/views/singer/SeatingFinderView.tsx
rtk git commit -m "feat(seating): implement horizontal row flip for director perspective"
```

---

### Task 4: Label and HUD Clarity Updates

**Files:**
- Modify: `src/views/singer/SeatingFinderView.tsx`

- [ ] **Step 1: Update Assignment Header Text**
Update the parenthetical explanation of seat location.

```tsx
<div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
  Seat {seat! + 1} <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
    ({perspective === 'singer' 
      ? `${seat! + 1} from left, ${rowCounts[row] - seat!} from right, looking at stage`
      : `${seat! + 1} from right, ${rowCounts[row] - seat!} from left, looking at choir`
    })
  </span>
</div>
```

- [ ] **Step 2: Update HUD Header/Subtitle**
Add a clarifying subtitle to the HUD section.

```tsx
<div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
  <div className="flex-col" style={{ alignItems: 'center' }}>
    <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
      Standing Neighbors HUD
    </h3>
    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      Always from your perspective facing the director
    </span>
  </div>
  {/* ... neighbors-hud-container ... */}
</div>
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/singer/SeatingFinderView.tsx
rtk git commit -m "feat(seating): update labels and HUD for perspective clarity"
```

---

### Task 5: Verification

- [ ] **Step 1: Verify Toggle Persistence**
- Open the view, switch to "Director View".
- Refresh the page.
- Verify "Director View" is still selected and rows are flipped.

- [ ] **Step 2: Verify HUD Accuracy**
- Switch between views and ensure the "Standing Neighbors HUD" data (names) does NOT change/flip, as it should remain grounded in physical reality.

- [ ] **Step 3: Verify Label Accuracy**
- Switch between views and ensure the "(X from left...)" text updates correctly.
