# Dead Code Elimination Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Eliminate all dead code detected by knip — remove unused files, unexport internal-only symbols, delete truly dead code, and silence knip false positives from dynamic bundle wiring.

**Architecture:** The dead code falls into 9 independent categories. Each category is a self-contained task that does not depend on others, so tasks can be parallelized. The final task re-runs knip and project checks to verify.

**Tech Stack:** TypeScript, React, PocketBase hooks generator, knip, ESLint

---

### Task 1: Configure knip to ignore dynamically-wired pocketbase hook files

9 pocketbase hook source files are reported as "unused" by knip, but they are actually alive — they are dynamically wired into `main.pb.js` by the generator (`generate-main-pb-js.ts`) via symbol-name string matching (`detectBundles()`), not static imports. Knip cannot trace these. Add them to knip's `ignore` list with a comment.

**Files:**
- Modify: `knip.json`

- [ ] **Step 1: Edit knip.json to add ignored dynamic bundle files**

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "project": ["src/**/*.{ts,tsx}", "pocketbase/pb_hooks_src/**/*.ts"],
  "ignore": [
    "pocketbase/pb_hooks_src/adminNotifications.ts",
    "pocketbase/pb_hooks_src/attendanceFinalizer.ts",
    "pocketbase/pb_hooks_src/calendarEndpoint.ts",
    "pocketbase/pb_hooks_src/checkoutEndpoints.ts",
    "pocketbase/pb_hooks_src/playerEndpoints.ts",
    "pocketbase/pb_hooks_src/rsvpEndpoints.ts",
    "pocketbase/pb_hooks_src/singerSeatingEndpoint.ts",
    "pocketbase/pb_hooks_src/stripeService.ts"
  ]
}
```

Why 8 and not 9: `email/index.ts` is genuinely dead (Task 2 will delete it).

- [ ] **Step 2: Verify no regression in knip findings for pocketbase files**

Run: `rtk npm run knip`
Expected: The 8 ignored files no longer appear under "Unused files". The remaining 2 unused files are `pocketbase/pb_hooks_src/email/index.ts` and `src/services/communication/index.ts`.

---

### Task 2: Delete dead barrel files

Two barrel files (`index.ts` that re-export submodules) have zero consumers — all code imports the submodules directly.

**Files:**
- Delete: `pocketbase/pb_hooks_src/email/index.ts`
- Delete: `src/services/communication/index.ts`

- [ ] **Step 1: Delete `pocketbase/pb_hooks_src/email/index.ts`**

```bash
rm pocketbase/pb_hooks_src/email/index.ts
```

This barrel re-exported `hookText`, `hookJson`, `emailTypes`, `emailRendering`, `messageHookRules`, `attendanceReport`, `mailjetRenderer`, `queueProcessor`. None of those re-exports are used via this barrel — all consumers import directly from the submodule paths (e.g., `./email/hookJson`).

- [ ] **Step 2: Delete `src/services/communication/index.ts`**

```bash
rm src/services/communication/index.ts
```

This barrel re-exported `types`, `messageRepository`, `recipientResolver`, `sentTaskStatusService`, `messageTokenService`, `messageDispatchService`, `attendanceReportService`. Same situation — nothing imports from the barrel.

- [ ] **Step 3: Run knip to verify**

Run: `rtk npm run knip`
Expected: The two deleted files no longer appear in "Unused files".

---

### Task 3: Remove dead component re-exports from the UI barrel

`src/components/ui/index.ts` re-exports 11 components (and their types) that nothing imports:

**Dead barrel re-exports to remove:**
- `Card`
- `Tabs`
- `ProgressBar`
- `ConfirmDialog`
- `Toast`
- `Table`
- `Pagination`
- `MarkdownEditor`
- `FloatingSaveBar`
- `SavingIndicator`
- `PhotoUploader`

**Files:**
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Read the current barrel file**

Read: `src/components/ui/index.ts` to see current state.

- [ ] **Step 2: Edit barrel file to remove dead re-exports**

Remove the 11 lines that re-export the dead components. The remaining exports to keep are: `Spinner`, `Button`, `Input`, `Select`, `Badge`, `Modal`, `FormField`, `EmptyState`, `TabPanel`.

- [ ] **Step 3: Run knip to verify**

Run: `rtk npm run knip`
Expected: The 11 dead barrel re-exports no longer appear in "Unused exports". Component directories may now appear as "Unused files" (handled in Task 4).

---

### Task 4: Delete dead component directories under `components/ui/`

With the barrel re-exports removed in Task 3, the underlying component files are now unreferenced. These components are either:
- **Truly dead** — never used anywhere: `Card`, `Tabs`, `ProgressBar`, `ConfirmDialog`, `Toast`, `Table`
- **Duplicates** — the app uses canonical versions in `components/common/` or `components/admin/`: `Pagination`, `FloatingSaveBar`, `SavingIndicator`, `MarkdownEditor`, `PhotoUploader`

Delete each component directory (component + test + story files).

**Files to delete:**
- `src/components/ui/Card/`
- `src/components/ui/Tabs/`
- `src/components/ui/ProgressBar/`
- `src/components/ui/ConfirmDialog/`
- `src/components/ui/Toast/`
- `src/components/ui/Table/`
- `src/components/ui/Pagination/`
- `src/components/ui/MarkdownEditor/`
- `src/components/ui/FloatingSaveBar/`
- `src/components/ui/SavingIndicator/`
- `src/components/ui/PhotoUploader/`

- [ ] **Step 1: Delete each unused component directory**

For each component, check if the directory exists and delete it:

```bash
rm -rf src/components/ui/Card
rm -rf src/components/ui/Tabs
rm -rf src/components/ui/ProgressBar
rm -rf src/components/ui/ConfirmDialog
rm -rf src/components/ui/Toast
rm -rf src/components/ui/Table
rm -rf src/components/ui/Pagination
rm -rf src/components/ui/MarkdownEditor
rm -rf src/components/ui/FloatingSaveBar
rm -rf src/components/ui/SavingIndicator
rm -rf src/components/ui/PhotoUploader
```

- [ ] **Step 2: Run knip to verify**

Run: `rtk npm run knip`
Expected: The component directories no longer appear in any knip output.

---

### Task 5: Make internal-only exports file-private

Several symbols are exported but only consumed within their own file. Remove the `export` keyword so they are module-private.

**Files:**
- Modify: `src/lib/authRedirect.ts`
- Modify: `src/lib/communicationUtils.ts`
- Modify: `src/lib/musicImportUtils.ts`
- Modify: `src/services/offlineMediaStore.ts`
- Modify: `src/services/settingsService.ts`
- Modify: `src/views/admin/events/eventCommunication.ts`

- [ ] **Step 1: Remove `export` from `PUBLIC_ROUTE_PREFIXES` in `src/lib/authRedirect.ts`**

The constant is used internally at line 12. Change:

```ts
export const PUBLIC_ROUTE_PREFIXES = ['/login', ...];
```

to:

```ts
const PUBLIC_ROUTE_PREFIXES = ['/login', ...];
```

- [ ] **Step 2: Remove `export` from `COMPLIANT_FOOTER_HTML` in `src/lib/communicationUtils.ts`**

Used internally at line 246. Change `export const` to `const` (or `export` → remove on the declaration).

- [ ] **Step 3: Remove `export` from `trimStr`, `parseComposerArranger`, `parsePurchaseDate` in `src/lib/musicImportUtils.ts`**

All three are used only internally within the same file. Remove the `export` keyword from each.

- [ ] **Step 4: Remove `export` from `revokeOfflineTrackUrl`, `isTrackDownloaded`, `listDownloadedTrackIds` in `src/services/offlineMediaStore.ts`**

All three are used only internally within the same file. Remove the `export` keyword from each.

- [ ] **Step 5: Remove `export` from `DEFAULT_ROSTER_SETTINGS`, `DEFAULT_MUSIC_LIBRARY_SETTINGS`, `DEFAULT_POLL_SETTINGS` in `src/services/settingsService.ts`**

All three are used only internally within the same file. Remove the `export` keyword from each.

- [ ] **Step 6: Remove `export` from `buildEventCommunicationTemplateValues` in `src/views/admin/events/eventCommunication.ts`**

Used internally within the same file. Remove the `export` keyword.

- [ ] **Step 7: Run knip to verify**

Run: `rtk npm run knip`
Expected: These symbols no longer appear in "Unused exports". No new "Unused files" or errors should appear.

---

### Task 6: Delete truly dead code

These symbols are exported AND never referenced anywhere in the codebase — not even internally within their own files. Delete them entirely.

**Files:**
- Modify: `src/lib/music/performanceHistory.ts`
- Modify: `src/lib/textSafety.ts`
- Modify: `src/services/offlineMediaStore.ts`
- Modify: `src/views/admin/communications/types.ts`
- Modify: `src/views/admin/music-library/table/MusicLibraryBadges.tsx`

- [ ] **Step 1: Delete `formatMostRecentPerformanceDate` from `src/lib/music/performanceHistory.ts`**

Remove the function declaration entirely. It has no internal callers and no external consumers.

- [ ] **Step 2: Delete `sanitizeHtmlTemplateData` from `src/lib/textSafety.ts`**

Remove the function declaration entirely. It has no internal callers and no external consumers.

- [ ] **Step 3: Delete `getOfflineStorageSummary` from `src/services/offlineMediaStore.ts`**

Remove the function declaration entirely. It has no internal callers and no external consumers.

- [ ] **Step 4: Delete `DEFAULT_FILTERS` from `src/views/admin/communications/types.ts`**

Remove the exported constant declaration. It has no internal callers and no external consumers.

- [ ] **Step 5: Delete `TrackBadge` from `src/views/admin/music-library/table/MusicLibraryBadges.tsx`**

Remove the component function declaration entirely. Note: if this component has a test file, delete that too.

- [ ] **Step 6: Run knip to verify**

Run: `rtk npm run knip`
Expected: These symbols no longer appear in "Unused exports".

---

### Task 7: Fix unresolved test import

A test file has a broken relative import path — uses `.ts` extension instead of `.tsx`.

**Files:**
- Modify: `test/views/admin/communications/useCommunicationDraft.test.ts`

- [ ] **Step 1: Fix the import path**

In `test/views/admin/communications/useCommunicationDraft.test.ts`, line 17, change:

```ts
} as unknown as ReturnType<typeof import('../../../../src/contexts/DialogContext.ts').useDialog>;
```

to:

```ts
} as unknown as ReturnType<typeof import('../../../../src/contexts/DialogContext.tsx').useDialog>;
```

- [ ] **Step 2: Run relevant test to verify**

Run: `rtk npx vitest run test/views/admin/communications/useCommunicationDraft.test.ts`
Expected: Tests pass.

---

### Task 8: Clean up dead type exports

67 type exports are unused. They fall into three sub-categories:

**A. PocketBase hook types (15):** Interfaces/types in `pocketbase/pb_hooks_src/email/emailTypes.ts` — these are used by the dynamically-wired email hook code. Add to knip ignore list (like Task 1).

**B. UI barrel types (29):** Type re-exports in `src/components/ui/index.ts` that correspond to the 11 dead components from Tasks 3-4. Already cleaned up by removing the barrel re-exports — the individual type files may still export these types.

**C. Source file types (23):** Types/interfaces in various `src/` files that are exported but never imported.

- [ ] **Step 1: Check what remains after Tasks 1-6**

Run: `rtk npm run knip | grep "^Unused exported types" -A 100`
Review the remaining unused type exports to determine which are:
- Still referenced from the barrel file (already handled)
- PocketBase types that need knip ignore entries
- Truly unused source types

- [ ] **Step 2: Add pocketbase emailTypes to knip ignore (if still reported)**

If `emailTypes.ts` types still appear, add to `knip.json` ignore list:

```json
"pocketbase/pb_hooks_src/email/emailTypes.ts"
```

- [ ] **Step 3: For each remaining unused type export, determine action:**

Read each file and check if the type is:
- **Used only internally** → Remove `export` keyword, making it module-private
- **Truly dead** → Delete the type declaration entirely
- **Part of a public component API** → Keep exported (it's a public contract, even if not consumed internally)

Common types to de-export:
- `Step` from `src/components/WizardStepper.tsx`
- `EventRosterExportProfile`, `EventRosterExportVoicePart`, `EventRosterExportSection` from `src/lib/eventRoster/exportCsv.ts`
- `DisplayTone` from `src/lib/statusDisplay.ts`
- `OfflineTrackRecord`, `OfflinePlaylistRecord` from `src/services/offlineMediaStore.ts`
- `SingerReport` from `src/services/reportService.ts`
- `MultiSelectOption` from `src/views/admin/music-library/MultiSelectDropdown.tsx`
- Duplicated type re-exports from `src/services/communicationService.ts` and `src/services/communication/types.ts`

- [ ] **Step 4: Run knip to verify**

Run: `rtk npm run knip`
Expected: All unused type exports are resolved — either deleted, de-exported, or ignored.

---

### Task 9: Verify project health

Run the full verification suite to ensure no regressions. Since we're touching pocketbase hook sources (deleting `email/index.ts`), the pb-hooks check is required.

- [ ] **Step 1: Run knip to confirm zero remaining findings**

Run: `rtk npm run knip`
Expected: No unused files, no unused exports, no unused types (or minimal false positives that have been documented).

- [ ] **Step 2: Run pocketbase hooks check**

Run: `rtk npm run check:pb-hooks`
Expected: All checks pass. The generated `main.pb.js` should not change behavior since `email/index.ts` was a dead barrel.

- [ ] **Step 3: Run TypeScript type check**

Run: `rtk npx tsc -b`
Expected: No type errors.

- [ ] **Step 4: Run ESLint**

Run: `rtk npm run lint`
Expected: No lint errors.

- [ ] **Step 5: Run tests**

Run: `rtk npm test`
Expected: All tests pass.
