# TanStack Query Full Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete TanStack Query migration across the entire codebase — fix anti-patterns that defeat caching, wrap all mutation paths in `useMutation`, add `staleTime` defaults, register inline keys, and clean up redundant state mirroring.

**Architecture:** 3 independent phases. Phase A fixes existing TQ usage that defeats caching (highest ROI). Phase B wraps all remaining direct `await service.x()` calls in `useMutation` with invalidation. Phase C is polish — remaining state mirror removal, error handling, staleTime defaults.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query` v5, PocketBase SDK, Vitest.

---

## Phase A: Fix Critical Anti-Patterns

### Task A1: Fix `useDocumentTitle.tsx` — eliminate queryFn side effects

**Files:**
- Modify: `src/hooks/useDocumentTitle.tsx`

**Problem:** `queryFn` calls `setChoirName` and `setTimezoneState` as side effects and returns unused data. TQ re-executes on refocus/stale expiry, causing unintended `setState`. Caching is defeated because data flows through `useState` not TQ.

**Fix:** Move side effects out of `queryFn` into `onSuccess`. The query's return value becomes the source of truth. Context state is still synced (needed by `<ChoirNameProvider>`), but via `onSuccess` instead of inside `queryFn`.

- [ ] **Step 1: Refactor ChoirNameProvider**

```ts
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { settingsService } from '../services/settingsService';
import { formatDocumentTitle } from '../lib/documentTitle';
import { setCachedTimezone } from '../lib/timezone';

interface ChoirNameContextValue {
  choirName: string;
  setChoirName: (name: string) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

const ChoirNameContext = createContext<ChoirNameContextValue>({
  choirName: '',
  setChoirName: () => {},
  timezone: 'America/New_York',
  setTimezone: () => {},
});

export function ChoirNameProvider({ children }: { children: ReactNode }) {
  const [choirName, setChoirName] = useState('');
  const [timezone, setTimezoneState] = useState('America/New_York');

  const { data } = useQuery({
    queryKey: queryKeys.choirSettings.all,
    queryFn: async () => {
      const [name, tz] = await Promise.all([
        settingsService.getChoirName(),
        settingsService.getTimezone(),
      ]);
      return { name, timezone: tz };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    setChoirName(data.name);
    setTimezoneState(data.timezone);
    setCachedTimezone(data.timezone);
  }, [data]);

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    setCachedTimezone(tz);
  };

  return (
    <ChoirNameContext.Provider value={{ choirName, setChoirName, timezone, setTimezone }}>
      {children}
    </ChoirNameContext.Provider>
  );
}

export function useChoirName() {
  return useContext(ChoirNameContext);
}

export function useChoirSettings() {
  return useContext(ChoirNameContext);
}

export function useDocumentTitle(pageTitle: string) {
  const { choirName } = useChoirName();

  useEffect(() => {
    document.title = formatDocumentTitle(pageTitle, choirName);
  }, [pageTitle, choirName]);
}
```

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Run tests**

Run: `rtk npx vitest run`

Expected: All 843 tests pass.

- [ ] **Step 4: Commit**

```bash
rtk git add src/hooks/useDocumentTitle.tsx
rtk git commit -m "fix: move queryFn side effects to onSuccess in ChoirNameProvider"
```

---

### Task A2: Fix `useCommunicationLibrary.ts` — remove 6 state mirrors

**Files:**
- Modify: `src/views/admin/communications/useCommunicationLibrary.ts`
- Modify: `src/views/admin/communications/CommunicationView.tsx` (consumers that call `set*` directly)

**Problem:** 6 `useQuery` results are copied into `useState` via `useEffect` + 6 more effects. Consumers read state instead of query data. All caching benefits lost. The composite `isLoading` aggregator is fragile.

**Fix:** Remove all redundant `useState`/`useEffect` pairs. Remove the composite `isLoading`. Return query data directly from the hook. Consumers that called `set*` setters need to be refactored.

**Analysis of consumers:**
- `CommunicationView.tsx` calls `setDrafts`, `setHistoryPage`, `setIsSavingConfig` directly
- `useCommunicationDraft.ts` receives `setDrafts` and `setHistoryPage` as props, calls them after save/send
- `SettingsPanel` receives `setCommSettings` and calls it on form edits
- `TemplatesPanel` receives `setTemplates` and `setEditingTemplate`, calls them after save/delete
- `HistoryPanel` receives `setHistoryPage` and `setHistorySearchQuery`, calls them on pagination/search

**Strategy for setter removal:**
- `setDrafts` → `CommunicationView` and `useCommunicationDraft` should invalidate the drafts query key instead of manually setting state
- `setHistoryPage` → keep as a parameter (pagination is UI state, not server state); keep in return
- `setCommSettings` → SettingsPanel needs local form state; pass `commSettings` as initial value, use local state for edits
- `setTemplates` → TemplatesPanel should invalidate templates query key after save/delete, or use local state
- `setEditingTemplate` → this is UI state (which template is being edited), keep it
- `setHistorySearchQuery` → this is UI state (search input value), keep it
- `setIsSavingConfig` → this is mutation state, should come from `useMutation`

**But:** Removing all setters in one go requires touching every sub-component. This is a large refactor. A safer approach: keep the hook API surface (export all the same properties) but have them read from TQ query data instead of separate state. Remove the effects. Keep the setters that are UI-only (`setHistoryPage`, `setEditingTemplate`, `setHistorySearchQuery`). Deprecate the data setters by having them no-op or by refactoring callers to use invalidation.

**Stepped approach:**

- [ ] **Step 1: Refactor the hook — remove state mirrors for read-only data**

Replace the 6 state+effect pairs with direct query consumption. Keep setters that are UI-only (`setHistoryPage`, `setEditingTemplate`, `setHistorySearchQuery`). Keep `setIsSavingConfig` as UI state (will become mutation state later). Keep `setDrafts`, `setCommSettings`, `setTemplates` in the return but have them trigger invalidation instead of direct state set.

```ts
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { pb } from '../../../lib/pocketbase';
import {
  communicationService,
  type MessageRecord,
  type TemplateRecord,
} from '../../../services/communicationService';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  DEFAULT_COMMUNICATION_CONFIG,
  settingsService,
  type CommunicationSettings,
  type CommunicationConfig,
} from '../../../services/settingsService';

