# State - Choir Management Tool

## Current Phase
Phase 3: Seating Chart Text-Only Print Mode

## Progress
- [x] Phase 1: Complete
- [x] Phase 2: Complete
- [x] Phase 3 (Communication): Complete
- [ ] Phase 3 (Print Mode): In Progress
- [ ] Phase 3 (RSVP & Status Automation): Re-planned (Cycle 3)

## Recent Decisions
- **D-01 (2026-05-16):** Adopt strict sequence-ID tracking for seating chart edits to solve race conditions.
- **D-02 (2026-05-16):** Use `activeRequestsCount` state to manage the saving indicator accurately.
- **D-03 (2026-05-16):** Implement context-aware sync (performanceId-venueId) to prevent stale response overwrites during switching.
- **D-04 (2026-05-16):** Ensure dirty state is flushed to server before context switch in `useSeatingChart`.
- **D-05 (2026-05-16):** Add session-aware seating sync helpers so A -> B -> A context bounces cannot apply stale responses.
- **D-06 (2026-05-16):** Treat failed initial seating loads as retryable through the manual save toolbar action.
- **D-07 (2026-05-16):** Consolidate RSVP token generation to the server to prevent HMAC secret leakage.
- **D-08 (2026-05-17):** Implement reports module with concert-based grouping and 12-hour automated admin summaries.

## Blockers
None.
