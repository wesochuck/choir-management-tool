# Performer Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-facing "singer" text with a configurable label (default: "Performer") stored in `appSettings`.

**Architecture:** A single string setting `performer_label` follows the existing `choir_name` pattern — stored in `appSettings` key-value, fetched via context provider, and consumed as `performerLabel` in JSX. Pluralization uses simple `+ "s"`. Only UI display text changes; internal identifiers (types, variables, API routes, DB) stay untouched.

**Tech Stack:** TanStack Query, React Context, PocketBase appSettings, Shoelace Input wrapper

---

### Task 1: Add performer label setting

**Files:**
- Modify: `src/services/settings/generalSettings.ts`
- Modify: `src/services/settingsService.ts`
- Modify: `src/lib/queryKeys.ts`

- [ ] **Step 1: Add getter/setter to generalSettings.ts**

```ts
// Add after getHomepageUrl / saveHomepageUrl:

const DEFAULT_PERFORMER_LABEL = 'Performer';

export async function getPerformerLabel(): Promise<string> {
  const setting = await getSetting<string>('performer_label');
  return setting?.value || DEFAULT_PERFORMER_LABEL;
}

export async function savePerformerLabel(label: string) {
  return await upsertSetting('performer_label', label, true);
}
```

- [ ] **Step 2: Export via settingsService.ts**

Add two-line import and named export near the `generalSettings` block (around line 80-88):

```ts
import {
  getChoirName,
  saveChoirName,
  getPerformerLabel,
  savePerformerLabel,
  getTimezone,
  saveTimezone,
  getHomepageUrl,
  saveHomepageUrl,
} from './settings/generalSettings';
export { getChoirName, saveChoirName, getPerformerLabel, savePerformerLabel, getTimezone, saveTimezone, getHomepageUrl, saveHomepageUrl };
```

Add to the `settingsService` namespace object (around line 110-138):

```ts
export const settingsService = {
  // ... existing entries ...
  getChoirName,
  saveChoirName,
  getPerformerLabel,
  savePerformerLabel,
  // ... rest ...
};
```

- [ ] **Step 3: Add query key to queryKeys.ts**

Add inside `appSettings: { ... }` (after line 12):

```ts
performerLabel: ['appSettings', 'performer_label'] as const,
```

- [ ] **Step 4: Verify**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/services/settings/generalSettings.ts src/services/settingsService.ts src/lib/queryKeys.ts`
Expected: passes with 0 warnings

- [ ] **Step 5: Commit**

```bash
git add src/services/settings/generalSettings.ts src/services/settingsService.ts src/lib/queryKeys.ts
git commit -m "feat: add performer_label setting to appSettings"
```

---

### Task 2: Expose performer label via app context

**Files:**
- Modify: `src/hooks/useDocumentTitle.tsx`

- [ ] **Step 1: Extend context interface and provider**

Add `performerLabel` to `ChoirNameContextValue`:

```ts
interface ChoirNameContextValue {
  choirName: string;
  setChoirName: (name: string) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  performerLabel: string;
  setPerformerLabel: (label: string) => void;
}
```

Update the default context value:

```ts
const ChoirNameContext = createContext<ChoirNameContextValue>({
  choirName: '',
  setChoirName: () => {},
  timezone: 'America/New_York',
  setTimezone: () => {},
  performerLabel: 'Performer',
  setPerformerLabel: () => {},
});
```

Add state inside `ChoirNameProvider`:

```ts
const [performerLabel, setPerformerLabel] = useState('Performer');
```

Fetch in the query alongside the others:

```ts
const { data, error } = useQuery({
  queryKey: queryKeys.choirSettings.all,
  queryFn: async () => {
    const [name, tz, label] = await Promise.all([
      settingsService.getChoirName(),
      settingsService.getTimezone(),
      settingsService.getPerformerLabel(),
    ]);
    return { name, timezone: tz, performerLabel: label };
  },
  staleTime: 5 * 60 * 1000,
});
```

Apply in the `useEffect`:

```ts
useEffect(() => {
  if (!data) return;
  setChoirName(data.name);
  setTimezoneState(data.timezone);
  setPerformerLabel(data.performerLabel);
  setCachedTimezone(data.timezone);
}, [data]);
```

Pass in the provider value:

```tsx
<ChoirNameContext.Provider value={{ choirName, setChoirName, timezone, setTimezone, performerLabel, setPerformerLabel }}>
```

- [ ] **Step 2: Verify**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/hooks/useDocumentTitle.tsx`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDocumentTitle.tsx
git commit -m "feat: expose performerLabel via ChoirNameProvider context"
```

---

### Task 3: Add performer label input to settings UI

**Files:**
- Modify: `src/views/admin/SettingsView.tsx`

- [ ] **Step 1: Add performer label state and load it**

Add state alongside existing state variables (after `directoryEnabled`):

```ts
const [performerLabel, setPerformerLabel] = useState('Performer');
```

Extract it from destructured `settingsQuery.data` in the `useEffect`:

```ts
const { loadedChoirName, loadedTimezone, loadedLogoUrl, loadedDirectorySettings, loadedPerformerLabel } =
  settingsQuery.data;
