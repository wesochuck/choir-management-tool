# Inline Style → Tailwind Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Convert all non-seating inline `style={{}}` usages to Tailwind utility classes or properly annotated `@allow-inline-style` comments.

**Architecture:** Apply two strategies per file: (1) conditional class template literals for state-driven values, (2) `@allow-inline-style` annotation for non-convertible values. Batch by directory.

**Tech Stack:** Tailwind CSS v4 (arbitrary value syntax), React, TypeScript

---

### Task 1: Add @allow-inline-style comments (9 files)

**Files:** (modify each, add comment above `style={{}}`)
- `src/views/PublicPollView.tsx` lines 161, 173
- `src/components/ui/Select/Select.tsx` line 17
- `src/components/ui/ProgressBar/ProgressBar.tsx` line 26
- `src/components/ui/Table/Table.tsx` line 31
- `src/components/ui/Modal/Modal.tsx` line 45
- `src/components/common/BaseModal.tsx` line 98
- `src/components/common/PageLayout.tsx` lines 32, 51
- `src/components/common/AppCard.tsx` line 29
- `src/components/admin/AutocompleteInput.tsx` line 114

- [ ] Add `// @allow-inline-style - <explanation>` comment above each `style={{}}` in all 9 files

### Task 2: DialogContext.tsx textarea → Tailwind

**File:** `src/contexts/DialogContext.tsx:158-168`

- [ ] Replace inline style with: `className="w-full min-h-[80px] p-[10px] rounded-sm border border-border font-[inherit] text-[0.9rem] resize-y box-border"`

### Task 3: SectionBucketEditor.tsx backdrop → Tailwind

**File:** `src/components/admin/SectionBucketEditor.tsx:113-121`

- [ ] Replace inline style with: `className="fixed inset-0 z-[100] cursor-default"`

### Task 4: PublicRsvpView.tsx (6 inline styles → Tailwind)

**File:** `src/views/PublicRsvpView.tsx`

- [ ] Line 378: RSVP status color → `className={...conditional classes}`
- [ ] Lines 435-439: Yes button opacity/border → conditional classes
- [ ] Lines 454-459: No button bg/color/opacity/border → conditional classes
- [ ] Lines 479-482: Attendance circle bg/color → conditional classes
- [ ] Lines 524-528: Change response Yes button → merge into className
- [ ] Lines 542-546: Change response No button → merge into className

### Task 5: PublicPollView.tsx (2 inline styles → Tailwind)

**File:** `src/views/PublicPollView.tsx`

- [ ] Line 161: Yes button selection → merge inline style into className conditional
- [ ] Line 173: No button selection → merge inline style into className conditional

### Task 6: PublicAuditionView.tsx (2 inline styles → Tailwind)

**File:** `src/views/PublicAuditionView.tsx`

- [ ] Line 159: Chevron rotation → `className={isScheduleExpanded ? 'rotate-180' : 'rotate-0'}`
- [ ] Line 235: Timeslot font weight → `className={isChecked ? 'font-semibold' : 'font-normal'}`

### Task 7: DashboardView.tsx (2 inline styles → Tailwind)

**File:** `src/views/singer/DashboardView.tsx`

- [ ] Lines 316-320: Poll Yes button → merge into className
- [ ] Lines 326-332: Poll No button → merge into className

### Task 8: SeatingFinderView.tsx (annotate inline styles)

**File:** `src/views/singer/SeatingFinderView.tsx`

- [ ] Line 318: add `// @allow-inline-style - dynamic flex direction`
- [ ] Line 343: add `// @allow-inline-style - dynamic singer seat color`

### Task 9: RosterSummary.tsx (4 inline styles → Tailwind)

**File:** `src/components/admin/RosterSummary.tsx`

- [ ] Line 107: section name → `className="text-xs font-bold uppercase tracking-wider text-primary-deep"`
- [ ] Line 111: count number → `className="text-[2rem] font-extrabold leading-none text-primary-deep"`
- [ ] Line 119: voice part grid → `className="mt-0 grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2"`
- [ ] Lines 141, 143: font weight → `font-bold`

### Task 10: AuditionModal.tsx (4 inline styles → Tailwind)

**File:** `src/components/admin/AuditionModal.tsx`

- [ ] Lines 143-149: Tab 1 button → merge into conditional className
- [ ] Lines 157-163: Tab 2 button → merge into conditional className
- [ ] Lines 169-172: Tab display → stays inline, add `@allow-inline-style`
- [ ] Lines 200-204: Scheduled slot color/weight → merge into className

### Task 11: SingerModal.tsx (2 inline styles → Tailwind)

**File:** `src/components/admin/SingerModal.tsx`

- [ ] Line 296-299: Feedback color → add `@allow-inline-style`
- [ ] Line 418: Checkbox opacity → `className={isSelf ? 'opacity-60' : ''}`
- [ ] Line 430: Checkbox cursor → `className={isSelf ? 'cursor-not-allowed' : 'cursor-pointer'}`

### Task 12: EventRosterView.tsx (3 inline styles → Tailwind)

**File:** `src/views/admin/EventRosterView.tsx`

- [ ] Line 264: borderColor → already handled by className, remove inline
- [ ] Lines 288-291: borderWidth/padding → merge into conditional className
- [ ] Lines 426-431: progress bar → stays inline, add `@allow-inline-style`

### Task 13: TicketingView.tsx (2 inline styles → Tailwind)

**File:** `src/views/admin/TicketingView.tsx`

- [ ] Line 642: refunded row → `className={isRefunded ? 'text-text-muted opacity-60' : ''}`
- [ ] Line 813: same pattern for orders
- [ ] Line 955: cursor → `className={hasPurchases ? 'cursor-not-allowed' : 'cursor-pointer'}`

### Task 14: ReportsView.tsx (1 inline style → Tailwind)

**File:** `src/views/admin/ReportsView.tsx`

- [ ] Line 261-263: absence row → `className={report.absences >= 2 ? 'bg-danger-bg text-danger-text' : ''}`

### Task 15: RosterView.tsx (2 inline styles → Tailwind)

**File:** `src/views/admin/RosterView.tsx`

- [ ] Line 309: font weight → conditional class
- [ ] Line 324: dropdown rotation → merge into className with transition

### Task 16: ComposePanel.tsx (1 inline style → Tailwind)

**File:** `src/views/admin/communications/ComposePanel.tsx`

- [ ] Line 326: chevron rotation → merge into className

### Task 17: MusicLibraryTable.tsx (2 inline styles → Tailwind)

**File:** `src/views/admin/music-library/MusicLibraryTable.tsx`

- [ ] Line 65: sort header color → conditional class
- [ ] Line 75: sort arrow opacity → conditional class

### Task 18: RosterImportModal.tsx (2 inline styles → Tailwind)

**File:** `src/components/admin/RosterImportModal.tsx`

- [ ] Line 456: error name color → `className={hasErrors ? 'text-[#c62828]' : ''}`
- [ ] Line 524: error count color → `className={errorsList.length > 0 ? 'text-[#991b1b]' : ''}`

### Task 19: SetListInlineCreator.tsx (add annotation)

**File:** `src/components/admin/SetListInlineCreator.tsx`

- [ ] Line 157: verify/ensure `@allow-inline-style` comment present

---

## Verification

- [ ] Run `rtk npm run check:pb-hooks`
- [ ] Cross-check all files
