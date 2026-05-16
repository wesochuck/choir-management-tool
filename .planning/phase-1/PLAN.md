---
phase: 01-clickable-rows
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/App.css, src/components/common/AppCard.tsx, src/components/admin/RosterTable.tsx, src/components/admin/EventList.tsx, src/components/admin/CheckInList.tsx, src/views/admin/AttendanceView.tsx, src/views/admin/VenuesView.tsx, src/views/admin/AuditionsView.tsx, src/components/admin/AuditionModal.tsx]
autonomous: true
requirements: [UI-01, UI-02, UI-03]

must_haves:
  truths:
    - "Rows and cards use the Expanded Hit Area pattern (valid ARIA)"
    - "Hovering a row/card highlights the background and changes cursor"
    - "Clicking a row/card triggers the primary 'Edit' action"
    - "Clicking internal buttons/inputs does NOT trigger the Edit action"
    - "AuditionsView uses an Edit Modal consistent with other views"
    - "Mobile users get tactile feedback via :active state"
  artifacts:
    - path: "src/App.css"
      provides: ".relative-row and .expanded-hit-area classes"
    - path: "src/components/admin/AuditionModal.tsx"
      provides: "Consistent edit experience for auditions"
  key_links:
    - from: "src/components/admin/CheckInList.tsx"
      to: "src/views/admin/AttendanceView.tsx"
      via: "onEdit prop"
---

<objective>
Implement clickable rows using the Expanded Hit Area pattern to improve administrative efficiency while maintaining accessibility and valid HTML structure. Addresses feedback from REVIEW.md (CR-01, CR-02, WR-01, WR-02, WR-03, IN-01).
</objective>

<execution_context>
@$HOME/.gemini/get-shit-done/workflows/execute-plan.md
@$HOME/.gemini/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phase-1/SPEC.md
@.planning/phase-1/REVIEW.md
@DESIGN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Foundation (CSS & Common Components)</name>
  <files>src/App.css, src/components/common/AppCard.tsx</files>
  <action>
    - Add `.relative-row` and `.expanded-hit-area` classes to `src/App.css` per SPEC (D-CR-02).
    - Include `:active` state for tactile feedback (D-IN-01).
    - Update `AppCard.tsx` to always use `position: relative` (via `.relative-row` class) and ensure internal content allows for an expanded hit area.
    - Note: Do NOT add `role="button"` or `tabIndex` to the AppCard container; the internal action button will handle this (D-CR-02).
  </action>
  <verify>
    <automated>grep -q ".expanded-hit-area" src/App.css && grep -q "relative-row" src/components/common/AppCard.tsx</automated>
  </verify>
  <done>CSS utility and base component support implemented using Expanded Hit Area pattern.</done>
</task>

<task type="auto">
  <name>Task 2: Roster and Events Implementation</name>
  <files>src/components/admin/RosterTable.tsx, src/components/admin/EventList.tsx</files>
  <action>
    - In `RosterTable.tsx`, add `relative-row` to `tr`. Apply `expanded-hit-area` to the "Edit" button. Ensure "Delete" button has higher z-index (D-CR-02, D-WR-01).
    - In `EventList.tsx`, apply `relative-row` to the card container and `expanded-hit-area` to the "Edit" button.
    - Ensure all secondary links and buttons (RSVP List, Location link, etc.) have `position: relative; z-index: 2;` and use `e.stopPropagation()` (D-WR-03).
  </action>
  <verify>
    <automated>grep -q "expanded-hit-area" src/components/admin/RosterTable.tsx && grep -q "stopPropagation" src/components/admin/EventList.tsx</automated>
  </verify>
  <done>Roster and Events lists updated with valid, accessible clickable rows.</done>
</task>

<task type="auto">
  <name>Task 3: Attendance, Venues, and Auditions (Consistent UX)</name>
  <files>src/components/admin/CheckInList.tsx, src/views/admin/AttendanceView.tsx, src/views/admin/VenuesView.tsx, src/views/admin/AuditionsView.tsx, src/components/admin/AuditionModal.tsx</files>
  <action>
    - Create `AuditionModal.tsx` for a consistent editing experience (D-WR-02).
    - Update `CheckInList` and `VenuesView` cards to use the `expanded-hit-area` on the primary action button.
    - **Crucial:** Apply `e.stopPropagation()` to the checkbox `label` and `input` in `CheckInList` to prevent opening the modal when toggling attendance (D-WR-03).
    - Update `AttendanceView` to import `SingerModal` and provide `onEdit` to `CheckInList`.
    - Update `AuditionsView` to use the new `AuditionModal` and apply the hit area pattern.
  </action>
  <verify>
    <automated>ls src/components/admin/AuditionModal.tsx && grep -q "stopPropagation" src/components/admin/CheckInList.tsx</automated>
  </verify>
  <done>All administrative views provide a consistent, accessible, and frictionless editing experience.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| UI Event | Primary action button pseudo-element covers container |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | Event Propagation | mitigate | Ensure stopPropagation is applied to all secondary controls (inputs, labels, secondary buttons) to prevent unintended modal triggers |
</threat_model>

<success_criteria>
- All admin lists use the Expanded Hit Area pattern for editing.
- Keyboard support is native via standard buttons.
- No ARIA violations (no nested buttons).
- Tactile feedback exists for all clickable rows.
- Attendance toggling works without triggering profile edit.
</success_criteria>

<output>
After completion, create .planning/phases/01-clickable-rows/01-01-SUMMARY.md
</output>