// ...
setPerformerLabel(loadedPerformerLabel ?? 'Performer');
```

Update the query function to fetch it:

```ts
queryFn: async () => {
  const [loadedChoirName, loadedTimezone, loadedLogoUrl, loadedDirectorySettings, loadedPerformerLabel] =
    await Promise.all([
      settingsService.getChoirName(),
      settingsService.getTimezone(),
      settingsService.getLogoUrl(),
      settingsService.getDirectorySettings(),
      settingsService.getPerformerLabel(),
    ]);
  return { loadedChoirName, loadedTimezone, loadedLogoUrl, loadedDirectorySettings, loadedPerformerLabel };
},
```

Add to the `isDirty` calculation:

```ts
const labelDirty = performerLabel !== (settingsData?.loadedPerformerLabel ?? 'Performer');
return fieldsDirty || directoryDirty || logoDirty || labelDirty;
```

Add to `handleGlobalDiscard`:

```ts
setPerformerLabel(settingsData?.loadedPerformerLabel ?? 'Performer');
```

Add to `saveSettingsMutation` (inside `mutationFn`):

```ts
settingsService.savePerformerLabel(performerLabel),
```

- [ ] **Step 2: Add the input card**

Add a new `AppCard` after the "Choir Timezone" card (after line 303) and before "Singer Directory":

```tsx
<AppCard title="Participant Label">
  <div className="flex flex-col gap-2">
    <Input
      id="performer-label"
      type="text"
      value={performerLabel}
      onChange={(event) => setPerformerLabel(event.target.value)}
      placeholder="e.g. Performer"
      className={inputClasses}
    />
    <p className="text-text-muted text-xs">
      Label used throughout the app for participants (shown as "Add Performer",
      "Performer Dashboard", "No performers found", etc.). Default: "Performer".
    </p>
  </div>
</AppCard>
```

Also update the context on save by adding `setPerformerLabel` to the destructured context and calling it in `handleSave`:

```ts
const { setChoirName: setContextChoirName, setTimezone: setContextTimezone, setPerformerLabel: setContextPerformerLabel } = useChoirSettings();
```

```ts
setContextPerformerLabel(performerLabel);
```

- [ ] **Step 3: Verify**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/views/admin/SettingsView.tsx`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/SettingsView.tsx
git commit -m "feat: add participant label input to General settings"
```

---

### Task 4: Replace singer labels in App.tsx and admin dashboard

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/views/admin/AdminDashboardView.tsx`

- [ ] **Step 1: Create pluralization helper at `src/lib/labelHelpers.ts`**

```ts
export function pluralizeLabel(label: string): string {
  return `${label}s`;
}
```

- [ ] **Step 2: Update App.tsx page titles**

These route definitions have `title="Singer Directory"` (line 137) and `title="Singer Resources"` (line 382). They need the label from context. Since they're inline route elements (not components), we need to wrap them.

Replace the `DirectoryRoute` function:

```tsx
export function DirectoryRoute() {
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.appSettings.directory,
    queryFn: () => settingsService.getDirectorySettings(),
    staleTime: 5 * 60_000,
  });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { performerLabel } = useChoirSettings();

  if (isLoading) return <AppLoader />;
  if (!settings?.enabled && !isAdmin) return <Navigate to="/dashboard" replace />;
  return (
    <PageLayout title={`${performerLabel} Directory`} backTo="/dashboard">
      <DirectoryView />
    </PageLayout>
  );
}
```

Add `import { useChoirSettings } from './hooks/useDocumentTitle';` to App.tsx imports.

Replace the "Singer Resources" route (line 378-387):

```tsx
<Route
  path="/admin/resources"
  element={
    <ProtectedRoute adminOnly>
      <ResourcesRoute />
    </ProtectedRoute>
  }
/>
```

Add a `ResourcesRoute` component (like `DirectoryRoute`) before `ErrorBoundary`:

```tsx
function ResourcesRoute() {
  const { performerLabel } = useChoirSettings();
  return (
    <PageLayout title={`${performerLabel} Resources`} backTo="/dashboard">
      <ResourcesView />
    </PageLayout>
  );
}
```

- [ ] **Step 3: Update AdminDashboardView.tsx**

Replace all hardcoded "singer"/"Singers" text:

| Line | Before | After |
|------|--------|-------|
| 18 | `'Add singers and track status'` | `` `Add ${performerLabelPlural} and track status` `` |
| 24 | `'Singer Directory'` | `'{performerLabel} Directory'` |
| 25 | `'View opted-in singer contact info'` | `` `View opted-in ${performerLabel} contact info` `` |
| 134 | `'Singer Resources'` | `'{performerLabel} Resources'` |
| 135 | `'Upload documents and links for singers'` | `` `Upload documents and links for ${performerLabelPlural}` `` |
| 212 | `Singer Directory` | `{performerLabel} Directory` |
| 245 | `Active Singers` | `Active {performerLabelPlural}` |
| 318 | `Add Singer` | `Add {performerLabel}` |

