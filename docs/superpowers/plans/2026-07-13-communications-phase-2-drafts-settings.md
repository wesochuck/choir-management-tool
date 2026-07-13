# Communications Phase 2 Drafts and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect in-progress messages with quiet, ordered autosave and make draft/settings management clear and reliable on mobile.

**Architecture:** Keep message form state in `useCommunicationDraft`, but delegate debounce, single-flight persistence, conflict detection, and unload protection to a dedicated hook. Settings become one staged value passed directly to a single mutation, eliminating the current parent-state timing hazard. Existing responsive DataTable and app dialog primitives remain in use.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, PocketBase JS SDK, Tailwind CSS, app UI wrappers, React Testing Library, Vitest through `node:test` compatibility.

---

**Design source:** `docs/superpowers/specs/2026-07-13-communications-ui-ux-polish-design.md`

**Depends on:** Phase 1 merged. In particular, Templates must already be a top-level Communications section.

## File responsibility map

### Create

- `src/views/admin/communications/useDraftAutosave.ts` — autosave state machine, debounce, save queue, background conflict check, and unload warning.
- `src/views/admin/communications/DraftSaveStatus.tsx` — inline Saving/Saved/Error/Conflict controls.
- `src/views/admin/communications/communicationSettingsForm.ts` — combined staged settings type and equality helper.
- `test/views/admin/communications/useDraftAutosave.test.tsx` — fake-timer and race-condition coverage.
- `test/views/admin/communications/DraftSaveStatus.test.tsx` — status and recovery actions.
- `test/views/admin/communications/SettingsPanel.test.tsx` — dirty state, cancellation, direct payload, labels, and secret masking.
- `test/views/admin/communications/DraftsPanel.test.tsx` — mobile priorities and empty CTA.
- `test/components/admin/MessageHistory.test.tsx` — empty-state/search visibility coverage.
- `test/services/communicationMessageRepository.test.ts` — raw single-draft read and error propagation.

### Modify

- `src/services/communication/messageRepository.ts` — fetch one draft for conflict checks.
- `src/services/communicationService.ts` — expose `getDraft` in the compatibility service contract.
- `src/services/settingsService.ts` — re-export the existing email-provider default through the compatibility module.
- `src/views/admin/communications/useCommunicationDraft.ts` — build autosave snapshots, hydrate baselines, and expose save/conflict controls.
- `test/views/admin/communications/useCommunicationDraft.test.ts` — integration coverage for resume and save identity.
- `src/views/admin/communications/ComposeMessageStep.tsx` — replace Save Draft with status/Save now/Retry.
- `test/views/admin/communications/ComposeMessageStep.test.tsx` — status integration.
- `src/views/admin/CommunicationView.tsx` — direct staged settings mutation and empty-state navigation callbacks.
- `src/views/admin/communications/SettingsPanel.tsx` — three-section staged form and sticky save bar.
- `src/views/admin/communications/DraftsPanel.tsx` — mobile card priorities and CTA.
- `src/views/admin/communications/HistoryPanel.tsx` — pass empty-state CTA.
- `src/components/admin/MessageHistory.tsx` — contextual empty states and hide inactive controls.
- `src/views/admin/communications/TemplatesPanel.tsx` — contextual empty CTA and field labels.
- `src/views/admin/communications/AutomatedTasksPanel.tsx` — approved Upcoming Sends copy and CTA.
- `test/views/admin/communications/AutomatedTasksPanel.test.tsx` — heading and empty action.

## Critical AGENTS.md Compliance Checklist

Before starting implementation, mentally verify and incorporate the following rules (based on previous oversights):
- [ ] **React Imports:** Always use `import type React from 'react'` instead of value imports.
- [ ] **PocketBase Errors:** Use `formatPocketBaseError(err)` in UI dialogues. Do not use `err instanceof Error ? err.message : String(err)`.
- [ ] **Accessibility:** Ensure all form controls are natively semantic. Add `id` and `htmlFor` for `<label>`s. Use native `<input type="radio">` inside labels rather than div/button ARIA hacks.
- [ ] **Responsiveness:** Ensure responsive classes (e.g., `sm:hidden`, `hidden sm:inline`) are applied precisely as required.
- [ ] **File Responsibility Map:** Verify *every single detail* from the File Responsibility Map before declaring a task complete.

## Task 1: Add a single-record draft read

**Files:**
- Modify: `src/services/communication/messageRepository.ts`
- Modify: `src/services/communicationService.ts`
- Create: `test/services/communicationMessageRepository.test.ts`

- [ ] **Step 1: Add a failing service-contract assertion**

Create the service test with an `unknown` boundary rather than an unsafe PocketBase cast:

