# Cross-AI Plan Review Request

You are reviewing implementation plans for a software project phase.
Provide structured feedback on plan quality, completeness, and risks.

## Project Context
[x] add the ability to have a setting for the default roster status when opening it.
[x] make rsvp list in the events section actually do something.
[x] Highlight Duplicates in music library should really be labeled, filter duplicates or show duplicates.
[x] make a view that shows the photo as well for the roster management
[x] make it so you can quickly and easily add the photo in the roster using a cell phone.
[x] for venues make it clearer when they are linked to something and can't be deleted
[x] make it possible to export roster into csv.
[x] make it possible to export music library into csv.
[x] make it so that you can edit the voice part list some choirs might be TTBB
[x] make the voice part where you can see both the label and the full name so in a place like the seating chart, it would be helpful to just have the label because you're a limited on room but when you are displaying things, it would be helpful to have the full name

## Phase 05: polish-and-paging
### Roadmap Section
(Not available - no ROADMAP.md found)

### Requirements Addressed
[ ] music library section filter should be multi select. refactor the UI to fit more.
[ ] add on the music player for choir members maybe an encouragement to "install" this as a PWA app on their phone, but think about how it will work for members who return and it is a diff set list.
[ ] Twilio SMS Integration: Add admin UI credentials settings card and server-side PocketBase dispatch hook in pb_hooks to route SMS messages directly via Twilio.
[?] make sure all communication history from the various parts of the platform are visible in the communication history section
[ ] rename statuses in all places from: active (current) to active, rename active (future) to idle, keep Inactive
[] it won't allow you to remove email address from account. the helper text takes up too much room.
[] consider all the places we need to have pagination.
[] being able to get from event rsvp to the event itself easier.
[] increase ability to link between all areas of the system.

### User Decisions (CONTEXT.md)
(None)

### Research Findings
(None)

### Plans to Review
# Phase 5: Polish & Paging - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize global singer statuses, implement a reusable pagination system, and enhance cross-module navigation to make the platform feel more connected and scalable.

**Architecture:**
1.  **Data:** A database migration will normalize `globalStatus` values.
2.  **UI:** A reusable `<Pagination />` component will support both client-side (slice/filter) and server-side (PocketBase collection pagination) modes.
3.  **Routing:** React Router's `navigate` and `useSearchParams` will be used to pass context (like `initialRecipients` or `filterSingerId`) between views.

**Tech Stack:** React, TypeScript, PocketBase, React Router

---

### Task 1: Global Status Renaming (Data & Constants)

**Files:**
- Create: `pocketbase/pb_migrations/1717500000_rename_global_statuses.js`
- Modify: `src/services/profileService.ts`
- Modify: `src/services/communicationService.ts`
- Modify: `src/components/admin/SingerModal.tsx`
- Modify: `src/lib/rosterImportUtils.ts`

- [ ] **Step 1: Create PocketBase Migration**
Update `globalStatus` in all profile records:
- `Active (Current)` -> `Active`
- `Active (Future)` -> `Idle`
- `Inactive` -> `Former`

- [ ] **Step 2: Update Code Constants & Types**
Update `Profile` interface and related filter lists in `profileService.ts` and `communicationService.ts`.

