# Configurable Performer Label

Replace hardcoded "singer" UI text with a configurable label stored in `appSettings`, defaulting to "Performer". This makes the platform terminology-agnostic — choirs, theaters, dance troupes, or any performing group can relabel "singer" to whatever term fits their ensemble.

## Scope

**UI labels only.** Internal identifiers stay unchanged:

| Changes (user-facing text) | Stays as-is |
|---|---|
| Page titles, modal titles, button labels | `role: 'singer'` in database (shows as "Singer" in role UI) |
| Empty states, loading text, error messages | API routes: `/api/singer/*` |
| Descriptions, tooltips, aria-labels | TypeScript types: `MappedSinger`, `SingerModalProps` |
| Section headings, stat labels | Variable/parameter names: `singerId`, `filteredSingers` |
| Instructional text, help text | File/directory names: `views/singer/`, `singer-modal/` |
| CSV column labels, form placeholder text | Code comments, test descriptions |
| Email HTML headings | `{singerName}` template placeholder (it's a person's name) |

## Implementation

### 1. Setting definition — `src/services/settings/generalSettings.ts`

- Key: `'performer_label'`
- Default: `'Performer'`
- Getter: `getPerformerLabel(): Promise<string>` — merges with default
- Setter: `savePerformerLabel(label: string)` — upserts to `appSettings`

Exported via `src/services/settingsService.ts`.

### 2. Query key — `src/lib/queryKeys.ts`

Add `appSettings.performerLabel: ['appSettings', 'performer_label'] as const`

### 3. App-wide context — `src/hooks/useDocumentTitle.tsx`

Extend the existing `ChoirSettingsContext` / `ChoirNameProvider` to also expose `performerLabel: string`. Fetched alongside choir name/timezone on mount. This avoids adding a separate provider.

### 4. Pluralization

Simple `+ "s"` suffix utility. Covers "Performer→Performers", "Member→Members", "Artist→Artists". Known limitation: does not handle irregular plurals ("Person→People"). Document in code comment.

### 5. UI replacements — ~158 occurrences across ~55 files

Replace hardcoded "singer"/"Singers"/"singer's" in JSX with `{performerLabel}` / `{performerLabelPlural}`. Key surfaces:

- **Page titles:** "Singer Dashboard" → "{performerLabel} Dashboard"
- **Modals:** "Add Singer", "Edit Singer", "Delete Singer", "Lookup Singer"
- **Empty states:** "No singers found", "No Matching Singers"
- **Buttons/links:** "Convert to Singer", "Singer View", "Singer Directory"
- **Error messages:** "Could Not Save Singer", "Error Adding Singer"
- **Page descriptions:** "Add singers and track status", "Assign singers to seats"
- **Table headers:** "Singer" column header, `paginationLabel="singers"`
- **Section headings:** "Unassigned Singers", "Singer Visibility", "Active Singers"

Each replacement follows the same pattern:

```tsx
// before
<h2>Add Singer</h2>
<Button>No singers found</Button>
<p>Assign singers to seats</p>
const label = `No Matching Singers`;

// after
<h2>Add {performerLabel}</h2>
<Button>No {performerLabelPlural} found</Button>
<p>Assign {performerLabelPlural} to seats</p>
const label = `No Matching ${performerLabelPlural}`;
```

### 6. Admin settings UI — `src/views/admin/SettingsView.tsx`

Add a text input field in the General tab's existing `AppCard`, alongside choir name:

> **Label for participants** (text input)
> Shown throughout the app. Default: "Performer"

### 7. Migration

No database migration needed. The `appSettings` collection is schemaless. When no `'performer_label'` record exists, the default `'Performer'` is used.

## Files modified (~55)

| Group | Count | Files |
|---|---|---|
| Settings infrastructure | 3 | `generalSettings.ts`, `settingsService.ts`, `queryKeys.ts` |
| Context/hook | 1 | `useDocumentTitle.tsx` |
| Admin settings UI | 1 | `SettingsView.tsx` |
| Singer views | 4 | `DashboardView.tsx`, `DirectoryView.tsx`, `ProfileView.tsx`, `SeatingFinderView.tsx` |
| Admin views | 12 | `AdminDashboardView.tsx`, `RosterView.tsx`, `ReportsView.tsx`, `SeatingView.tsx`, `AttendanceView.tsx`, `EventRosterView.tsx`, `AuditionsView.tsx`, `PatronsView.tsx`, `PollsDashboardView.tsx`, `ResourcesView.tsx`, `SetListView.tsx`, `SettingsView.tsx` (counted above) |
| Admin event/roster sub-views | 4 | `useEventRosterExport.tsx`, `useRsvpBulkActions.ts`, `SetListToolbar.tsx`, `PollDetailsModal.tsx` |
| Admin comms views | 5 | `AudienceStep.tsx`, `ReviewStep.tsx`, `ReviewSidebar.tsx`, `PreFlightChecklist.tsx`, `SetlistWarning.tsx`, `TemplatesPanel.tsx` |
| Admin components | 19 | `SingerModal.tsx`, `SingerLookupModal.tsx`, `RosterTable.tsx`, `EventRosterTable.tsx`, `RosterSummary.tsx`, `StatusAutomationSettings.tsx`, `VoicePartEditor.tsx`, `SeatingBottomDock.tsx`, `SeatingGrid.tsx`, `SeatingTextList.tsx`, `UnassignedPrintSection.tsx`, `ReadOnlyAdminSeatingPanel.tsx`, `AttendanceSingerActionsSheet.tsx`, `PlayerLinkModal.tsx`, `RosterImportModal.tsx`, `PlaceholderPanel.tsx`, `EventModal.tsx`, `SingerProfileForm.tsx`, `SingerModalFooter.tsx` |
| Seating components | 3 | `SeatingPerspectiveToggle.tsx`, `SelectedSeatCard.tsx`, `ReadOnlySeatingGrid.tsx` |
| Other | 5 | `LivePreview.tsx`, `RsvpRehearsalsList.tsx`, `PublicRsvpView.tsx`, `RsvpDashboardView.tsx`, `LoginView.tsx` |
| Lib/hooks | 4 | `communicationUtils.ts`, `attendanceReportService.ts`, `useDashboardCounts.ts`, `labelHelpers.ts` (new) |
| **Total** | **~55** | |

## Verification

- `rtk npm run lint` — no new warnings
- `rtk npx vitest run` — affected component tests pass
- Manual: save setting in admin, verify labels update across pages