```ts
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../../src/lib/pocketbase';
import {
  communicationService,
  type MessageRecord,
} from '../../src/services/communicationService';

interface CollectionReadMock {
  getOne: (id: string) => Promise<MessageRecord>;
}

interface PocketBaseCollectionMock {
  collection: (name: string) => CollectionReadMock;
}

afterEach(() => mock.restoreAll());

describe('communication draft read', () => {
  it('reads one message by ID through the compatibility service', async () => {
    const expected = { id: 'draft-123' } as MessageRecord;
    const getOne = mock.fn(async () => expected);
    mock.method(
      pb as unknown as PocketBaseCollectionMock,
      'collection',
      (name: string) => {
        assert.equal(name, 'messages');
        return { getOne };
      }
    );

    assert.equal(typeof communicationService.getDraft, 'function');
    const record = await communicationService.getDraft('draft-123');
    assert.equal(getOne.mock.calls[0].arguments[0], 'draft-123');
    assert.equal(record, expected);
  });

  it('propagates the raw PocketBase error', async () => {
    const pocketBaseError = { status: 404, data: { message: 'Missing' } };
    const getOne = mock.fn(async (): Promise<MessageRecord> => {
      throw pocketBaseError;
    });
    mock.method(
      pb as unknown as PocketBaseCollectionMock,
      'collection',
      () => ({ getOne })
    );

    await assert.rejects(
      communicationService.getDraft('missing'),
      (error: unknown) => error === pocketBaseError
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `rtk npx vitest run test/services/communicationMessageRepository.test.ts`

Expected: FAIL because `getDraft` is not in the service contract.

- [ ] **Step 3: Implement and export the raw PocketBase read**

```ts
async function getDraft(id: string) {
  return await pb.collection('messages').getOne<MessageRecord>(id);
}
```

Insert `getDraft` immediately before `getDrafts` in the existing `messageRepository` object; make no other object-member changes.

Add this exact contract member to the `satisfies` block in `communicationService.ts`:

```ts
getDraft: (id: string) => Promise<MessageRecord>;
```

Do not catch or wrap `getOne` errors.

- [ ] **Step 4: Run the focused test**

Run: `rtk npx vitest run test/services/communicationMessageRepository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the read path**

```bash
rtk git add src/services/communication/messageRepository.ts src/services/communicationService.ts test/services/communicationMessageRepository.test.ts
rtk git commit -m "feat(communications): add draft conflict read"
```

## Task 2: Build the autosave state machine with fake timers

**Files:**
- Create: `src/views/admin/communications/useDraftAutosave.ts`
- Create: `test/views/admin/communications/useDraftAutosave.test.tsx`

- [ ] **Step 1: Write failing debounce and hydration tests**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { MessageRecord, SendMessageInput } from '../../../../src/services/communicationService';
import { useDraftAutosave } from '../../../../src/views/admin/communications/useDraftAutosave';

afterEach(() => {
  mock.timers.reset();
  cleanup();
});

const input = (content: string): SendMessageInput => ({
  subject: 'Subject',
  content,
  type: 'Email',
  recipients: [],
  filters: {},
});

const record = (id: string, content: string, updated: string): MessageRecord => ({
  id,
  subject: 'Subject',
  content,
  type: 'Email',
  recipients: [],
  filters: {},
  status: 'Draft',
  created: updated,
  updated,
} as MessageRecord);

describe('useDraftAutosave', () => {
  it('waits 1500 ms and does not save a hydrated draft', async () => {
    mock.timers.enable();
    const persist = mock.fn(async () => record('draft-1', 'saved', '2026-07-13T12:00:00Z'));
    const { result, rerender } = renderHook(
      ({ snapshot }) => useDraftAutosave({
        snapshot,
        activeDraftId: 'draft-1',
        activeDraftUpdated: '2026-07-13T11:00:00Z',
        persist,
        fetchLatest: mock.fn(),
        onSaved: mock.fn(),
        onReload: mock.fn(),
      }),
      { initialProps: { snapshot: input('saved') } }
    );

    act(() => result.current.markHydrated(record('draft-1', 'saved', '2026-07-13T11:00:00Z')));
    act(() => mock.timers.tick(1500));
    assert.equal(persist.mock.callCount(), 0);

    rerender({ snapshot: input('changed') });
    act(() => mock.timers.tick(1499));
    assert.equal(persist.mock.callCount(), 0);
    await act(async () => mock.timers.tick(1));
    assert.equal(persist.mock.callCount(), 1);
  });
});
```

- [ ] **Step 2: Add failing coalescing and error tests**

Add tests with a deferred first save. Change the snapshot twice while it is in flight, resolve it, and assert the hook persists only the first and latest fingerprints. Add a rejection test asserting `status === 'error'`, `error` is the same raw object, and `retry()` sends the latest snapshot.

Use this deferred helper:

```ts
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
```

- [ ] **Step 3: Run the tests and verify the missing-module failure**

Run: `rtk npx vitest run test/views/admin/communications/useDraftAutosave.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 4: Implement public types and stable fingerprinting**