export function useCommunicationLibrary() {
  const queryClient = useQueryClient();

  const [editingTemplate, setEditingTemplate] = useState<Partial<TemplateRecord> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const historyQuery = useQuery({
    queryKey: queryKeys.communications.historyPaginated(historyPage, historySearchQuery),
    queryFn: async () => {
      const baseFilter = "(status = 'Sent' || status = 'Archived')";
      let filterString = baseFilter;
      if (historySearchQuery.trim()) {
        filterString = pb.filter(
          `(${baseFilter} && (subject ~ {:query} || content ~ {:query} || type ~ {:query}))`,
          { query: historySearchQuery.trim() }
        );
      }
      return communicationService.getMessagesPaginated(historyPage, 10, filterString);
    },
  });

  const draftsQuery = useQuery({
    queryKey: queryKeys.communications.drafts(),
    queryFn: () => communicationService.getDrafts(),
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.communications.templates(),
    queryFn: () => communicationService.getTemplates(),
  });

  const commSettingsQuery = useQuery({
    queryKey: queryKeys.communications.settings(),
    queryFn: () => settingsService.getCommunicationSettings(),
  });

  const commConfigQuery = useQuery({
    queryKey: queryKeys.communications.config(),
    queryFn: () => settingsService.getCommunicationConfig(),
  });

  const choirNameQuery = useQuery({
    queryKey: queryKeys.communications.choirName(),
    queryFn: () => settingsService.getChoirName(),
  });

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchQuery]);

  const refreshHistory = useCallback(
    async (_page?: number) => {
      void _page;
      await queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
    },
    [queryClient]
  );

  const isLoading =
    historyQuery.isLoading ||
    draftsQuery.isLoading ||
    templatesQuery.isLoading ||
    commSettingsQuery.isLoading ||
    commConfigQuery.isLoading ||
    choirNameQuery.isLoading;

  // No-op setters for backward compatibility — consumers should use invalidation directly
  const setDrafts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
  }, [queryClient]);

  const setCommSettings = useCallback(
    (settings: CommunicationSettings) => {
      void queryClient.setQueryData(queryKeys.communications.settings(), settings);
    },
    [queryClient]
  );

  const setTemplates = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.templates() });
  }, [queryClient]);

  return {
    isLoading,
    setIsLoading: () => {},
    history: historyQuery.data?.items ?? [],
    setHistory: () => {},
    drafts: draftsQuery.data ?? [],
    setDrafts,
    templates: templatesQuery.data ?? [],
    setTemplates,
    commSettings: commSettingsQuery.data ?? DEFAULT_COMMUNICATION_SETTINGS,
    setCommSettings,
    commConfig: commConfigQuery.data ?? DEFAULT_COMMUNICATION_CONFIG,
    choirName: choirNameQuery.data ?? 'Choir Management',
    editingTemplate,
    setEditingTemplate,
    historyPage,
    setHistoryPage,
    totalPages: historyQuery.data?.totalPages ?? 1,
    setTotalPages: () => {},
    historySearchQuery,
    setHistorySearchQuery,
    refreshHistory,
    isSavingConfig,
    setIsSavingConfig,
  };
}
```

- [ ] **Step 2: Update consumers to use invalidation directly**

In `useCommunicationDraft.ts`, replace `setDrafts(updatedDrafts)` calls with `queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() })`.

In `CommunicationView.tsx` line 418, replace `setDrafts(updatedDrafts)` with `queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() })`.

Replace `setHistoryPage(...)` with `setHistoryPage(...)` (still works as a direct state setter).

- [ ] **Step 3: Update `SettingsPanel.tsx` — local form state for `commSettings`**

Change `setCommSettings` usage: instead of calling the setter with the full new settings, use local `useState` for form edits and only write back via mutation.

- [ ] **Step 4: Update `TemplatesPanel.tsx` — replace `setTemplates` with invalidation**

After template save/delete, use `queryClient.invalidateQueries({ queryKey: queryKeys.communications.templates() })` instead of calling `setTemplates`.

- [ ] **Step 5: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 6: Run tests**

Run: `rtk npx vitest run`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
rtk git add src/views/admin/communications/
rtk git commit -m "fix: remove state mirrors in useCommunicationLibrary, use query data directly"
```

