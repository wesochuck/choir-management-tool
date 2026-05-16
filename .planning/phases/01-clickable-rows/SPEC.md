# Design Specification: Clickable Rows for Editing (REVISED)

## 1. Objective
Enhance the administrative user experience by allowing users to click anywhere on a row or card in a list to trigger the "Edit" action. This uses the **Expanded Hit Area** pattern to ensure accessibility (WCAG 2.1 AA) and valid HTML structure.

## 2. Visual Standards
- **Cursor:** `pointer` when hovering over the clickable area.
- **Background Color:** `var(--primary-light)` (#e9f0eb) on hover.
- **Active State:** Subtle scale or darken on click for tactile feedback.
- **Transition:** `background-color 0.2s ease, transform 0.1s ease`.
- **Consistency:** Follow "The Modern Rehearsal" design system (DESIGN.md).

## 3. Technical Approach

### 3.1 CSS Utility (src/App.css)
```css
/* Container for expanded hit area */
.relative-row {
  position: relative;
}

/* Hover effect for the container when the expanded button is hovered */
.relative-row:has(.expanded-hit-area:hover) {
  background-color: var(--primary-light) !important;
}

/* Tactile feedback for the container when the expanded button is active */
.relative-row:has(.expanded-hit-area:active) {
  background-color: #d1e0d5 !important; /* Slightly darker Sage Mist */
  transform: scale(0.998);
}

/* The primary action button that expands to cover the container */
.expanded-hit-area::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1; /* Below other specific actions */
  cursor: pointer;
}

/* Secondary actions must stay above the hit area */
.relative-row .btn-secondary,
.relative-row a,
.relative-row input,
.relative-row label {
  position: relative;
  z-index: 2;
}
```

### 3.2 Accessibility and Semantics
- **No Nested Buttons:** The container is NOT a `role="button"`. Only the actual "Edit" button is the interactive element.
- **Keyboard Support:** Standard button keyboard support (Enter/Space) works automatically because the interactive element IS a button.
- **Table Semantics:** `<tr>` and `<td>` tags are preserved without invalid roles.

### 3.3 Event Handling
- Use `e.stopPropagation()` on all secondary interactive elements (Delete buttons, checkbox labels, text inputs) to ensure they don't trigger the "Edit" action.
- Ensure `stopPropagation()` is applied to both `onClick` and `onChange` where applicable.

### 3.4 Component Updates

#### AppCard (`src/components/common/AppCard.tsx`)
- Add `relative-row` class.
- The primary action (usually the Edit button) will get the `expanded-hit-area` class.

#### RosterTable (`src/components/admin/RosterTable.tsx`)
- Apply `.relative-row` to `<tbody> tr`.
- Apply `.expanded-hit-area` to the "Edit" button.
- Ensure "Delete" button has higher z-index (via CSS class).

#### EventList (`src/components/admin/EventList.tsx`)
- Apply `.relative-row` to the card container.
- Apply `.expanded-hit-area` to the "Edit" button.
- Secondary actions (RSVP List, Email, Text, Location link) get higher z-index.

#### CheckInList (`src/components/admin/CheckInList.tsx`)
- Apply `.relative-row` to the card.
- The "Edit Profile" (new or existing) button gets `.expanded-hit-area`.
- **Crucial:** Apply `stopPropagation()` to the `label` wrapping the checkbox and the Folder # input.

### 3.5 View Updates

#### AttendanceView (`src/views/admin/AttendanceView.tsx`)
- Implement `SingerModal` integration to allow editing profiles directly from the attendance list.

#### AuditionsView (`src/views/admin/AuditionsView.tsx`)
- Implement a simple `AuditionModal` for consistent editing experience.
- Apply the Expanded Hit Area pattern to the "Status" or a dedicated "Edit" button.

## 4. Success Criteria
- [x] Hovering over a row/card highlights the background.
- [x] Clicking any "empty" space in a row/card triggers the Edit action for that item.
- [x] Clicking secondary buttons (Delete, RSVP) or inputs (Folder #, Checkbox) works as expected without opening the Edit Modal.
- [x] Keyboard navigation (Tab + Enter) on the Edit button works correctly.
- [x] Mobile users get tactile feedback (:active state).