```ts
export type DraftSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface UseDraftAutosaveArgs {
  snapshot: SendMessageInput;
  activeDraftId: string | null;
  activeDraftUpdated: string | null;
  persist: (snapshot: SendMessageInput, id?: string) => Promise<MessageRecord>;
  fetchLatest: (id: string) => Promise<MessageRecord>;
  onSaved: (record: MessageRecord) => void;
  onReload: (record: MessageRecord) => void;
  delayMs?: number;
}

export function fingerprintDraft(snapshot: SendMessageInput): string {
  return JSON.stringify({
    subject: snapshot.subject,
    content: snapshot.content,
    type: snapshot.type,
    recipients: snapshot.recipients,
    filters: snapshot.filters,
  });
}

function recordSnapshot(record: MessageRecord): SendMessageInput {
  return {
    subject: record.subject,
    content: record.content,
    type: record.type,
    recipients: record.recipients,
    filters: record.filters,
  };
}
```

- [ ] **Step 5: Implement debounce and a single-flight latest queue**

The hook must maintain refs for the latest snapshot, active ID, last server timestamp, saved fingerprint, one in-flight promise, and a queued flag. Its save function follows this exact sequence:

```ts
const [status, setStatus] = useState<DraftSaveStatus>('idle');
const [error, setError] = useState<unknown>(null);
const [conflictDraft, setConflictDraft] = useState<MessageRecord | null>(null);
const [drainVersion, setDrainVersion] = useState(0);
const snapshotRef = useRef(snapshot);
const activeIdRef = useRef<string | null>(activeDraftId);
const lastUpdatedRef = useRef<string | null>(activeDraftUpdated);
const savedFingerprintRef = useRef('');
const inFlightRef = useRef<Promise<void> | null>(null);
const queuedRef = useRef(false);
const conflictRef = useRef<MessageRecord | null>(null);

useEffect(() => {
  snapshotRef.current = snapshot;
}, [snapshot]);

useEffect(() => {
  activeIdRef.current = activeDraftId;
  lastUpdatedRef.current = activeDraftUpdated;
}, [activeDraftId, activeDraftUpdated]);

const saveNow = useCallback(async (): Promise<void> => {
  if (conflictRef.current) return;
  if (inFlightRef.current) {
    queuedRef.current = true;
    await inFlightRef.current;
    return;
  }

  const snapshotToSave = snapshotRef.current;
  const fingerprintToSave = fingerprintDraft(snapshotToSave);
  if (fingerprintToSave === savedFingerprintRef.current) return;

  setStatus('saving');
  setError(null);

  const operation = (async () => {
    try {
      const saved = await persist(snapshotToSave, activeIdRef.current || undefined);
      activeIdRef.current = saved.id;
      lastUpdatedRef.current = saved.updated;
      savedFingerprintRef.current = fingerprintToSave;
      onSaved(saved);
    } catch (caught: unknown) {
      setError(caught);
      setStatus('error');
      return;
    } finally {
      inFlightRef.current = null;
    }

    const hasNewerSnapshot =
      fingerprintDraft(snapshotRef.current) !== savedFingerprintRef.current;
    if (queuedRef.current || hasNewerSnapshot) {
      queuedRef.current = false;
      setDrainVersion((value) => value + 1);
    } else {
      setStatus('saved');
    }
  })();

  inFlightRef.current = operation;
  await operation;
}, [onSaved, persist]);
```

Use `const debounceMs = delayMs ?? 1500;`. The debounce effect marks meaningful changed content dirty, clears its timeout on every dependency change, and drains the latest snapshot after an in-flight save:

```ts
useEffect(() => {
  const currentFingerprint = fingerprintDraft(snapshot);
  const hasMeaningfulContent = Boolean(
    activeIdRef.current || snapshot.subject.trim() || snapshot.content.trim()
  );
  if (
    !hasMeaningfulContent ||
    currentFingerprint === savedFingerprintRef.current ||
    conflictRef.current
  ) {
    return;
  }

  setStatus('dirty');
  const timeoutId = window.setTimeout(() => {
    void saveNow();
  }, debounceMs);
  return () => window.clearTimeout(timeoutId);
}, [debounceMs, drainVersion, saveNow, snapshot]);
```

- [ ] **Step 6: Implement hydration and retry**