Import `useChoirSettings` and `useMemo`:

```tsx
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../lib/labelHelpers';
```

Inside the component:

```tsx
const { performerLabel } = useChoirSettings();
const performerLabelPlural = pluralizeLabel(performerLabel);
```

The `dashboardSections` array is defined at module scope — it needs to move inside the component to use the label. Create a function `useDashboardSections` or simply move it inline. Since the links object has `desc` strings with singer references, make them functions or move the array inside the component.

Simplest approach: move `dashboardSections` inside the component and replace the string literals with template expressions:

```tsx
const dashboardSections = useMemo(() => [
  {
    title: 'People & membership',
    dotClassName: 'bg-section-green',
    links: [
      // ... other links ...
      {
        to: '/directory',
        icon: '📖',
        colorClass: 'bg-emerald-500/10 text-emerald-500',
        label: `${performerLabel} Directory`,
        desc: `View opted-in ${performerLabel.toLowerCase()} contact info`,
      },
      // ... other links ...
      {
        to: '/admin/resources',
        icon: '📂',
        colorClass: 'bg-cyan-500/10 text-cyan-500',
        label: `${performerLabel} Resources`,
        desc: `Upload documents and links for ${performerLabelPlural.toLowerCase()}`,
      },
    ],
  },
  // ... other sections ...
], [performerLabel, performerLabelPlural]);
```

- [ ] **Step 4: Verify**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/App.tsx src/views/admin/AdminDashboardView.tsx`
Expected: passes

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/views/admin/AdminDashboardView.tsx src/lib/labelHelpers.ts
git commit -m "feat: replace singer labels in App.tsx and AdminDashboardView"
```

---

### Task 5: Replace singer labels in singer-facing views

**Files:**
- Modify: `src/views/singer/DashboardView.tsx`
- Modify: `src/views/singer/DirectoryView.tsx`
- Modify: `src/views/singer/ProfileView.tsx`
- Modify: `src/views/singer/SeatingFinderView.tsx`
- Modify: `src/views/LoginView.tsx`

- [ ] **Step 1: Singer DashboardView.tsx**

Add `useChoirSettings` import and `pluralizeLabel` import.

Replace:
- Line 193: `title="Singer Dashboard"` → `title={`${performerLabel} Dashboard`}`
- Line 198: `Singer Directory` → `{performerLabel} Directory`
- Line 214: `aria-label="Singer quick actions"` → `aria-label={`${performerLabel} quick actions`}`

- [ ] **Step 2: Singer DirectoryView.tsx**

Replace:
- Line 50: `Loading singer directory...` → `` `Loading ${performerLabel.toLowerCase()} directory...` ``
- Line 59: `Could not load singer directory. Please try again later.` → `` `Could not load ${performerLabel.toLowerCase()} directory. Please try again later.` ``
- Line 93: `title="No Matching Singers"` → `title={`No Matching ${performerLabelPlural}`}`
- Line 97: `'No active singers are currently opted into the directory.'` → `` `No active ${performerLabelPlural.toLowerCase()} are currently opted into the directory.` ``
- Line 123: `{profile.voicePart || 'Singer'}` → `{profile.voicePart || performerLabel}`

- [ ] **Step 3: Singer ProfileView.tsx**

Replace:
- Line 259: `when a singer declines a rehearsal or` → `` `when a ${performerLabel.toLowerCase()} declines a rehearsal or` ``
- Line 316: `Show me in the singer directory` → `` `Show me in the ${performerLabel.toLowerCase()} directory` ``
- Line 318: `Other logged-in singers can see your name...` → `` `Other logged-in ${performerLabelPlural.toLowerCase()} can see your name...` ``

- [ ] **Step 4: SeatingFinderView.tsx**

Replace:
- Line 130: `'No singer roster/profile link was found...'` → `` `No ${performerLabel.toLowerCase()} roster/profile link was found...` ``
- Line 160: `'Assigned Singer'` → `Assigned {performerLabel}`

- [ ] **Step 5: LoginView.tsx**

Replace:
- Line 166: `'Singer Portal'` → `{`${performerLabel} Portal`}`
- Line 204: `placeholder="e.g. singer@choir.org"` → `placeholder={`e.g. ${performerLabel.toLowerCase()}@choir.org`}`
- Line 244: `placeholder="singer@choir.org"` → `placeholder={`${performerLabel.toLowerCase()}@choir.org`}`
- Line 360: `placeholder="e.g. singer@choir.org"` → `placeholder={`e.g. ${performerLabel.toLowerCase()}@choir.org`}`

- [ ] **Step 6: Commit**

```bash
git add src/views/singer/ src/views/LoginView.tsx
git commit -m "feat: replace singer labels in singer-facing views and login"
```

---

### Task 6: Replace singer labels in admin views