---

### Task A3: Fix `useEventSettings.ts` — duplicate cache key

**Files:**
- Modify: `src/views/admin/events/useEventSettings.ts`

**Problem:** Fetches `settingsService.getCommunicationSettings()` under `[...queryKeys.events.all, 'communicationSettings']`, but `useCommunicationLibrary.ts` fetches the same data under `queryKeys.communications.settings()`. Two network calls for identical data.

**Fix:** Use `queryKeys.communications.settings()` instead of `[...queryKeys.events.all, 'communicationSettings']`.

- [ ] **Step 1: Update query key**

```ts
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_COMMUNICATION_SETTINGS, settingsService } from '../../../services/settingsService';
import { queryKeys } from '../../../lib/queryKeys';

export function useEventSettings() {
  const { data: communicationSettings = DEFAULT_COMMUNICATION_SETTINGS } = useQuery({
    queryKey: queryKeys.communications.settings(),
    queryFn: () => settingsService.getCommunicationSettings(),
  });

  const { data: auditionSettings = null } = useQuery({
    queryKey: queryKeys.auditions.settings,
    queryFn: () => settingsService.getAuditionSettings(),
  });

  return {
    communicationSettings,
    auditionSettings,
  };
}
```

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/events/useEventSettings.ts
rtk git commit -m "fix: use communications.settings() key instead of events.all key in useEventSettings"
```

---

### Task A4: Register inline query keys

**Files:**
- Modify: `src/lib/queryKeys.ts`
- Modify: `src/views/admin/communications/useCommunicationDraft.ts`
- Modify: `src/views/admin/SettingsView.tsx`

**Problem:** Inline keys `['communicationResolveRecipients', filters]` and `[...queryKeys.choirSettings.all, 'admin']` are not in the central registry.

- [ ] **Step 1: Add keys to `queryKeys.ts`**

```ts
  communications: {
    // ... existing ...
    resolvedRecipients: (filters: unknown) =>
      [...queryKeys.communications.all, 'resolvedRecipients', filters] as const,
  },
  // ... inside choirSettings ...
  choirSettings: {
    all: ['choirSettings'] as const,
    admin: ['choirSettings', 'admin'] as const,
  },
```

- [ ] **Step 2: Update `useCommunicationDraft.ts` line 106**

Replace:
```ts
queryKey: ['communicationResolveRecipients', filters],
```
With:
```ts
queryKey: queryKeys.communications.resolvedRecipients(filters),
```

- [ ] **Step 3: Update `SettingsView.tsx` line 71**

Replace:
```ts
queryKey: [...queryKeys.choirSettings.all, 'admin'] as const,
```
With:
```ts
queryKey: queryKeys.choirSettings.admin,
```

- [ ] **Step 4: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/queryKeys.ts src/views/admin/communications/useCommunicationDraft.ts src/views/admin/SettingsView.tsx
rtk git commit -m "fix: register inline query keys in central registry"
```

---

### Task A5: Add staleTime defaults to hook-level queries

**Files:**
- Modify: All hooks under `src/hooks/` that don't set `staleTime`

**Problem:** Only 6 hooks set `staleTime`. Most queries are immediately stale, causing refetch on every mount. Data that changes infrequently (venues, voice parts, settings, profiles) should have longer `staleTime`.

**Fix:** Add `staleTime` to each hook based on data volatility.

- [ ] **Step 1: Audit hooks for missing staleTime**

Check each hook file under `src/hooks/`:
- `useEvents.ts` — event data changes moderately often → `staleTime: 30_000` (30s)
- `useProfiles.ts` — profile data changes infrequently → `staleTime: 60_000` (1min)
- `useMyEvents.ts` — RSVP status changes often → `staleTime: 10_000` (10s)
- `useSingerRsvpHistory.ts` — RSVP history is read-only → `staleTime: 5 * 60_000` (5min)
- `useSeatingChart.ts` — chart data changes on save → `staleTime: 30_000` (30s)
- `useEventRosterData.ts` — roster changes on attendance → `staleTime: 15_000` (15s)
- `useAttendance.ts` — attendance data is time-sensitive → no staleTime (always fresh)
- `useRosterConfigForm.ts` — config changes rarely → `staleTime: 5 * 60_000` (5min)
- `useDashboardCounts.ts` — already has `staleTime: 60_000` ✓
- `usePublicBranding.ts` — already has `staleTime: 5 * 60_000` ✓
- `useVoiceParts.ts` — already has `staleTime: 30 * 60_000` ✓
- `useDues.ts` — already has `staleTime: 5 * 60_000` ✓
- `useVenues.ts` — missing → `staleTime: 5 * 60_000` (5min, venues rarely change)