```ts
const markHydrated = useCallback((draft: MessageRecord) => {
  activeIdRef.current = draft.id;
  lastUpdatedRef.current = draft.updated;
  savedFingerprintRef.current = fingerprintDraft(recordSnapshot(draft));
  conflictRef.current = null;
  setConflictDraft(null);
  setError(null);
  setStatus('saved');
}, []);

const retry = useCallback(async () => {
  setError(null);
  await saveNow();
}, [saveNow]);
```

Return `status`, raw `error`, `conflictDraft`, `saveNow`, `retry`, and `markHydrated`. Background conflict methods are added in Task 3.

- [ ] **Step 7: Run autosave tests**

Run: `rtk npx vitest run test/views/admin/communications/useDraftAutosave.test.tsx`

Expected: PASS for debounce, hydration, coalescing, and error/retry.

- [ ] **Step 8: Commit the autosave core**

```bash
rtk git add src/views/admin/communications/useDraftAutosave.ts test/views/admin/communications/useDraftAutosave.test.tsx
rtk git commit -m "feat(communications): add ordered draft autosave"
```

## Task 3: Add background conflict and unload protection

**Files:**
- Modify: `src/views/admin/communications/useDraftAutosave.ts`
- Modify: `test/views/admin/communications/useDraftAutosave.test.tsx`

- [ ] **Step 1: Write failing conflict and unload tests**

Add tests that:

1. hydrate draft `updated=11:00`;
2. make `fetchLatest` return the same ID at `updated=12:00` with different content;
3. dispatch `visibilitychange` after setting `document.visibilityState` to `visible`;
4. expect `status === 'conflict'` and no persistence;
5. call `reloadLatest()` and assert `onReload` receives the server record;
6. recreate the conflict, call `saveAsCopy()`, and assert `persist` receives `id === undefined`.

Add a separate dirty-state test that dispatches `beforeunload` and asserts `event.defaultPrevented === true`; after a successful save it must remain false.

Set the read-only visibility value with `Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })`, preserve its original property descriptor, and restore that descriptor in the test's `finally` block.

- [ ] **Step 2: Run tests and verify they fail**

Run: `rtk npx vitest run test/views/admin/communications/useDraftAutosave.test.tsx`

Expected: FAIL because conflict and unload behavior are absent.

- [ ] **Step 3: Implement visibility conflict checks**

```ts
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (document.visibilityState !== 'visible') return;
    const id = activeIdRef.current;
    const knownUpdated = lastUpdatedRef.current;
    if (!id || !knownUpdated || inFlightRef.current) return;

    try {
      const latest = await fetchLatest(id);
      const isNewer = new Date(latest.updated).getTime() > new Date(knownUpdated).getTime();
      const changed = fingerprintDraft(recordSnapshot(latest)) !== savedFingerprintRef.current;
      if (isNewer && changed) {
        conflictRef.current = latest;
        setConflictDraft(latest);
        setStatus('conflict');
      }
    } catch {
      // A failed background comparison does not replace autosave's real save state.
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [fetchLatest]);
```

- [ ] **Step 4: Implement explicit conflict resolution**

```ts
const reloadLatest = useCallback(() => {
  const latest = conflictRef.current;
  if (!latest) return;
  onReload(latest);
  markHydrated(latest);
}, [markHydrated, onReload]);

const saveAsCopy = useCallback(async (): Promise<void> => {
  setStatus('saving');
  setError(null);
  try {
    const snapshotToSave = snapshotRef.current;
    const saved = await persist(snapshotToSave, undefined);
    activeIdRef.current = saved.id;
    lastUpdatedRef.current = saved.updated;
    savedFingerprintRef.current = fingerprintDraft(snapshotToSave);
    conflictRef.current = null;
    setConflictDraft(null);
    onSaved(saved);
    setStatus('saved');
  } catch (caught: unknown) {
    setError(caught);
    setStatus('error');
  }
}, [onSaved, persist]);
```

Return both callbacks. Preserve the caught PocketBase value unchanged in `error`.

- [ ] **Step 5: Implement unload warning**

```ts
useEffect(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!['dirty', 'saving', 'error', 'conflict'].includes(status)) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [status]);
```

- [ ] **Step 6: Run all autosave tests**