**Files:**
- Modify: `src/views/admin/RosterView.tsx`
- Modify: `src/views/admin/ReportsView.tsx`
- Modify: `src/views/admin/SeatingView.tsx`
- Modify: `src/views/admin/AttendanceView.tsx`
- Modify: `src/views/admin/EventRosterView.tsx`
- Modify: `src/views/admin/AuditionsView.tsx`
- Modify: `src/views/admin/PatronsView.tsx`
- Modify: `src/views/admin/PollsDashboardView.tsx`
- Modify: `src/views/admin/ResourcesView.tsx`
- Modify: `src/views/admin/SetListView.tsx`
- Modify: `src/views/admin/event-roster/useEventRosterExport.tsx`
- Modify: `src/views/admin/event-roster/useRsvpBulkActions.ts`
- Modify: `src/views/admin/setlists/SetListToolbar.tsx`
- Modify: `src/views/admin/polls/PollDetailsModal.tsx`
- Modify: `src/views/admin/communications/AudienceStep.tsx`
- Modify: `src/views/admin/communications/ReviewStep.tsx`
- Modify: `src/views/admin/communications/ReviewSidebar.tsx`
- Modify: `src/views/admin/communications/PreFlightChecklist.tsx`
- Modify: `src/views/admin/communications/SetlistWarning.tsx`
- Modify: `src/views/admin/communications/TemplatesPanel.tsx`
- Modify: `src/views/admin/RsvpDashboardView.tsx`
- Modify: `src/views/public-rsvp/RsvpRehearsalsList.tsx`
- Modify: `src/views/PublicRsvpView.tsx`

Each replacement follows the same pattern. For each file:
1. Add import: `import { useChoirSettings } from '../../hooks/useDocumentTitle';`
2. Add import: `import { pluralizeLabel } from '../../lib/labelHelpers';`
3. In the component: `const { performerLabel } = useChoirSettings();` and `const performerLabelPlural = pluralizeLabel(performerLabel);`
4. Replace hardcoded "singer"/"Singers" text with `{performerLabel}` / `{performerLabelPlural}` / `{performerLabelPlural.toLowerCase()}`

Replacements by file:

**RosterView.tsx (lines 213-214, 235):**
- `title="Add Singer"` / `Add Singer` → `title={`Add ${performerLabel}`}` / `Add {performerLabel}`
- `'Singer Directory'` → `{`${performerLabel} Directory`}`

**ReportsView.tsx (lines 89, 220, 374, 390, 392):**
- `header: 'Singer'` → `header: performerLabel`
- `'Singer'` (CSV header) → `performerLabel`
- `Total Singers` → `Total {performerLabelPlural}`
- `Singer Attendance Detail` → `{performerLabel} Attendance Detail`
- `Singers with 2 or more absences...` → `{performerLabelPlural} with 2 or more absences...`

**SeatingView.tsx (lines 255, 322, 679-695, 778, 861):**
Replace each occurrence of "singer"/"singers" with the label. Note some are in string literals passed to `dialog.confirm`, others are in JSX text.

**PollsDashboardView.tsx (lines 327, 570):**
- `coordinate singer feedback` → `coordinate ${performerLabel.toLowerCase()} feedback`
- `Recipients default to all singers with status Active or On Break.` → `Recipients default to all ${performerLabelPlural.toLowerCase()} with status Active or On Break.`

**ResourcesView.tsx (lines 356-357, 424):**
- `title="Singer Resources"` → `title={`${performerLabel} Resources`}`
- `description="...for active singers to view..."` → `` `...for active ${performerLabelPlural.toLowerCase()} to view...` ``
- `placeholder="e.g. Choir Singer Handbook"` → `placeholder={`e.g. ${performerLabel} Handbook`}`

**EventRosterView.tsx (lines 311, 347, 410, 422, 434, 472):**
- `placeholder="Search active singers..."` → `` `Search active ${performerLabelPlural.toLowerCase()}...` ``
- `aria-label="Sort singers"` → `` `aria-label={"Sort ${performerLabelPlural.toLowerCase()}"}` ``
- `aria-label="Mark selected singers attending"` → `` `Mark selected ${performerLabelPlural.toLowerCase()} attending` ``
- `aria-label="Mark selected singers declined"` → `` `Mark selected ${performerLabelPlural.toLowerCase()} declined` ``
- `aria-label="Reset RSVPs for selected singers"` → `` `Reset RSVPs for selected ${performerLabelPlural.toLowerCase()}` ``
- `Updating singer {bulkProgress.current} of {bulkProgress.total}` → `` `Updating ${performerLabel.toLowerCase()} ${bulkProgress.current} of ${bulkProgress.total}` ``

**AuditionsView.tsx (lines 147-148, 162, 329, 500):**
- `title: 'Convert To Singer'` → `title: `Convert To ${performerLabel}``
- `Create a singer profile for...` → `` `Create a ${performerLabel.toLowerCase()} profile for...` ``
- `creating the singer profile.` → `` `creating the ${performerLabel.toLowerCase()} profile.` ``
- `Convert to Singer` → `Convert to {performerLabel}` (2 occurrences)

**PatronsView.tsx (line 213):**
- `'Singer'` (badge label) → `performerLabel`

