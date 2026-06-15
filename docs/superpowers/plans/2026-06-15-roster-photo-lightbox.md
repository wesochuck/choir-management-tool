# RosterTable Photo Lightbox — Migrate to Modal Component

> **Goal:** Replace the hand-rolled photo lightbox overlay in `RosterTable.tsx` with the Shoelace-backed `<Modal>` component. Removes a custom Escape-key handler, backdrop rendering, and close button SVG in favor of the standard Modal.

## Current State

**File:** `src/components/admin/RosterTable.tsx:201-240`

- 40 lines of custom JSX: `fixed inset-0` backdrop, manual close button with inline SVG, overflow management
- Custom `useEffect` (lines 49-58) to handle Escape key
- No focus trapping, no `aria-modal`, no portal
- Duplicates concerns already handled by `<Modal>`

## Target State

Replace the lightbox block and its Escape-key effect with a single `<Modal>` call. The Modal provides the backdrop, Escape-key handling, close button, focus trapping, portal, and accessibility attributes for free.

## Steps

### 1. Import Modal

Add `Modal` to the existing `../ui` barrel import (line 8):

```ts
// Before:
import { Button, Badge } from '../ui';

// After:
import { Button, Badge, Modal } from '../ui';
```

### 2. Remove Escape-key `useEffect`

Delete lines 48-58 — Modal handles Escape natively.

### 3. Replace custom lightbox JSX with `<Modal>`

Replace lines 201-240 (the `{activePhoto && (...)}` block) with:

```tsx
<Modal
  isOpen={!!activePhoto}
  onClose={() => setActivePhoto(null)}
  title={activePhoto?.name}
  maxWidth="360px"
>
  <div className="flex flex-col items-center gap-4">
    <div className="size-48 overflow-hidden rounded-full border-4 border-slate-100 shadow-md">
      <img
        src={activePhoto?.url}
        alt={activePhoto?.name}
        className="size-full object-cover select-none"
      />
    </div>
    {activePhoto?.voicePart && (
      <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-deep">
        {activePhoto.voicePart}
      </span>
    )}
  </div>
</Modal>
```

Key decisions:
- `title={activePhoto?.name}` — Modal renders the singer's name as the modal title/header
- `maxWidth="360px"` — narrower than the default 500px; photos don't need much horizontal space
- No footer — no actions needed (close handled by Modal's × button / backdrop / Escape)
- Voice part badge moved below the photo (was next to name in the old layout, but name is now the title)

### 4. Verify

- Open the roster, click a singer's photo — should open Modal with photo centered
- Close via × button, backdrop click, or Escape key — all three should work
- Voice part badge renders correctly
- Existing RosterTable tests still pass

### 5. Commit

```bash
rtk git add src/components/admin/RosterTable.tsx
rtk git commit -m "refactor(admin): migrate RosterTable photo lightbox to Modal component"
```

## Impact

| Before | After |
|--------|-------|
| 40 lines custom overlay + 10 lines Escape effect = 50 lines | 20 lines using `<Modal>` |
| No focus trap, no `aria-modal` | Full a11y from Modal |
| Inline SVG close button | Consistent Modal close button |
| Manual backdrop blur styling | Inherits Modal's unified styling |
| `useEffect` for Escape key | Free from Modal |