Run: `rtk npx vitest run test/views/admin/communications/useDraftAutosave.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit conflict protection**

```bash
rtk git add src/views/admin/communications/useDraftAutosave.ts test/views/admin/communications/useDraftAutosave.test.tsx
rtk git commit -m "feat(communications): protect conflicting draft edits"
```

## Task 4: Integrate autosave into the draft hook and composer

**Files:**
- Create: `src/views/admin/communications/DraftSaveStatus.tsx`
- Create: `test/views/admin/communications/DraftSaveStatus.test.tsx`
- Modify: `src/views/admin/communications/useCommunicationDraft.ts`
- Modify: `test/views/admin/communications/useCommunicationDraft.test.ts`
- Modify: `src/views/admin/communications/ComposeMessageStep.tsx`
- Modify: `test/views/admin/communications/ComposeMessageStep.test.tsx`

- [ ] **Step 1: Write DraftSaveStatus tests**

Render each state and assert:

```ts
assert.ok(screen.getByText('Saving…'));
assert.ok(screen.getByText('Saved just now'));
assert.ok(screen.getByRole('button', { name: 'Save now' }));
assert.ok(screen.getByRole('button', { name: 'Retry saving draft' }));
assert.ok(screen.getByRole('button', { name: 'Reload latest draft' }));
assert.ok(screen.getByRole('button', { name: 'Save local changes as a copy' }));
```

For the error case, pass `new Error('Network unavailable')` and assert the formatted message is visible without altering the original error.

- [ ] **Step 2: Implement DraftSaveStatus**

Use `formatPocketBaseError(error)` only for rendering. Render status text inside `aria-live="polite"`. Dirty renders `Save now`; Error renders the formatted error and Retry; Conflict renders Reload latest and Save as copy. Buttons use the existing wrapper.

```ts
interface DraftSaveStatusProps {
  status: DraftSaveStatus;
  error: unknown;
  onSaveNow: () => Promise<void>;
  onRetry: () => Promise<void>;
  onReloadLatest: () => void;
  onSaveAsCopy: () => Promise<void>;
}
```

- [ ] **Step 3: Build one memoized snapshot in useCommunicationDraft**

```ts
const draftSnapshot = useMemo<SendMessageInput>(() => ({
  subject,
  content,
  type: messageType,
  recipients: selectedRecipients,
  filters: filters as unknown as Record<string, unknown>,
}), [subject, content, messageType, selectedRecipients, filters]);
```

Add `activeDraftUpdated` state. Instantiate `useDraftAutosave` with raw repository functions:

```ts
const hydrateDraftRecord = useCallback((draft: MessageRecord) => {
  setSubject(draft.subject);
  setContent(draft.content);
  setMessageType(draft.type);
  setRecipients(draft.recipients);
  setSelectedIds(new Set(draft.recipients.map((recipient) => recipient.id)));
  setFilters(draft.filters as CommunicationFilters);
}, []);