**SetListView.tsx (lines 95, 147, 149):**
- `singer visibility` → `${performerLabel.toLowerCase()} visibility`
- `singer visibility from the parent` → `${performerLabel.toLowerCase()} visibility from the parent`
- `not be visible on the Singer Dashboard.` → `` `not be visible on the ${performerLabel} Dashboard.` ``

**SetListToolbar.tsx (lines 93, 102):**
- `Singer Visibility` → `{performerLabel} Visibility`
- `Approved for Singers` → `Approved for {performerLabelPlural}`

**AudienceStep.tsx (lines 171, 214, 234, 240, 244, 280):**
- `subtitle: 'matched singers'` → `` `matched ${performerLabelPlural.toLowerCase()}` ``
- `'Matched Singers'` → `Matched {performerLabelPlural}`
- `View matched singers` → `View matched {performerLabelPlural.toLowerCase()}`
- `title="Singer Preview (showing first 5)"` → `title={`${performerLabel} Preview (showing first 5)`}`
- `No singers matched with the current filters.` → `No {performerLabelPlural.toLowerCase()} matched with the current filters.`
- `and {recipients.length - 5} more singers...` → `` `and ${recipients.length - 5} more ${performerLabelPlural.toLowerCase()}...` ``

**ReviewStep.tsx (line 101):**
- `Send to {draft.selectedRecipients.length} Singers` → `Send to {draft.selectedRecipients.length} {performerLabelPlural}`

**ReviewSidebar.tsx (lines 94, 207):**
- `subtitle: 'matched singers'` → `` `matched ${performerLabelPlural.toLowerCase()}` ``
- `Send to {selectedRecipients.length} Singers` → `Send to {selectedRecipients.length} {performerLabelPlural}`

**PreFlightChecklist.tsx (lines 91, 121, 146):**
- `The set list hasn't been approved for singers yet.` → `` `The set list hasn't been approved for ${performerLabelPlural.toLowerCase()} yet.` ``
- `title={\`${...length} singers\`}` → `` `title={\`${...length} ${performerLabelPlural.toLowerCase()}\`}` `` (2 occurrences)

**SetlistWarning.tsx (line 18):**
- `The set list hasn't been approved for singers yet.` → `` `The set list hasn't been approved for ${performerLabelPlural.toLowerCase()} yet.` ``

**TemplatesPanel.tsx (line 124):**
- `placeholder="Hello {singerName},...` → No change needed (this contains `{singerName}` which stays as-is — it's a person's name, not the role label)

**PollDetailsModal.tsx (lines 197, 205):**
- `Sent to {contactedSingers.length} singer{s}.` → `` `Sent to ${contactedSingers.length} ${performerLabel.toLowerCase()}${contactedSingers.length === 1 ? '' : 's'}.` ``
- `title: \`Contacted Singers — ${poll.question}\`` → `` `Contacted ${performerLabelPlural} — ${poll.question}` ``

**useEventRosterExport.tsx (lines 63, 75-76):**
- `'No filters active — all singers included'` → `` `No filters active — all ${performerLabelPlural.toLowerCase()} included` ``
- `Exporting {filteredSingers.length} singer{s} currently shown` → `` `Exporting ${filteredSingers.length} ${performerLabel.toLowerCase()}${filteredSingers.length === 1 ? '' : 's'} currently shown` ``

**useRsvpBulkActions.ts (lines 54-55, 64):**
- `Reset RSVP response for this singer?` → `` `Reset RSVP response for this ${performerLabel.toLowerCase()}?` ``
- `Reset RSVP responses for {profileIds.length} selected singers?` → `` `Reset RSVP responses for ${profileIds.length} selected ${performerLabelPlural.toLowerCase()}?` ``
- `Update {profileIds.length} selected singer{s} to {statusLabel}?` → `` `Update ${profileIds.length} selected ${performerLabel.toLowerCase()}${profileIds.length === 1 ? '' : 's'} to ${statusLabel}?` ``

**RsvpDashboardView.tsx (line 44):**
- `update singer responses.` → `` `update ${performerLabel.toLowerCase()} responses.` ``

**RsvpRehearsalsList.tsx (line 58):**
- `Please use your singer dashboard.` → `` `Please use your ${performerLabel.toLowerCase()} dashboard.` ``

**PublicRsvpView.tsx (line 69):**
- `from your singer dashboard.` → `` `from your ${performerLabel.toLowerCase()} dashboard.` ``

- [ ] **Step 1: Commit all admin view changes**

```bash
git add src/views/admin/ src/views/public-rsvp/ src/views/PublicRsvpView.tsx
git commit -m "feat: replace singer labels in admin views"
```

---

### Task 7: Replace singer labels in admin components

