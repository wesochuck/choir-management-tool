# Codebase Concerns

**Analysis Date:** 2026-05-26

## Tech Debt

**Admin Views Complexity:**
- Issue: Several administrative views are massive React components intertwining presentation, state, and complex domain logic.
- Files: `src/views/admin/CommunicationView.tsx` (1300+ lines), `src/views/admin/music-library/MusicPieceModal.tsx` (1200+ lines), `src/views/admin/RosterView.tsx` (1100+ lines), `src/views/admin/SetListView.tsx` (950+ lines)
- Impact: Modifying these files is error-prone, testability is reduced, and component rendering cycles are difficult to optimize.
- Fix approach: Extract discrete domains into custom React hooks (e.g., `useCommunicationState`) and break down UI into smaller, purely presentational components.

## Known Bugs

**Pending RSVP Implicit State Mismatch:**
- Symptoms: When sending messages targeting "Pending" users, recipients with missing `eventRosters` rows were omitted and showed 0 recipients.
- Files: `src/services/communicationService.ts`
- Trigger: An RSVP being reset to Pending deletes the `eventRosters` record if there's no attendance or folder data, which the messaging filter previously failed to resolve as an implicit "Pending" status.
- Workaround: A patch was applied to explicitly treat missing roster rows as Pending, but the implicit-state paradigm requires close monitoring in other queries.

**Venue Strict Schema Constraints:**
- Symptoms: Attempting to save an "open seating" venue fails with a 400 error (`rowCounts: Cannot be blank.`).
- Files: `pocketbase/pb_migrations/1715690000_initial.js`, `src/views/admin/VenuesView.tsx`
- Trigger: Sending an empty array for `rowCounts` triggered strict PocketBase schema validation.
- Workaround: Fixed via migration (`1717400000_make_row_counts_optional.js`), but implies that other complex UI states might clash with strict initial database constraints.

## Security Considerations

**Token & URL Parameter Splitting:**
- Risk: Unencoded ampersands (`&`) in composite PocketBase tokens passed in sharing/RSVP URLs are truncated or split by HTTP clients, invalidating auth and breaking external links.
- Files: `src/services/communicationService.ts`, `src/views/PublicPlayerView.tsx`, `src/views/PublicRsvpView.tsx`
- Current mitigation: Defensive fallback parsing to reconstruct split tokens (`token` + `s` + `p`) and mandatory `encodeURIComponent(token)`.
- Recommendations: Ensure all new URL generation methods explicitly URL-encode tokens and avoid raw string interpolation for sensitive hash values.

## Performance Bottlenecks

**Hook Callback Isolation and Errors:**
- Problem: `onRecordAfterCreateSuccess` and other PocketHost hooks can fail silently or throw after the database write has committed.
- Files: `pocketbase/pb_hooks/*.pb.js`
- Cause: Goja VM evaluates hooks in an isolated context where external helper functions may be unavailable.
- Improvement path: Keep callbacks self-contained and wrap all advisory hook logic in `try/catch` to prevent breaking the standard client response.

## Fragile Areas

**Goja VM JSON Column []byte Serialization:**
- Files: `pocketbase/pb_hooks/main.pb.js`, `src/services/playerService.ts`
- Why fragile: PocketBase handles JSON columns as raw Go `[]byte`. When executing `JSON.stringify()` on this in the Goja VM, it creates an array of numerical character codes instead of string JSON, causing client-side parse errors.
- Safe modification: Always decode the raw numerical arrays into standard UTF-8 strings before attempting to assign or parse standard objects (utilizing helpers like `decodeGoBytes` or `parseJsonField`).
- Test coverage: Requires manual verification as the PocketHost Goja environment is difficult to fully emulate locally.

**Stale Token Loops:**
- Files: `src/lib/pocketbase.ts`
- Why fragile: Whenever the local or remote database is reset, existing frontend auth tokens become invalid, causing recurring 401/403 HTTP errors.
- Safe modification: The `afterSend` interceptor on the PocketBase client MUST be preserved to catch these failures, clear the store, and route to `/login`.

## Scaling Limits

**Sorting in Custom Endpoints:**
- Current capacity: Collections sorted properly in standard APIs.
- Limit: Using `findRecordsByFilter` in `pb_hooks/` and sorting by system fields (`created`, `updated`) will crash the Goja VM parser with "invalid sort field".
- Scaling path: Sort by primary indexed fields or pass an empty sort string `""` to fall back to SQLite insertion order.

## Dependencies at Risk

**Database Migration Immutability:**
- Risk: Modifying historical `.js` migrations in `pocketbase/pb_migrations/`.
- Impact: Will cause database initialization failure and schema drift across local environments and hosted PocketHost environments.
- Migration plan: Strictly adhere to append-only schema modifications through forward sequential migrations.

## Missing Critical Features

**Twilio SMS Integration:**
- Problem: No administrative UI to input Twilio credentials and no backend hook to dispatch SMS messages.
- Blocks: Sending urgent, direct text updates to the roster.

**Advanced Music Library Filtering:**
- Problem: The music library section filter requires a multi-select refactoring to fit more categories (e.g., separating genres and sections correctly).
- Blocks: Efficient navigation of massive sheet music catalogs.

## Test Coverage Gaps

**Complex Admin Modals:**
- What's not tested: The deep visual state interactions within the 1000+ line components (`MusicPieceModal`, `SeatingFormationsEditor`).
- Files: `src/views/admin/music-library/MusicPieceModal.tsx`, `src/components/admin/SeatingFormationsEditor.tsx`
- Risk: Refactoring these components to fix technical debt could unknowingly break complex edge-case state updates (e.g., linking multiple movements to a setlist).
- Priority: High

---

*Concerns audit: 2026-05-26*