const handleAutosaveSaved = useCallback(
  (record: MessageRecord) => {
    setActiveDraftId(record.id);
    setActiveDraftUpdated(record.updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
  },
  [queryClient]
);

const autosave = useDraftAutosave({
  snapshot: draftSnapshot,
  activeDraftId,
  activeDraftUpdated,
  persist: (snapshot, id) => communicationService.saveDraft(snapshot, id),
  fetchLatest: (id) => communicationService.getDraft(id),
  onSaved: handleAutosaveSaved,
  onReload: hydrateDraftRecord,
});
```

Use the callback above for the current resume assignments. Call `autosave.markHydrated(draft)` before `hydrateDraftRecord(draft)` for a resumed draft. For `asCopy`, call `hydrateDraftRecord(draft)`, then set the active ID and timestamp to `null`; do not call `markHydrated`, so the first save creates a new record. Clear identity/timestamp after send.

- [ ] **Step 4: Expose autosave controls and remove toast-based manual save**

Return:

```ts
draftSaveStatus: autosave.status,
draftSaveError: autosave.error,
saveDraftNow: autosave.saveNow,
retryDraftSave: autosave.retry,
reloadLatestDraft: autosave.reloadLatest,
saveDraftAsCopy: autosave.saveAsCopy,
```

Remove `handleSaveDraft`, `isSavingDraft`, and the separate save mutation. Do not emit success toasts for autosave.

- [ ] **Step 5: Replace the composer Save button**

Render `DraftSaveStatus` inside the one `WizardActionBar` between Back and Review. On mobile it may use `flex-1`; it must not create a second bar.

Flush the latest snapshot before leaving Compose for Review:

```ts
const handleReview = async () => {
  await draft.saveDraftNow();
  onContinue();
};
```

Wire the Review button to `handleReview`. Extend the ComposeMessageStep test to click Review and assert `saveDraftNow` resolves before `onContinue` is called.

- [ ] **Step 6: Update integration tests**

Update `makeDraft` fixtures to provide the new save-state fields. Assert that dirty shows one Save now control, saving shows status but no active Save button, and conflict shows both recovery choices. Add a resume test asserting no persistence occurs during hydration.

- [ ] **Step 7: Run focused tests**

Run: `rtk npx vitest run test/views/admin/communications/useDraftAutosave.test.tsx test/views/admin/communications/DraftSaveStatus.test.tsx test/views/admin/communications/useCommunicationDraft.test.ts test/views/admin/communications/ComposeMessageStep.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit autosave integration**

```bash
rtk git add src/views/admin/communications/useCommunicationDraft.ts src/views/admin/communications/ComposeMessageStep.tsx src/views/admin/communications/DraftSaveStatus.tsx test/views/admin/communications/
rtk git commit -m "feat(communications): autosave message drafts"
```

## Task 5: Define and save one staged settings payload

**Files:**
- Create: `src/views/admin/communications/communicationSettingsForm.ts`
- Modify: `src/services/settingsService.ts`
- Modify: `src/views/admin/CommunicationView.tsx`
- Modify: `src/views/admin/communications/SettingsPanel.tsx`
- Create: `test/views/admin/communications/SettingsPanel.test.tsx`

- [ ] **Step 1: Write failing dirty/cancel/save tests**

Render SettingsPanel with one `initialValue` and a mocked `onSave`. Change Mailing Address and assert `Cancel changes` and `Save settings` appear. Click Cancel and assert the original value returns. Change again, click Save, and assert the first argument is the exact visible value:

```ts
assert.deepEqual(onSave.mock.calls[0].arguments[0], {
  communications: { ...initialCommunications, mailingAddress: '500 New Address' },
  emailProvider: initialProvider,
});
```

Also assert `screen.getByLabelText('Brevo API key').getAttribute('type') === 'password'` when Brevo is selected.

- [ ] **Step 2: Run the test and verify the old prop contract fails**

Run: `rtk npx vitest run test/views/admin/communications/SettingsPanel.test.tsx`

Expected: FAIL because SettingsPanel currently stages only communication fields and saves through stale parent state.

- [ ] **Step 3: Define the combined form value and equality helper**

```ts
import type {
  CommunicationSettings,
  EmailProviderSettings,
} from '../../../services/settingsService';

export interface CommunicationSettingsFormValue {
  communications: CommunicationSettings;
  emailProvider: EmailProviderSettings;
}

export function communicationSettingsEqual(
  left: CommunicationSettingsFormValue,
  right: CommunicationSettingsFormValue
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
```

- [ ] **Step 4: Replace parent provider state with query data**

Remove `emailProvider`, `brevoApiKey`, and their synchronization effect from `CommunicationView`. Replace the two save mutations with one:

```ts
const saveSettingsMutation = useMutation({
  mutationFn: async (value: CommunicationSettingsFormValue) => {
    await settingsService.saveCommunicationSettings(value.communications);
    await settingsService.saveEmailProviderSettings(value.emailProvider);
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.communications.settings() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.emailProvider });
  },
});
```

In `settingsService.ts`, import and re-export the already-defined default with the provider getters:

```ts
import {
  DEFAULT_EMAIL_PROVIDER_SETTINGS,
  getEmailProviderSettings,
  saveEmailProviderSettings,
} from './settings/emailProviderSettings';
export {
  DEFAULT_EMAIL_PROVIDER_SETTINGS,
  getEmailProviderSettings,
  saveEmailProviderSettings,
};
```

Pass `initialValue={{ communications: library.commSettings, emailProvider: emailProviderQuery.data ?? DEFAULT_EMAIL_PROVIDER_SETTINGS }}` and `onSave={(value) => saveSettingsMutation.mutateAsync(value)}`. Import `DEFAULT_EMAIL_PROVIDER_SETTINGS` from `src/services/settingsService.ts`.

- [ ] **Step 5: Implement local baseline, staged value, cancel, and save**

SettingsPanel's core state becomes:

```ts
const [baseline, setBaseline] = useState(initialValue);
const [value, setValue] = useState(initialValue);
const [saveError, setSaveError] = useState<unknown>(null);
const isDirty = !communicationSettingsEqual(value, baseline);

const handleCancel = () => {
  setValue(baseline);
  setSaveError(null);
};

const handleSave = async () => {
  try {
    await onSave(value);
    setBaseline(value);
    setSaveError(null);
  } catch (error: unknown) {
    setSaveError(error);
  }
};
```

Synchronize a new `initialValue` only when the form is not dirty. Preserve raw errors and call `formatPocketBaseError` only in rendered error text.

```ts
const initialFingerprint = JSON.stringify(initialValue);
const lastAppliedInitialRef = useRef(initialFingerprint);

useEffect(() => {
  if (initialFingerprint === lastAppliedInitialRef.current) return;
  if (isDirty) return;
  lastAppliedInitialRef.current = initialFingerprint;
  setBaseline(initialValue);
  setValue(initialValue);
}, [initialFingerprint, initialValue, isDirty]);
```

- [ ] **Step 6: Run the settings tests**

Run: `rtk npx vitest run test/views/admin/communications/SettingsPanel.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit direct-payload settings state**

```bash
rtk git add src/views/admin/CommunicationView.tsx src/views/admin/communications/SettingsPanel.tsx src/views/admin/communications/communicationSettingsForm.ts test/views/admin/communications/SettingsPanel.test.tsx src/services/settingsService.ts
rtk git commit -m "fix(communications): save staged settings directly"
```

## Task 6: Reorganize Settings into three mobile-friendly sections

**Files:**
- Modify: `src/views/admin/communications/SettingsPanel.tsx`
- Modify: `test/views/admin/communications/SettingsPanel.test.tsx`

- [ ] **Step 1: Add section, label, and sticky-action assertions**

```ts
for (const heading of ['General & Compliance', 'Delivery Provider', 'Connection Tests']) {
  assert.ok(screen.getByText(heading));
}
assert.ok(screen.getByLabelText('Physical mailing address'));
assert.ok(screen.getByLabelText('Application base URL'));
assert.ok(screen.getByLabelText('Default SMS country code'));
assert.ok(screen.getByLabelText('Test email address'));
assert.ok(screen.getByLabelText('Test phone number'));
```

After editing, assert the save container includes `sticky` and both actions are visible.

- [ ] **Step 2: Run the test and verify labels/sections fail**

Run: `rtk npx vitest run test/views/admin/communications/SettingsPanel.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Render the three approved AppCards**

Use IDs `communications-mailing-address`, `communications-base-url`, `communications-country-code`, `communications-email-provider`, `communications-brevo-key`, `communications-test-email`, and `communications-test-phone`. Every visible label gets matching `htmlFor`. Wrap the Select in `<div className="py-[3px]">` only when aligning it horizontally with an Input.

Connection-test buttons keep their current mutations but use decorative icons through the Button `icon` prop or `aria-hidden` spans. Show independent in-place Sending/Success/Error feedback; do not put provider secrets in messages.

- [ ] **Step 4: Add the sticky dirty-state bar**

```tsx
{(isDirty || isSaving || saveError) && (
  <div className="border-border bg-surface sticky bottom-0 z-40 -mx-3 flex items-center justify-between gap-3 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_8px_rgba(0,0,0,0.08)] sm:-mx-6">
    <span className="text-text-muted text-sm" aria-live="polite">
      {isSaving ? 'Saving settings…' : saveError ? formatPocketBaseError(saveError) : 'Unsaved changes'}
    </span>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Cancel changes</Button>
      <Button variant="primary" onClick={handleSave} disabled={isSaving || !isDirty}>Save settings</Button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Run Settings tests and lint**

Run: `rtk npx vitest run test/views/admin/communications/SettingsPanel.test.tsx`

Expected: PASS.

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/views/admin/communications/SettingsPanel.tsx src/views/admin/communications/communicationSettingsForm.ts test/views/admin/communications/SettingsPanel.test.tsx`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit the settings information architecture**

```bash
rtk git add src/views/admin/communications/SettingsPanel.tsx test/views/admin/communications/SettingsPanel.test.tsx
rtk git commit -m "feat(communications): organize delivery settings"
```

## Task 7: Improve draft cards and contextual empty states

**Files:**
- Modify: `src/views/admin/communications/DraftsPanel.tsx`
- Create: `test/views/admin/communications/DraftsPanel.test.tsx`
- Modify: `src/components/admin/MessageHistory.tsx`
- Create: `test/components/admin/MessageHistory.test.tsx`
- Modify: `src/views/admin/communications/HistoryPanel.tsx`
- Modify: `src/views/admin/communications/TemplatesPanel.tsx`
- Modify: `src/views/admin/communications/AutomatedTasksPanel.tsx`
- Modify: `test/views/admin/communications/AutomatedTasksPanel.test.tsx`
- Modify: `src/views/admin/CommunicationView.tsx`

- [ ] **Step 1: Write empty-state CTA tests**

For each empty panel, render with an empty collection and assert the approved action:

```ts
assert.ok(screen.getByRole('button', { name: '+ New Message' }));
assert.ok(screen.getByRole('button', { name: '+ Add Custom Template' }));
```

For MessageHistory with no records and no search, assert the search textbox and source filter are absent. With a non-empty search query and no results, assert they remain visible so the user can clear the filter.

- [ ] **Step 2: Run tests and verify missing actions**

Run: `rtk npx vitest run test/views/admin/communications/DraftsPanel.test.tsx test/components/admin/MessageHistory.test.tsx test/views/admin/communications/AutomatedTasksPanel.test.tsx`

Expected: FAIL because empty actions and approved copy are absent.

- [ ] **Step 3: Add explicit callbacks and DataTable actions**

Add `onNewMessage: () => void` to DraftsPanel, HistoryPanel/MessageHistory, and AutomatedTasksPanel. Supply this action:

```tsx
action: (
  <Button type="button" variant="primary" onClick={onNewMessage}>
    + New Message
  </Button>
)
```

Templates uses its existing `setEditingTemplate` callback for `+ Add Custom Template`. Change headings and empty copy from Scheduled to Upcoming Sends.

- [ ] **Step 4: Prioritize mobile draft content**

Use `renderMobileCard` in DraftsPanel so each card renders subject first, then a row containing channel and formatted update time, then Delete/Resume buttons with 44 px default height. Keep the existing desktop columns. Delete continues through the parent danger confirmation.

- [ ] **Step 5: Hide history controls only for a truly empty library**

In MessageHistory:

```tsx
const hasUnderlyingHistory = history.length > 0 || Boolean(historySearchQuery.trim());

{hasUnderlyingHistory && (
  <div className="mb-1 flex items-center gap-2">
    <div className="relative flex-[3]">
      <Input
        aria-label="Search message history"
        type="text"
        placeholder="Search message history (subject, content, type)..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className={searchTerm ? 'pr-8' : 'pr-3'}
      />
      {searchTerm && (
        <button
          type="button"
          aria-label="Clear history search"
          className="text-text-muted absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-xl leading-none"
          onClick={() => {
            setSearchTerm('');
            onHistorySearchChange('');
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
    <Select
      aria-label="Message source"
      value={sourceFilter}
      onChange={(event) => onSourceFilterChange(event.target.value as SourceFilter)}
      className="max-w-[130px]"
    >
      <option value="all">All Sources</option>
      <option value="manual">Manual</option>
      <option value="automated">Automated</option>
    </Select>
  </div>
)}
```

Replace the decorative mailbox emoji with an `aria-hidden` SVG.

- [ ] **Step 6: Wire all CTAs to the same parent handler**

In `CommunicationView`, create:

```ts
const startNewMessage = () => {
  setTab('compose');
  setWizardStep('TARGETS');
};
```

Use it for the page-header action and all empty-state callbacks.

- [ ] **Step 7: Run empty-state tests**

Run: `rtk npx vitest run test/views/admin/communications/DraftsPanel.test.tsx test/components/admin/MessageHistory.test.tsx test/views/admin/communications/AutomatedTasksPanel.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit mobile draft and empty states**

```bash
rtk git add src/views/admin/CommunicationView.tsx src/views/admin/communications/DraftsPanel.tsx src/views/admin/communications/HistoryPanel.tsx src/views/admin/communications/TemplatesPanel.tsx src/views/admin/communications/AutomatedTasksPanel.tsx src/components/admin/MessageHistory.tsx test/views/admin/communications test/components/admin/MessageHistory.test.tsx
rtk git commit -m "feat(communications): improve draft and empty states"
```

## Task 8: Phase 2 verification

**Files:**
- No source changes expected; fix only failures introduced by this phase.

- [ ] **Step 1: Run autosave and settings tests**

Run: `rtk npx vitest run test/views/admin/communications/ test/components/admin/MessageHistory.test.tsx`

Expected: PASS with fake timers and no real-time waits.

- [ ] **Step 2: Run lint on changed source**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/views/admin/CommunicationView.tsx src/views/admin/communications/ src/components/admin/MessageHistory.tsx src/services/communication/ src/services/communicationService.ts`

Expected: PASS with no warnings.

- [ ] **Step 3: Run the project build**

Run: `rtk npm run build`

Expected: PASS, including TypeScript, Vite build, hook integrity, and high-severity audit.

- [ ] **Step 4: Perform interruption-focused smoke tests**

Start: `rtk npm run dev`

At 390 × 844 and desktop width, verify:

- no empty draft is created by opening Compose;
- first meaningful edit shows Dirty, then Saving, then Saved;
- rapid typing does not flicker or create duplicate drafts;
- background/foreground resumes normally when the server copy is unchanged;
- a simulated newer server copy offers Reload latest and Save as copy;
- failed autosave remains editable and Retry works;
- browser Back and Forward preserve the last saved draft and never create a duplicate draft;
- Settings Cancel restores all three sections;
- one click saves the exact visible settings;
- empty panels expose useful actions and History search is hidden only when truly empty.

- [ ] **Step 5: Inspect final scope**

Run: `rtk git status --short`

Expected: only intentional Phase 2 files are modified, or clean if every task was committed.

## Phase 2 completion report requirements

Report autosave timing and state behavior, conflict handling, settings payload behavior, empty-state changes, focused tests, lint, build, and responsive smoke results. Confirm that PocketBase errors remained raw, network calls stayed bounded, no generated file or migration changed, and no unsafe TypeScript pattern or raw Shoelace import was introduced.