Also check view-level queries:
- `ResourcesView.tsx` — resources list → `staleTime: 60_000` (1min)
- `TicketingView.tsx` — ticketing data → `staleTime: 30_000` (30s)
- `DonationsView.tsx` — donations list → `staleTime: 30_000` (30s)
- `MusicLibraryView.tsx` — music pieces → `staleTime: 60_000` (1min)
- `SettingsView.tsx` — settings → `staleTime: 5 * 60_000` (5min)
- `AuditionsView.tsx` — audition list → `staleTime: 30_000` (30s)
- `PollsDashboardView.tsx` — polls → `staleTime: 30_000` (30s)

- [ ] **Step 2: Apply staleTime to each file**

Pattern for each query:
```ts
useQuery({
  queryKey: ...,
  queryFn: ...,
  staleTime: 5 * 60_000,
});
```

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Run tests**

Run: `rtk npx vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add .
rtk git commit -m "perf: add staleTime defaults to all hook-level queries"
```

---

## Phase B: Mutation Migration

### Task B1: Migrate MusicLibraryView + MusicPieceModal writes to useMutation

**Files:**
- Modify: `src/views/admin/MusicLibraryView.tsx`
- Modify: `src/views/admin/music-library/MusicPieceModal.tsx`

**Problem:** ~25+ direct service calls across both files with manual `isSaving`, `isBulkDeleting`, `isQuickAdding`, `uploadingParts` state. No mutation-level error tracking.

**Fix:** Create mutations for each write path. Use `onSuccess` with invalidation.

- [ ] **Step 1: Create bulkDelete mutation in MusicLibraryView**

```ts
const invalidateMusicLibrary = useCallback(
  () => queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all }),
  [queryClient]
);

const bulkDeleteMutation = useMutation({
  mutationFn: (ids: string[]) => musicLibraryService.bulkDelete(ids),
  onSuccess: () => {
    invalidateMusicLibrary();
    setSelectedIds(new Set());
  },
});
```

Replace the direct call at line 507:
```ts
// Before
setIsBulkDeleting(true);
await musicLibraryService.bulkDelete(Array.from(selectedIds));
setIsBulkDeleting(false);

// After
await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
```

Replace `isBulkDeleting` usage with `bulkDeleteMutation.isPending`.

- [ ] **Step 2: Create configSaveMutation**

```ts
const configSaveMutation = useMutation({
  mutationFn: (settings: MusicLibrarySettings) =>
    settingsService.saveMusicLibrarySettings(settings),
  onSuccess: invalidateMusicLibrary,
});
```

Replace direct call at line 186 + manual `setIsSavingConfig`. Replace `isSavingConfig` with `configSaveMutation.isPending`.

- [ ] **Step 3: Create pieceSaveMutation and pieceDeleteMutation**

```ts
const pieceSaveMutation = useMutation({
  mutationFn: (input: { existingId?: string; data: Partial<MusicPieceInput>; movements?: ...; tuttiFile?: ... }) =>
    input.existingId
      ? musicLibraryService.updatePiece(input.existingId, input.data)
      : input.movements
        ? musicLibraryWorkflows.createPieceWithMovementsAndTutti(input.data, { tuttiFile: input.tuttiFile, movements: input.movements })
        : musicLibraryService.createPiece(input.data),
  onSuccess: invalidateMusicLibrary,
});
```

Replace the `handleSavePiece` dispatch logic. The mutation handles loading/error state.

- [ ] **Step 4: Apply same pattern to MusicPieceModal writes**

Each write in MusicPieceModal (file upload, file delete, movement CRUD, quick-add performance) gets its own `useMutation`. Replace `isSaving`/`isQuickAdding`/`uploadingParts` with mutation state.

- [ ] **Step 5: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 6: Run music library tests**

Run: `rtk npx vitest run test/music-library/`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
rtk git add src/views/admin/MusicLibraryView.tsx src/views/admin/music-library/MusicPieceModal.tsx
rtk git commit -m "feat: migrate MusicLibraryView and MusicPieceModal writes to useMutation"
```

---

### Task B2: Migrate Communications mutations (useCommunicationDraft + CommunicationView)

**Files:**
- Modify: `src/views/admin/communications/useCommunicationDraft.ts`
- Modify: `src/views/admin/communications/CommunicationView.tsx`

**Problem:** Draft save, send, test, config save, SMTP test all use direct service calls with manual `isSaving`, `isSending`, `isSendingTest` state.

- [ ] **Step 1: Create mutations in `useCommunicationDraft.ts`**

```ts
const saveDraftMutation = useMutation({
  mutationFn: (draftData: SendMessageInput) => communicationService.saveDraft(draftData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
  },
});

const sendMessageMutation = useMutation({
  mutationFn: (msgData: SendMessageInput) => communicationService.sendMessage(msgData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
  },
});