- [ ] **Step 3: Update Components & Tests**
Find and replace all string literal occurrences in the UI and test suite.

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "refactor: rename global statuses to Active, Idle, and Former"
```

---

### Task 2: Reusable Pagination Component

**Files:**
- Create: `src/components/common/Pagination.tsx`

- [ ] **Step 1: Implement Pagination UI**
Create a component that accepts `currentPage`, `totalPages`, and `onPageChange`. Include "First", "Prev", "Next", "Last" buttons and page number indicators.

- [ ] **Step 2: Add Logic for Page Windows**
If `totalPages` > 7, show a sliding window of page numbers with ellipses (e.g., `1 ... 4 5 6 ... 20`).

- [ ] **Step 3: Commit**
```bash
git add src/components/common/Pagination.tsx
git commit -m "feat: add reusable Pagination component"
```

---

### Task 3: Client-Side Pagination (Music Library & Roster)

**Files:**
- Modify: `src/views/admin/MusicLibraryView.tsx`
- Modify: `src/views/admin/RosterView.tsx`

- [ ] **Step 1: Implement Library Pagination**
Set default `pageSize` to 25. Update the filter logic to slice the results. Pass the slice to `MusicLibraryTable`.

- [ ] **Step 2: Implement Roster Pagination**
Apply the same pattern to `RosterView`.

- [ ] **Step 3: Commit**
```bash
git add src/views/admin/MusicLibraryView.tsx src/views/admin/RosterView.tsx
git commit -m "feat: implement client-side pagination for library and roster"
```

---

### Task 4: Server-Side Pagination (Communication History)

**Files:**
- Modify: `src/services/communicationService.ts`
- Modify: `src/views/admin/CommunicationView.tsx`

- [ ] **Step 1: Update communicationService**
Update `getMessageHistory` to accept `page` and `perPage` parameters and return the PocketBase pagination metadata (`page`, `perPage`, `totalItems`).

- [ ] **Step 2: Update CommunicationView**
Hook up the `<Pagination />` component and trigger a re-fetch when the page changes.

- [ ] **Step 3: Commit**
```bash
git add src/services/communicationService.ts src/views/admin/CommunicationView.tsx
git commit -m "feat: implement server-side pagination for communication history"
```

---

### Task 5: Enhanced Navigation Jumps

**Files:**
- Modify: `src/components/admin/CheckInList.tsx` (Attendance -> Singer)
- Modify: `src/views/admin/AuditionsView.tsx` (Audition -> Communication)
- Modify: `src/views/admin/EventRosterView.tsx` (RSVP -> Event Editor)
- Modify: `src/components/admin/SingerModal.tsx` (Singer -> Comm History)

- [ ] **Step 1: Attendance → Singer**
Make singer names in `CheckInList` clickable. When clicked, open the `SingerModal` for that profile.

- [ ] **Step 2: Audition → Communication**
Add an "Email" icon/button to the audition row/modal. Navigate to `/admin/communications` with state: `{ initialRecipients: [applicant] }`.

- [ ] **Step 3: RSVP → Event Editor**
In `EventRosterView`, add a "View Event Details" button that navigates back to the `/admin/events` page and opens the `EventModal` for that event.

- [ ] **Step 4: Roster → Communication History**
In `SingerModal`, add a link: "View Email History". Navigate to `/admin/communications` with search param `?filterSingerId=ID`. Update `CommunicationView` to filter history by this ID if present.

- [ ] **Step 5: Commit**
```bash
git add src/
git commit -m "feat: implement cross-module navigation jumps"
```

---

### Task 6: Final UI Polish & Fixes

**Files:**
- Modify: `src/views/admin/music-library/MusicLibraryFilters.tsx` (Multi-select)
- Modify: `src/components/admin/SingerModal.tsx` (Remove email fix)
- Modify: `src/views/admin/SettingsView.tsx` (Section-less voice parts)

- [ ] **Step 1: Multi-select Section Filter**
Refactor the Music Library section filter to use checkboxes or a multi-select dropdown.

- [ ] **Step 2: Allow Blank Email**
Remove frontend validation that prevents clearing the email field in `SingerModal`. Ensure the `payload` handles `email: null` correctly for PocketBase.

- [ ] **Step 3: Section-less Voice Parts**
Update settings logic to allow saving Voice Parts that have an empty `sectionCode`. Ensure the UI renders them gracefully in a "General" or unassigned group.

- [ ] **Step 4: Final Commit**
```bash
git commit --allow-empty -m "chore: complete phase 5 polish and paging"
```

## Review Instructions

Analyze each plan and provide:

1. **Summary** — One-paragraph assessment
2. **Strengths** — What's well-designed (bullet points)
3. **Concerns** — Potential issues, gaps, risks (bullet points with severity: HIGH/MEDIUM/LOW)
4. **Suggestions** — Specific improvements (bullet points)
5. **Risk Assessment** — Overall risk level (LOW/MEDIUM/HIGH) with justification

Focus on:
- Missing edge cases or error handling
- Dependency ordering issues
- Scope creep or over-engineering
- Security considerations
- Performance implications
- Whether the plans actually achieve the phase goals

Output your review in markdown format.