**Files:**
- Modify: `src/components/admin/SingerModal.tsx`
- Modify: `src/components/admin/singer-modal/SingerProfileForm.tsx`
- Modify: `src/components/admin/singer-modal/SingerModalFooter.tsx`
- Modify: `src/components/admin/singer-modal/useSingerForm.ts`
- Modify: `src/components/admin/SingerLookupModal.tsx`
- Modify: `src/components/admin/RosterTable.tsx`
- Modify: `src/components/admin/EventRosterTable.tsx`
- Modify: `src/components/admin/RosterSummary.tsx`
- Modify: `src/components/admin/StatusAutomationSettings.tsx`
- Modify: `src/components/admin/VoicePartEditor.tsx`
- Modify: `src/components/admin/SeatingBottomDock.tsx`
- Modify: `src/components/admin/SeatingGrid.tsx`
- Modify: `src/components/admin/SeatingTextList.tsx`
- Modify: `src/components/admin/UnassignedPrintSection.tsx`
- Modify: `src/components/admin/ReadOnlyAdminSeatingPanel.tsx`
- Modify: `src/components/admin/AttendanceSingerActionsSheet.tsx`
- Modify: `src/components/admin/PlayerLinkModal.tsx`
- Modify: `src/components/admin/RosterImportModal.tsx`
- Modify: `src/components/admin/EventModal.tsx`
- Modify: `src/components/admin/PlaceholderPanel.tsx`

Each replacement follows the same pattern. For each file:
1. Add import: `import { useChoirSettings } from '../../../hooks/useDocumentTitle';` (adjust path depth as needed)
2. Add import: `import { pluralizeLabel } from '../../../lib/labelHelpers';` (adjust path depth as needed)
3. In the component: `const { performerLabel } = useChoirSettings();` and `const performerLabelPlural = pluralizeLabel(performerLabel);`
4. Replace hardcoded "singer"/"Singers" text

Key specific replacements:

**SingerModal.tsx (line 47):**
- `title={initialData ? 'Edit Singer' : 'Add Singer'}` → `title={initialData ? `Edit ${performerLabel}` : `Add ${performerLabel}`}`

**SingerProfileForm.tsx (lines 85, 181, 249):**
- `placeholder="e.g. singer@example.com"` → `placeholder={`e.g. ${performerLabel.toLowerCase()}@example.com`}`
- `Show in Singer Directory` → `Show in {performerLabel} Directory`
- `When enabled, logged-in singers can see this singer's name, photo...` → `` `When enabled, logged-in ${performerLabelPlural.toLowerCase()} can see this ${performerLabel.toLowerCase()}'s name, photo...` ``

**SingerModalFooter.tsx (line 45):**
- `Delete Singer` → `Delete {performerLabel}`

**useSingerForm.ts (lines 59-60, 118, 121, 132, 145-146):**
- `You have unsaved changes to this singer's profile.` → `` `You have unsaved changes to this ${performerLabel.toLowerCase()}'s profile.` ``
- `You are adding a new singer with unsaved details.` / `discard this singer?` → `` `You are adding a new ${performerLabel.toLowerCase()} with unsaved details.` / `discard this ${performerLabel.toLowerCase()}?` ``
- `The singer profile was not changed.` → `` `The ${performerLabel.toLowerCase()} profile was not changed.` ``
- `title: 'Could Not Save Singer'` → `title: `Could Not Save ${performerLabel}``
- `title: 'Delete Singer'` → `title: `Delete ${performerLabel}``
- `title: 'Could Not Delete Singer'` → `title: `Could Not Delete ${performerLabel}``
- `message: 'Error deleting singer'` → `` `message: 'Error deleting ${performerLabel.toLowerCase()}'` ``

**SingerLookupModal.tsx (lines 54, 67, 79, 112):**
- `title="Lookup Singer"` → `title={`Lookup ${performerLabel}`}`
- `placeholder="Search singers..."` → `` `placeholder={"Search ${performerLabelPlural.toLowerCase()}..."}` ``
- `{filtered.length} available singer{s}` → `` `${filtered.length} available ${performerLabel.toLowerCase()}${filtered.length === 1 ? '' : 's'}` ``
- `No singers found` → `No {performerLabelPlural} found`

**RosterTable.tsx (lines 196, 200, 205):**
- `title: 'No singers found.'` → `title: `No ${performerLabelPlural} found.``
- `+ Add Singer` → `+ Add {performerLabel}`
- `paginationLabel="singers"` → `paginationLabel={performerLabelPlural.toLowerCase()}`

**EventRosterTable.tsx (lines 256, 260, 265):**
- `title: 'No singers found.'` → `title: `No ${performerLabelPlural} found.``
- `+ Add Singers` → `+ Add {performerLabelPlural}`
- `paginationLabel="singers"` → `paginationLabel={performerLabelPlural.toLowerCase()}`

**RosterSummary.tsx (line 61):**
- `{singerTotal} Singers` → `{singerTotal} {performerLabelPlural}`

**StatusAutomationSettings.tsx (lines 26, 38, 56, 70, 92):**
- `title="Singer Status & Rehearsal Limits"` → `title={`${performerLabel} Status & Rehearsal Limits`}`
- `Automatically mark singers as Active/Inactive...` → `` `Automatically mark ${performerLabelPlural.toLowerCase()} as Active/Inactive...` ``
- `Mark a singer as Inactive after this many...` → `` `Mark a ${performerLabel.toLowerCase()} as Inactive after this many...` ``
- `Automatically mark inactive singers as "On Break"...` → `` `Automatically mark inactive ${performerLabelPlural.toLowerCase()} as "On Break"...` ``
- `warnings are shown to singers and admins.` → `` `warnings are shown to ${performerLabelPlural.toLowerCase()} and admins.` ``

