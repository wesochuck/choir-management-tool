# Roadmap - Choir Management Tool

## Current Status
Foundational project scaffolding, auth, roster, events, attendance, and seating chart features are implemented.

## Phases

### Phase 1: Clickable Rows for Editing
**Goal:** Make any place where there are rows (like the roster) clickable to trigger an edit action.
**Status:** Complete
**Requirements:** [UI-01, UI-02, UI-03]
**Plans:** 1 plan

### Phase 2: Seating Chart Save Improvements
**Goal:** Robust state-machine based auto-save and manual save for the seating chart.
**Status:** Complete
**Requirements:** [SEAT-01, SEAT-02, SEAT-03]
**Plans:** 3 plans
- [x] 02-01-PLAN.md — Refactor useSeatingChart state machine
- [x] 02-02-PLAN.md — Update SeatingView save UI and manual save
- [x] phase-2/PLAN.md — Cycle 5: Multi-performance context switching fixes

### Phase 3: Communication Platform
**Goal:** Centralized admin communication hub with recipient filtering, message history, and delivery settings.
**Status:** Complete
**Requirements:** [COMM-01, COMM-02, COMM-03, COMM-04]
**Plans:** 1 plan
- [x] 03-01-PLAN.md — Communication platform implementation

### Phase 3: Seating Chart Text-Only Print Mode
**Goal:** Adds a "Text-only" print mode to the Seating Chart creator for clean, row-based reference.
**Status:** In Progress
**Requirements:** [PRNT-01, PRNT-02, PRNT-03]
**Plans:** 1 plan
- [ ] 03-01-PLAN.md — Robust print mode with visual/text toggle and name parsing
