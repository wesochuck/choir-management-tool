# Plan: Completing Unfinished Features (Phase 3.2 & Phase 5)

## Objective
Complete the implementation of RSVP automation, status engine recovery, and audition module polish while synchronizing documentation with the codebase state.

## Key Files & Context
- `pocketbase/pb_hooks/*.pb.js`: Server-side logic for RSVPs and status.
- `src/services/communicationService.ts`: Placeholder resolution.
- `src/views/admin/CommunicationView.tsx`: Composer integration.
- `src/views/PublicAuditionView.tsx`: Refactor to use service.
- `.planning/*.md`: Documentation sync.

## Implementation Steps

### Phase 1: PocketBase Backend (RSVP & Status)
1. **Migration for HMAC Secret:** Ensure a default `HMAC_SECRET` exists in `appSettings` (if not already present).
2. **Implement `pocketbase/pb_hooks/rsvp.pb.js`:**
   - `POST /api/generate-rsvp-tokens` (Admin only): Takes eventId + profileIds, returns signed tokens.
   - `POST /api/quick-rsvp` (Public): Verifies token (HMAC-SHA256), updates `eventRosters`.
3. **Implement `pocketbase/pb_hooks/status.pb.js`:**
   - `onModelAfterUpdate/Create` for `eventRosters`.
   - Logic:
     - Check `profile.statusIsManual`. If true, exit.
     - Missed 3 past performances (date < now) = Inactive.
     - **Recovery:** Any upcoming performance (date >= now) with `rsvp == 'Yes'` = Active (Future/Current).
     - Update `profile.globalStatus` and `statusLastChangedAt`.

### Phase 2: Communication Platform Integration
1. **Update `src/services/communicationService.ts`:**
   - Add `resolveRsvpPlaceholders` method.
   - Call `/api/generate-rsvp-tokens` to get signed links.
   - Replace `{{RSVP_LINKS}}` in message content.
2. **Update `src/views/admin/CommunicationView.tsx`:**
   - Add UI hint/instruction for `{{RSVP_LINKS}}`.
   - Ensure placeholder is resolved before sending.

### Phase 3: Audition Polish & Documentation
1. **Refactor `src/views/PublicAuditionView.tsx`:**
   - Use `auditionService.createAudition` instead of direct `pb` calls.
   - Ensure target performance and rehearsals are fetched correctly via existing services if possible.
2. **Sync Planning Docs:**
   - Update `.planning/STATE.md`: Mark Seating Print Mode as complete.
   - Update `.planning/ROADMAP.md`: Ensure status matches reality.
   - Update `.planning/REQUIREMENTS.md`: Check off AUDIT-01 to AUDIT-04.

## Verification & Testing
1. **Unit Tests:**
   - Test HMAC signing/verification in a mock environment (or via PB test script).
   - Test status recovery logic (Inactive -> Active Future).
2. **Integration Tests:**
   - Verify `/api/quick-rsvp` updates the database correctly.
   - Verify `{{RSVP_LINKS}}` resolves to valid clickable links in an email preview (logged).
3. **Manual Verification:**
   - Submit an audition via the public form and verify it appears in `AuditionsView`.
   - Verify converted singers are linked to performances.