const sendTestMutation = useMutation({
  mutationFn: (testData: SendMessageInput & { testEmail: string }) =>
    communicationService.sendTestMessage(testData.content, testData.subject, testData.testEmail),
});
```

Replace `handleSaveDraft`, `handleSendTest`, and `sendMessage` bodies to use `mutateAsync`. Replace `isSaving`, `isSending`, `isSendingTest` with `saveDraftMutation.isPending`, `sendMessageMutation.isPending`, `sendTestMutation.isPending`.

- [ ] **Step 2: Create mutations in `CommunicationView.tsx`**

```ts
const saveConfigMutation = useMutation({
  mutationFn: (settings: CommunicationSettings) =>
    settingsService.saveCommunicationSettings(settings),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.communications.settings() });
  },
});

const testSmtpMutation = useMutation({
  mutationFn: () => pb.send('/api/test-smtp'),
});
```

Replace the direct `settingsService.saveCommunicationSettings()` at line 484 and `pb.send('/api/test-smtp')` at line 459. Replace `isSavingConfig` with `saveConfigMutation.isPending`.

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Run communication tests**

Run: `rtk npx vitest run test/views/admin/communications/`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/views/admin/communications/
rtk git commit -m "feat: migrate communication writes to useMutation"
```

---

### Task B3: Migrate SettingsView writes to useMutation

**Files:**
- Modify: `src/views/admin/SettingsView.tsx`

**Problem:** `handleSave` calls 7 service functions directly with manual `isSaving`/`message` state. Token generation is also direct.

- [ ] **Step 1: Create mutations**

```ts
const saveSettingsMutation = useMutation({
  mutationFn: async () => {
    await Promise.all([
      choirName ? settingsService.saveChoirName(choirName) : Promise.resolve(),
      settingsService.saveTimezone(timezone),
      homepageUrl ? settingsService.saveHomepageUrl(homepageUrl) : Promise.resolve(),
      logoFile
        ? settingsService.saveLogo(logoFile)
        : logoUrl === null
          ? settingsService.saveLogo(null)
          : Promise.resolve(),
      landingSettings ? settingsService.saveLandingSettings(landingSettings) : Promise.resolve(),
      heroChanges.file
        ? settingsService.saveHeroImage(heroChanges.file)
        : heroChanges.file === null
          ? settingsService.saveHeroImage(null)
          : Promise.resolve(),
    ]);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.choirSettings.all });
    setMessage('Settings saved successfully');
  },
  onError: (err: Error) => {
    setMessage(err.message);
  },
});
```

Wrap the direct calls in `handleSave` with `await saveSettingsMutation.mutateAsync()`. Replace `isSaving` with `saveSettingsMutation.isPending`.

```ts
const generateTokenMutation = useMutation({
  mutationFn: () => queueSettingsService.generateToken(),
  onSuccess: (data) => {
    setToken(data.secret);
    setMessage('');
  },
});
```

Wrap at line 412 with `await generateTokenMutation.mutateAsync()`. Replace `isGenerating` with `generateTokenMutation.isPending`.

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/SettingsView.tsx
rtk git commit -m "feat: migrate SettingsView writes to useMutation"
```

---

### Task B4: Migrate AuditionsView + PollsDashboardView writes

**Files:**
- Modify: `src/views/admin/AuditionsView.tsx`
- Modify: `src/views/admin/PollsDashboardView.tsx`

**Problem:** ~6 direct writes in AuditionsView, ~3 in PollsDashboardView with manual `isSavingSettings` state.

- [ ] **Step 1: Create mutation hooks in AuditionsView**

```ts
const auditionUpdateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<AuditionInput> }) =>
    auditionService.updateAudition(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all }),
});

const auditionCreateMutation = useMutation({
  mutationFn: (data: AuditionInput) => auditionService.createAudition(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all }),
});

const auditionDeleteMutation = useMutation({
  mutationFn: (id: string) => auditionService.deleteAudition(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all }),
});

const auditionConvertMutation = useMutation({
  mutationFn: (id: string) => auditionService.convertAuditionToSinger(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
  },
});

const saveAuditionSettingsMutation = useMutation({
  mutationFn: (settings: AuditionSettings) =>
    settingsService.saveAuditionSettings(settings),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.settings }),
});
```

Replace all direct service calls in `confirmSchedule`, `updateStatus`, `handleSaveAudition`, `removeAudition`, `convertToSinger`, `handleSaveSettings`.

- [ ] **Step 2: Create mutation hooks in PollsDashboardView**

```ts
const deletePollMutation = useMutation({
  mutationFn: (id: string) => pollService.deletePoll(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.polls.all }),
});

const createPollMutation = useMutation({
  mutationFn: (data: { question: string; archiveAt?: string }) =>
    pollService.createPoll(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.polls.all }),
});

const savePollSettingsMutation = useMutation({
  mutationFn: (settings: PollSettings) => settingsService.savePollSettings(settings),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.polls.settings }),
});
```

Replace direct calls in `handleDeletePoll`, `handleQuickCreateAndOpenReview`, `handleSaveSettings`.

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/views/admin/AuditionsView.tsx src/views/admin/PollsDashboardView.tsx
rtk git commit -m "feat: migrate AuditionsView and PollsDashboardView writes to useMutation"
```

---