**VoicePartEditor.tsx (lines 63, 140, 143):**
- `Cannot change the label of a voice part with assigned singers` → `` `Cannot change the label of a voice part with assigned ${performerLabelPlural.toLowerCase()}` ``
- `title={\`Click to view the ${count} singer(s) in this voice part\`}` → `` `Click to view the ${count} ${performerLabel.toLowerCase()}${count === 1 ? '' : 's'} in this voice part` ``
- `{count} singer{count === 1 ? '' : 's'}` → `{count} {performerLabel.toLowerCase()}{count === 1 ? '' : 's'}`

**SeatingBottomDock.tsx (lines 163, 261):**
- `Unassigned Singers` → `Unassigned {performerLabelPlural}`
- `All singers assigned` → `All {performerLabelPlural.toLowerCase()} assigned`

**SeatingGrid.tsx (lines 227, 628):**
- `You have {activeSingersForFormationCount} active singers but only {totalSeats} seats.` → `` `You have ${activeSingersForFormationCount} active ${performerLabelPlural.toLowerCase()} but only ${totalSeats} seats.` ``
- `title={assignments[seatKey] ? 'Unassign singer' : 'Delete empty seat'}` → `title={assignments[seatKey] ? `Unassign ${performerLabel.toLowerCase()}` : 'Delete empty seat'}`

**SeatingTextList.tsx (line 47):**
- `'No singers assigned'` → `` `No ${performerLabelPlural.toLowerCase()} assigned` ``

**UnassignedPrintSection.tsx (line 20):**
- `Unassigned Singers: {unassigned.length}` → `Unassigned {performerLabelPlural}: {unassigned.length}`

**ReadOnlyAdminSeatingPanel.tsx (line 40):**
- `Tap a seat to view singer details.` → `` `Tap a seat to view ${performerLabel.toLowerCase()} details.` ``

**AttendanceSingerActionsSheet.tsx (lines 83, 96):**
- `No contact information is listed for this singer.` → `` `No contact information is listed for this ${performerLabel.toLowerCase()}.` ``
- `View/Edit Singer Profile` → `View/Edit {performerLabel} Profile`

**PlayerLinkModal.tsx (line 45):**
- `Share it with singers so they can listen...` → `` `Share it with ${performerLabelPlural.toLowerCase()} so they can listen...` ``

**RosterImportModal.tsx (lines 305, 323, 339, 439, 526, 559, 221):**
- `desc: 'Full name of the singer'` → `` `desc: 'Full name of the ${performerLabel.toLowerCase()}'` ``
- `'Import Singers via CSV'` → `Import {performerLabelPlural} via CSV`
- `Upload a CSV file containing your singer roster...` → `` `Upload a CSV file containing your ${performerLabel.toLowerCase()} roster...` ``
- `Verify parsed singer details...` → `` `Verify parsed ${performerLabel.toLowerCase()} details...` ``
- `Importing {count} Singers...` → `Importing {count} {performerLabelPlural}...`
- `imported <strong>{successCount}</strong> singers into the roster.` → `` `imported <strong>${successCount}</strong> ${performerLabelPlural.toLowerCase()} into the roster.` ``
- `link.setAttribute('download', 'singer_credentials.csv')` → `link.setAttribute('download', `${performerLabel.toLowerCase()}_credentials.csv`)`

**EventModal.tsx (line 649):**
- `reminder to all active singers` → `` `reminder to all active ${performerLabelPlural.toLowerCase()}` ``

**PlaceholderPanel.tsx (line 16):**
- `label: 'Singer Name'` → `label: `{performerLabel} Name``

- [ ] **Step 1: Commit all admin component changes**

```bash
git add src/components/admin/
git commit -m "feat: replace singer labels in admin components"
```

---

### Task 8: Replace singer labels in seating and remaining components

**Files:**
- Modify: `src/components/seating/SeatingPerspectiveToggle.tsx`
- Modify: `src/components/seating/SelectedSeatCard.tsx`
- Modify: `src/components/seating/ReadOnlySeatingGrid.tsx`
- Modify: `src/components/LivePreview.tsx`
- Modify: `src/lib/communicationUtils.ts`
- Modify: `src/hooks/useDashboardCounts.ts`
- Modify: `src/services/communication/attendanceReportService.ts`

**SeatingPerspectiveToggle.tsx (line 17):**
- `Singer View` → `{performerLabel} View`

**SelectedSeatCard.tsx (line 20):**
- `'Assigned singer'` → `` `Assigned ${performerLabel.toLowerCase()}` ``

**ReadOnlySeatingGrid.tsx (lines 98, 110):**
- `aria-label={\`Row ${rIdx + 1}, seat ${sIdx + 1}, assigned singer\`}` → `` `Row ${rIdx + 1}, seat ${sIdx + 1}, assigned ${performerLabel.toLowerCase()}` ``
- `Assigned Singer` → `Assigned {performerLabel}`