### Task B5: Migrate SetListView + ResourcesView remaining writes

**Files:**
- Modify: `src/views/admin/SetListView.tsx`
- Modify: `src/views/admin/ResourcesView.tsx`

**Problem:** SetListView has ~6 write paths with composite `saveStatus` state. ResourcesView has some direct calls remaining.

- [ ] **Step 1: Create mutation hooks in SetListView**

```ts
const setListMutation = useMutation({
  mutationFn: ({ eventId, items }: { eventId: string; items: SetListItem[] }) =>
    eventService.updateEvent(eventId, { setList: items }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  onError: () => {
    setItems(previousItems);
    setSaveStatus('error');
  },
});

const eventUpdateMutation = useMutation({
  mutationFn: ({ eventId, data }: { eventId: string; data: Partial<EventInput> }) =>
    eventService.updateEvent(eventId, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
});
```

Replace `saveSetList`, `handleToggleApproved`, `handleAnnouncementGapChange`. Replace `saveStatus` with `setListMutation.isPending` / `eventUpdateMutation.isPending`.

- [ ] **Step 2: Create mutation hooks in ResourcesView**

Search for `await resourceService\.` calls that are not already wrapped in mutations. The most common remaining patterns are delete and reorder. Wrap them:

```ts
const resourceDeleteMutation = useMutation({
  mutationFn: (id: string) => resourceService.deleteResource(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.resources.all }),
});

const resourceReorderMutation = useMutation({
  mutationFn: (ids: string[]) => resourceService.reorderResources(ids),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.resources.all }),
});
```

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/views/admin/SetListView.tsx src/views/admin/ResourcesView.tsx
rtk git commit -m "feat: migrate SetListView and ResourcesView remaining writes to useMutation"
```

---

### Task B6: Migrate Roster/Patrons/Venues remaining mutation cleanup

**Files:**
- Modify: `src/views/admin/RosterView.tsx`
- Modify: `src/views/admin/EventRosterView.tsx`
- Modify: `src/views/admin/PatronsView.tsx`
- Modify: `src/views/admin/VenuesView.tsx`

**Problem:** Each has 1-2 direct `profileService.*` or `venueService.*` calls without mutation.

- [ ] **Step 1: Create shared profile mutations in RosterView and EventRosterView**

```ts
const profileSaveMutation = useMutation({
  mutationFn: ({ id, data }: { id?: string; data: Partial<ProfileInput> }) =>
    id ? profileService.updateProfile(id, data) : profileService.createProfile(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
});
```

Replace `handleSave`/`handleSingerModalSave` direct calls.

- [ ] **Step 2: Same pattern for PatronsView and VenuesView**

Wrap remaining direct calls in mutations with proper invalidation.

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/views/admin/RosterView.tsx src/views/admin/EventRosterView.tsx src/views/admin/PatronsView.tsx src/views/admin/VenuesView.tsx
rtk git commit -m "feat: migrate admin roster/patron/venue writes to useMutation"
```

---

### Task B7: Migrate public form submission views (Stripe redirects)

**Files:**
- Modify: `src/views/PublicDonationView.tsx`
- Modify: `src/views/PublicBundlePurchaseView.tsx`
- Modify: `src/views/PublicTicketPurchaseView.tsx`
- Modify: `src/views/PublicAuditionView.tsx`

**Problem:** Each has a single `await service.x()` call with manual `isSubmitting`/`error` state. These are Stripe redirect flows where the mutation result triggers `window.location.assign(url)`.

**Note:** These are inherently fire-and-forget (page navigation happens on success), so `useMutation` provides less benefit than for other views. But it standardizes the loading/error state pattern.

- [ ] **Step 1: Create mutations for each view**

Pattern:
```ts
const createSessionMutation = useMutation({
  mutationFn: (data: DonationInput) => donationService.createDonationSession(data),
  onSuccess: (url) => {
    window.location.assign(url);
  },
  onError: (err: Error) => {
    setError(err.message);
  },
});
```

Replace direct `await` + manual `submitting`/`error` with `createSessionMutation.mutateAsync()`. Replace `isSubmitting` with `createSessionMutation.isPending`.

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/PublicDonationView.tsx src/views/PublicBundlePurchaseView.tsx src/views/PublicTicketPurchaseView.tsx src/views/PublicAuditionView.tsx
rtk git commit -m "feat: migrate public form submission views to useMutation"
```

---

### Task B8: Migrate raw `pb.send()` calls to useMutation

**Files:**
- Modify: `src/views/PublicUnsubscribeView.tsx`
- Modify: `src/views/PublicRsvpView.tsx` (quick-rsvp endpoint)
- Modify: `src/views/admin/communications/CommunicationView.tsx` (SMTP test)

**Problem:** Three raw `pb.send()` calls in effects/handlers with manual state.

- [ ] **Step 1: PublicUnsubscribeView mutation**

Replace the `pb.send('/api/unsubscribe', ...)` call in the `useEffect` with a `useMutation`. The mutation replaces the manual `loading`/`error`/`success` state.

- [ ] **Step 2: PublicRsvpView mutation**

Replace the `pb.send('/api/quick-rsvp', ...)` call in `handleConfirmRsvp` with a `useMutation`.

Note: SMTP test was handled in Task B2.

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Run tests**

Run: `rtk npx vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/views/PublicUnsubscribeView.tsx src/views/PublicRsvpView.tsx
rtk git commit -m "feat: migrate raw pb.send calls to useMutation"
```

---

## Phase C: Polish

### Task C1: Clean up SettingsView state mirror

**Files:**
- Modify: `src/views/admin/SettingsView.tsx`

**Problem:** `settingsQuery.data` is copied into 8 `useState` variables via `useEffect`. The form needs local state for editing, but the `initial*` state variables are redundant (can derive from query data directly).

**Fix:** Remove `initialChoirName`, `initialTimezone`, `initialHomepageUrl`, `initialLogoUrl`. Use `settingsQuery.data` directly for dirty-checking (compare current form values against query data). Keep the form state variables but remove the `initial*` pattern used for change detection.

- [ ] **Step 1: Remove initial* state and refactor dirty-checking**

```ts
// Before
const [choirName, setChoirName] = useState('');
const [initialChoirName, setInitialChoirName] = useState('');
const isDirty = choirName !== initialChoirName;

// After
const [choirName, setChoirName] = useState('');
const settingsData = settingsQuery.data;
const isDirty = choirName !== (settingsData?.loadedChoirName ?? '');
```

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/SettingsView.tsx
rtk git commit -m "refactor: remove redundant initial* state in SettingsView, use query data directly"
```

---

### Task C2: Clean up PublicRsvpView state mirror

**Files:**
- Modify: `src/views/PublicRsvpView.tsx`

**Problem:** 6+ `useState` variables mirror `detailsQuery.data` via `useEffect`. Reading directly from the query object would eliminate redundant state.

**Fix:** Replace mirrored state with direct query data access. Keep only the UI state (activeStep, etc.).

- [ ] **Step 1: Audit which state variables are redundant**

Read `PublicRsvpView.tsx` and identify:
- `event`, `profile`, `tokenPayload`, etc. — if these are exact mirrors of `detailsQuery.data`, replace with `detailsQuery.data?.property`
- `status`, `errorMessage` — if derived from query loading/success/error state, replace with `detailsQuery.isLoading`, `detailsQuery.error`

- [ ] **Step 2: Remove redundant state variables and their sync effects**

For each mirrored state variable:
```ts
// Before
const [event, setEvent] = useState<EventRecord | null>(null);
useEffect(() => {
  if (detailsQuery.data) setEvent(detailsQuery.data.event);
}, [detailsQuery.data]);

// After — remove state and effect, use inline access
const event = detailsQuery.data?.event ?? null;
```

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Run tests**

Run: `rtk npx vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/views/PublicRsvpView.tsx
rtk git commit -m "refactor: remove redundant state mirror in PublicRsvpView, use query data directly"
```

---

### Task C3: Clean up PublicPlayerView state mirror + IDB side effect

**Files:**
- Modify: `src/views/PublicPlayerView.tsx`

**Problem:** `playlistQuery.data` is copied into `data` state. Also, `queryFn` saves to IndexedDB (`savePlaylistOffline`), which is a side effect.

**Fix:** Remove `data` state, use `playlistQuery.data` directly. Move the offline cache write to `onSuccess`.

- [ ] **Step 1: Move side effect to onSuccess**

```ts
const playlistQuery = useQuery({
  queryKey: queryKeys.playlist.byToken(token),
  queryFn: () => playlistService.getPublicPlaylist(token),
  onSuccess: (result) => {
    savePlaylistOffline(token, result.files);
  },
});
```

- [ ] **Step 2: Remove `data` state mirror**

```ts
// Before
const [data, setData] = useState<...>(null);
useEffect(() => {
  if (playlistQuery.data) {
    setData(result);
    ...
  }
}, [playlistQuery.data]);

// After — use directly
const data = playlistQuery.data;
```

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/views/PublicPlayerView.tsx
rtk git commit -m "refactor: remove redundant state mirror and move IDB side effect to onSuccess in PublicPlayerView"
```

---

### Task C4: Add error handling to `useDocumentTitle.tsx`

**Files:**
- Modify: `src/hooks/useDocumentTitle.tsx`

**Problem:** The `useQuery` return value is completely discarded. No `error`, `isError`, or loading state is consumed. Errors are silently swallowed.

**Fix:** This is a provider-level query — consuming `error` here would require context consumers to handle loading/error. Simplest fix: log error in `onError` so it's visible in devtools but doesn't break the app.

- [ ] **Step 1: Add onError handler**

```ts
const { data } = useQuery({
  queryKey: queryKeys.choirSettings.all,
  queryFn: async () => {
    const [name, tz] = await Promise.all([
      settingsService.getChoirName(),
      settingsService.getTimezone(),
    ]);
    return { name, timezone: tz };
  },
  staleTime: 5 * 60 * 1000,
  onError: (err: unknown) => {
    console.warn('Failed to load choir settings, using defaults:', err);
  },
});
```

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/hooks/useDocumentTitle.tsx
rtk git commit -m "fix: add error logging to choir settings query"
```

---

### Task C5: Fix error handling gaps in remaining queries

**Files:**
- Modify: `src/views/admin/communications/useCommunicationDraft.ts`
- Modify: `src/views/singer/SeatingFinderView.tsx`

**Problem:** `resolvedRecipientsQuery` and `seatingProfilesQuery` have no error handling. Errors are silently swallowed.

- [ ] **Step 1: Add error handling to resolvedRecipientsQuery**

The error needs to be surfaced to the UI. If the query errors, show a toast to the user.

```ts
import { useDialog } from '../../../contexts/DialogContext';

// Inside the hook:
const dialog = useDialog();

const resolvedRecipientsQuery = useQuery({
  queryKey: queryKeys.communications.resolvedRecipients(filters),
  queryFn: () => communicationService.resolveRecipients(filters),
  enabled: tab === 'compose' && !(lockInitialRecipients && recipients.length > 0),
  onError: () => {
    dialog.showToast('Failed to resolve recipients');
  },
});
```

- [ ] **Step 2: Add error handling to seatingProfilesQuery**

```ts
const seatingProfilesQuery = useQuery({
  queryKey: queryKeys.seatingProfiles.byEventAndChart(eventId ?? '', chart?.id ?? ''),
  queryFn: () => seatingService.getSingerSeatingProfiles(eventId!, chart!.id),
  enabled: !!eventId && !!chart?.id && !isOpenSeating,
  onError: () => {
    dialog.showToast('Failed to load seating profiles');
  },
});
```

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/views/admin/communications/useCommunicationDraft.ts src/views/singer/SeatingFinderView.tsx
rtk git commit -m "fix: add error handling to resolvedRecipients and seatingProfiles queries"
```

---

### Task C6: Migrate `useRosterConfigForm.ts` to proper mutations

**Files:**
- Modify: `src/hooks/useRosterConfigForm.ts`

**Problem:** This hook has `useQuery` calls that are effectively decorative — data flows through `useState` entirely. The `handleConfigSave` function calls service functions directly with manual `isSavingConfig` state.

**Fix:** Replace the manual save with `useMutation`. Keep the `useQuery` calls as the actual source of initial data (remove the state mirror effects if possible).

- [ ] **Step 1: Create save mutation**

```ts
const configSaveMutation = useMutation({
  mutationFn: (config: { voiceParts: VoicePartDef[]; sections: SectionDef[] }) =>
    Promise.all([
      settingsService.saveRosterSettings({ sections: config.sections }),
      settingsService.saveVoiceParts(config.voiceParts),
    ]),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.roster });
    queryClient.invalidateQueries({ queryKey: queryKeys.voiceParts.all });
  },
});
```

Replace `handleConfigSave` to use `configSaveMutation.mutateAsync()`. Replace `isSavingConfig` with `configSaveMutation.isPending`.

- [ ] **Step 2: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/hooks/useRosterConfigForm.ts
rtk git commit -m "feat: migrate useRosterConfigForm save to useMutation"
```

---

### Task C7: Clean up useSeatingChart redundant state

**Files:**
- Modify: `src/hooks/useSeatingChart.ts`

**Problem:** `setChart` and `setError` mirror what TQ already provides via `data` and `error` on the query result. The `activeChart` data is mirrored into `chart`/`optimisticAssignments` state.

**Fix:** Remove redundant `chart`/`error`/`optimisticAssignments` state. Use `chartQuery.data` directly. Keep only `assignments` state (optimistic local state for drag-and-drop before save).

**Note:** This task requires careful understanding of how `chart` state differs from query data (it may include optimistic modifications). Read the file before making changes.

- [ ] **Step 1: Read and understand the hook's state model**

Read `src/hooks/useSeatingChart.ts` and determine:
- Is `chart` state ever different from `chartQuery.data`?
- Is `error` state ever different from `chartQuery.error`?
- Can `chart` be replaced with `chartQuery.data` + a local `optimisticChanges` state?

- [ ] **Step 2: Apply simplifications**

Remove `setChart` / `setError` state duplications where they are pure mirrors of query data.

- [ ] **Step 3: Verify type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Step 4: Run seating tests**

Run: `rtk npx vitest run test/useSeatingChart.test.ts`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useSeatingChart.ts
rtk git commit -m "refactor: remove redundant state mirror in useSeatingChart"
```

---

### Final Verification

- [ ] **Run full type-check**

Run: `rtk npx tsc -b`

Expected: No errors.

- [ ] **Run full lint**

Run: `rtk npm run lint`

Expected: No errors.

- [ ] **Run full test suite**

Run: `rtk npx vitest run`

Expected: All 843 tests pass.

- [ ] **Update migration doc**

Update `docs/tanstack-query-migration.md` to mark all 36+ items as done and add notes about the full sweep.

- [ ] **Final commit**

```bash
rtk git add .
rtk git commit -m "feat: complete tanstack query full sweep - fix anti-patterns, migrate mutations, polish"
```