**LivePreview.tsx (line 109):**
- `recipientEmail = 'singers@yourchoir.org'` → `recipientEmail = `${performerLabelPlural.toLowerCase()}@yourchoir.org``

**communicationUtils.ts (lines 121-137, 247-265):**
Update `resolvePreviewContent` and `getRenderedPreview` to accept `performerLabel` as a parameter:
```ts
export function resolvePreviewContent(
  // ... existing params
  isHtml: boolean = false,
  performerLabel: string = 'Performer'
): string { ... }

export function getRenderedPreview(
  // ... existing params
  performerLabel: string = 'Performer'
): string { ... }
```
- Line 134: `const rawName = recipient?.name || 'Sample Singer'` → `const rawName = recipient?.name || \`Sample ${performerLabel}\``
Update the call in `getRenderedPreview` to pass `performerLabel` to `resolvePreviewContent`.

**useDashboardCounts.ts (line 48):**
- `'Failed to fetch active singers count'` → `` `Failed to fetch active ${performerLabelPlural.toLowerCase()} count` ``

**attendanceReportService.ts (lines 163-194, 248):**
*Note: This is an async function, not a React component, so do not use \`useChoirSettings()\`.*
Instead, inside `triggerAttendanceReport`, fetch the label asynchronously:
```ts
import { pluralizeLabel } from '../../lib/labelHelpers';

export async function triggerAttendanceReport(eventId: string): Promise<MessageRecord> {
  const performerLabel = await settingsService.getPerformerLabel();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  // ...
```
- `'Unknown Singer'` → `` `Unknown ${performerLabel}` `` (this is a fallback name in email HTML)
- `<h4>Singers Exceeding Rehearsal Miss Limit</h4>` → `<h4>${performerLabelPlural} Exceeding Rehearsal Miss Limit</h4>`

- [ ] **Step 1: Commit**

```bash
git add src/components/seating/ src/components/LivePreview.tsx src/lib/communicationUtils.ts src/hooks/useDashboardCounts.ts src/services/communication/attendanceReportService.ts
git commit -m "feat: replace singer labels in seating and remaining components"
```

---

### Task 9: Replace singer labels in PocketBase hooks (Backend)

The backend (`pocketbase/pb_hooks_src/`) has several hardcoded "Singer" fallbacks for user-facing texts (like email subjects, `{singerName}` replacements, or fallback names). Since hooks run on Goja, they must fetch the setting directly from the DB.

- [ ] **Step 1: Create a settings helper for hooks**
Create `pocketbase/pb_hooks_src/settingsHelpers.ts`:
```ts
export function getPerformerLabel(app: core.App): string {
  try {
    const record = app.dao().findFirstRecordByData("appSettings", "key", "performer_label");
    return (record?.get("value") as string) || "Performer";
  } catch (e) {
    return "Performer";
  }
}

export function pluralizeLabel(label: string): string {
  return `${label}s`;
}
```

- [ ] **Step 2: Update all hook files that use fallback "Singer" strings**
Files to modify (search for "Singer" or "Singers"):
- `pocketbase/pb_hooks_src/maintenance/eventReminderTask.ts`
- `pocketbase/pb_hooks_src/adminNotifications.ts`
- `pocketbase/pb_hooks_src/maintenance/postEventReportTask.ts`
- `pocketbase/pb_hooks_src/rsvp/resolvePlaceholders.ts`
- `pocketbase/pb_hooks_src/email/messageHookRules.ts`
- `pocketbase/pb_hooks_src/email/queueProcessor.ts`
- `pocketbase/pb_hooks_src/rsvp/rsvpHelpers.ts`

Example change (in `queueProcessor.ts`):
```ts
import { getPerformerLabel } from '../settingsHelpers';

// inside the hook callback where `app` (or `$app`) is available:
const performerLabel = getPerformerLabel($app);
const recipientName = (record.get('recipientName') as string) || performerLabel;
```

- [ ] **Step 3: Generate and Check Hooks**
```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```
Expected: successful build with no errors.

- [ ] **Step 4: Commit**
```bash
git add pocketbase/pb_hooks_src/ pocketbase/pb_hooks/
git commit -m "feat(hooks): replace singer labels with performer_label from appSettings"
```

---

### Task 10: Verify all changes

- [ ] **Step 1: Run ESLint**

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/
```
Expected: 0 warnings, 0 errors

- [ ] **Step 2: Run tests**

```bash
rtk npx vitest run
```
Expected: all tests pass

- [ ] **Step 3: Manual verification checklist**
  1. Open admin Settings → General tab → verify "Participant Label" input shows and saves
  2. Change label to "Member", save → verify pages update
  3. Check Login page heading shows "Member Portal", placeholders show "member@choir.org"
  4. Check admin dashboard shows "Member Directory", "Add Member", "Active Members"
  5. Check SingerModal shows "Add Member" / "Edit Member"
  6. Check RosterTable shows "No members found", "+ Add Member"
  7. Change label back to "Performer" → verify it restores correctly
  8. Empty the field → verify it falls back to "Performer"
