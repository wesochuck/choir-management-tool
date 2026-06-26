# ComposePanel Refactor Plan v2

Target: `src/views/admin/communications/ComposePanel.tsx`

## Goal

Reduce `ComposePanel.tsx` from 649 lines / 74 props to a slim orchestrator (~80-100 lines) by:

1. Extracting each of the 4 wizard steps into its own component
2. Replacing the spread-prop contract with grouped objects (`draft`, `preview`) plus a small set of cross-cutting props
3. Extracting inline JSX helpers and per-step state into the step that owns them
4. Adding behavior-focused unit tests for the new step components

## Scope

**In scope:**

- `src/views/admin/communications/ComposePanel.tsx` (rewrite)
- `src/views/admin/CommunicationView.tsx` (call-site updates only)
- New step component files under `src/views/admin/communications/`
- New test files under `test/views/admin/communications/`
- New small hook `useTemplateSelection.ts`
- New component `SetlistWarning.tsx`
- Adding `UseCommunicationDraftReturn` and `UseCommunicationPreviewReturn` type exports to the existing hook files

**Out of scope:**

- Changes to `useCommunicationDraft.ts`, `useCommunicationPreview.ts`, `useCommunicationLibrary.ts` *internals* (return shapes are stable)
- Changes to `ReviewSidebar`, `AudienceStatCards`, `WizardActionBar`, `PreFlightChecklist`, `PlaceholderPanel`, `ComposeStep` (already-extracted components stay as-is)
- Any visual / behavior changes — refactor is strictly behavior-preserving (including keeping the duplicated COMPOSE action bar in this pass; cleanup deferred)
- Modifying `types.ts` (kept free of hook imports to avoid circular deps — see Step 1)

---

## Implementation order

The riskiest extraction is saved for last; the smallest and most isolated extractions come first so each step is a working checkpoint.

1. Add return type exports to `useCommunicationDraft.ts` and `useCommunicationPreview.ts`
2. Add `SetlistWarning` component
3. Add `useTemplateSelection` hook
4. Extract `TemplateStep` (smallest, only uses the new hook)
5. Extract `ComposeMessageStep`
6. Extract `ReviewStep`
7. Extract `AudienceStep` (largest, most filter logic)
8. Update `CommunicationView.tsx` to drop `{...draft}` / `{...preview}` spreads and pass grouped objects

After each step, `ComposePanel.tsx` should compile and the wizard should behave identically.

---

## Step 1 — Export hook return types from the hook files

**Files:**

- `src/views/admin/communications/useCommunicationDraft.ts`
- `src/views/admin/communications/useCommunicationPreview.ts`

In `useCommunicationDraft.ts`, after the hook function definition, add:

```ts
export type UseCommunicationDraftReturn = ReturnType<typeof useCommunicationDraft>;
```

In `useCommunicationPreview.ts`, after the hook function definition, add:

```ts
export type UseCommunicationPreviewReturn = ReturnType<typeof useCommunicationPreview>;
```

**Why not in `types.ts`:** `useCommunicationDraft.ts` already imports types from `./types`. Adding `ReturnType<typeof useCommunicationDraft>` to `types.ts` creates a circular import. The hook files own their own return shape, so the type lives next to it.

**Verify:** `grep -r "ReturnType<typeof useCommunication" src/` should show the new exports.

---

## Step 2 — Extract `SetlistWarning` as a component

**New file:** `src/views/admin/communications/SetlistWarning.tsx`

The component owns the "should I show?" decision so callers can't pass mismatched state:

```ts
interface SetlistWarningProps {
  selectedEvent: Event | null;
  content: string;
}
```

Internal logic:

```ts
if (!selectedEvent) return null;
if (selectedEvent.setListApproved !== false) return null;
if (!content.toLowerCase().includes('{setlist}')) return null;
return ( /* the warning JSX */ );
```

**Moved from:** `ComposePanel.tsx:148-168` (`renderSetlistWarning`).

The duplicated `hasApprovedSetList` IIFE at `ComposePanel.tsx:538-541` is removed — `SetlistWarning` derives the answer internally. The matching `hasApprovedSetList` derivation that feeds `PlaceholderPanel` stays (separate concern; `PlaceholderPanel` uses it for a different decision — whether to enable the `PLAYER_LINK` placeholder).

**Verification:** `grep -r "renderSetlistWarning"` returns no matches; `SetlistWarning` is rendered once in the new `ComposeMessageStep`.

---

## Step 3 — Extract template-selection state into a small hook

**New file:** `src/views/admin/communications/useTemplateSelection.ts`

Currently `ComposePanel.tsx:115` declares `selectedTemplateId` and `handleUseTemplate` lives at lines 117-131. Both are only used by the TEMPLATE step.

```ts
interface UseTemplateSelectionArgs {
  templates: TemplateRecord[];
  setSubject: (v: string) => void;
  setContent: (v: string) => void;
  setMessageType: (v: MessageType) => void;
  onContinue: () => void; // typically () => setWizardStep('COMPOSE')
}

export function useTemplateSelection(args: UseTemplateSelectionArgs) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('blank');
  const handleUseTemplate = useCallback(() => { ... }, [...]);
  return { selectedTemplateId, setSelectedTemplateId, handleUseTemplate };
}
```

The hook owns the "use this selected template, populate subject/content/type, advance to COMPOSE" sequence in one place. `TemplateStep` only renders the UI and calls `handleUseTemplate`.

**Why a hook, not just state in the step:** `selectedTemplateId` is rendered as the button label (`'Start Blank Message' | 'Use Template & Continue'`) inside the step, and `handleUseTemplate` advances the wizard — both need the parent's `setWizardStep`. Putting them in a hook keeps the step component dumb.

**Alternative considered:** lift the state into `useCommunicationDraft`. Rejected — the state is purely UI scaffolding for the TEMPLATE step and shouldn't pollute the draft lifecycle (it doesn't need to persist in drafts, doesn't need to round-trip on resume, and doesn't affect sending).

---

## Step 4 — Extract `TemplateStep`

**New file:** `src/views/admin/communications/TemplateStep.tsx`

**Takes:**

```ts
interface TemplateStepProps {
  templates: TemplateRecord[];
  templateSelection: ReturnType<typeof useTemplateSelection>;
  onBack: () => void;
}
```

No `onContinue` — the hook's `handleUseTemplate` already advances the wizard via its `onContinue` argument. The step just calls `templateSelection.handleUseTemplate` on the primary button click. This keeps the contract obvious: "this hook does the use-template-and-continue thing."

**Moved from:** `ComposePanel.tsx:452-489` (TEMPLATE block).

`TemplateStep` is the consumer of the `useTemplateSelection` hook from Step 3. Renders `TemplateGrid` and the back/forward action bar.

**Tests:** `test/views/admin/communications/TemplateStep.test.tsx`

Behavior-focused:

- `// @vitest-environment jsdom`
- Selecting a template updates the visible "selected" state
- Clicking "Start Blank Message" (initial state) calls `handleUseTemplate`, which clears subject/content/type and advances
- Clicking "Use Template & Continue" with a template selected calls `handleUseTemplate`, which populates from the chosen template and advances
- "Back to Audience" calls `onBack`

Avoid asserting exact `TemplateGrid` props — verify user-visible behavior instead.

---

## Step 5 — Extract `ComposeMessageStep` wrapper

**New file:** `src/views/admin/communications/ComposeMessageStep.tsx` (named to avoid clashing with the existing `src/components/ComposeStep.tsx`).

**Takes:**

```ts
interface ComposeMessageStepProps {
  draft: UseCommunicationDraftReturn;
  preview: UseCommunicationPreviewReturn;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  onInsertPlaceholder: (tag: string) => void;
  selectedEvent: Event | null;
  onBack: () => void;                       // () => setWizardStep('TEMPLATE')
  onContinue: () => void;                   // () => setWizardStep('REVIEW')
}
```

**Moved from:** `ComposePanel.tsx:491-546` (COMPOSE block).

**Behavior-preserving note:** Both the top-of-page action bar (lines 493-505) AND the in-content `WizardActionBar` (lines 521-533) are kept verbatim. The original PR keeps both bars; deduplication is deferred to a separate cleanup pass.

**Internal:** renders the existing `ComposeStep` component (the one in `src/components/ComposeStep.tsx`) plus `PlaceholderPanel` and the new `SetlistWarning`. The top action bar and the in-content `WizardActionBar` are **not** deduped — keep both byte-for-byte for behavior preservation. The inline `hasApprovedSetList` IIFE (lines 538-541) is replaced by `ComposeMessageStep` computing `hasApprovedSetList` once for `PlaceholderPanel`. `SetlistWarning` receives `selectedEvent` and derives its own visibility internally.

**Tests:** `test/views/admin/communications/ComposeMessageStep.test.tsx`

Behavior-focused:

- Back button calls `onBack`
- "Next: Review & Send" calls `onContinue`
- "Save Draft" calls `draft.handleSaveDraft`; button is disabled while `draft.isSavingDraft`
- The setlist warning banner is visible only when the content contains `{setlist}` and the selected event's set list is not approved
- The composer renders for all three `messageType` values (Email / SMS / Both)

Avoid asserting exact `PlaceholderPanel` props. Trust the existing component's own tests.

---

## Step 6 — Extract `ReviewStep`

**New file:** `src/views/admin/communications/ReviewStep.tsx`

**Takes:**

```ts
interface ReviewStepProps {
  draft: UseCommunicationDraftReturn;
  preview: UseCommunicationPreviewReturn;
  commSettings: CommunicationSettings;
  selectedEvent: Event | null;
  user: ChoirUser | null;
  choirName: string;
  senderEmail: string;
  onBack: () => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  setTab: (tab: CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
}
```

**Moved from:** `ComposePanel.tsx:548-646` (REVIEW block).

The component renders the existing `LivePreview` and `ReviewSidebar`. The action bar at the top (Back / Send Test / Send) and the layout grid are kept verbatim.

**Tests:** `test/views/admin/communications/ReviewStep.test.tsx`

Behavior-focused:

- Send button is disabled when `selectedRecipients.length === 0`
- Send button is disabled while `isSending`
- Clicking Send calls `draft.sendMessage`
- Clicking Send Test calls `draft.handleSendTest`; disabled while `isSendingTest`
- Back button calls `onBack`
- The "Send to N Singers" label reflects the current `selectedRecipients.length`

Avoid asserting exact `ReviewSidebar` props — verify that the user can press the buttons and that the right `draft` handlers fire.

---

## Step 7 — Extract `AudienceStep`

**New file:** `src/views/admin/communications/AudienceStep.tsx`

**Takes:**

```ts
interface AudienceStepProps {
  draft: UseCommunicationDraftReturn;       // includes recipientCounts, recipients, selectedRecipients
  events: Event[];
  voicePartLabels: string[];
  configSections: VoicePartConfig[];
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  onContinue: () => void;                   // () => setWizardStep('TEMPLATE')
}
```

Note: `recipientCounts` is **not** an explicit prop — it lives on `draft.recipientCounts` today, so passing both creates two sources of truth. Same for `selectedEvent`, which is *not* needed in this step (the warning UI for the audience step is the SMS-unavailable banner, not the setlist warning).

**Moved from:** `ComposePanel.tsx:201-450` (TARGETS block).

**Internal simplifications:**

- `handleVoicePartChange` and `handleEventContextChange` move into the component.
- The SMS-unavailable banner (lines 342-359) stays as inline JSX — it's the only warning UI in this step.

**Tests:** `test/views/admin/communications/AudienceStep.test.tsx`

Behavior-focused:

- `// @vitest-environment jsdom`
- Changing the Event select calls `draft.updateFilter('eventId', <id>)`
- Changing the RSVP select calls `draft.updateFilter('rsvp', <value>)` and is disabled when no event is selected
- Changing the Member Status select calls `draft.updateFilter('globalStatus', <value>)`
- Changing the Voice Part multi-select calls `draft.updateFilter('voiceParts', [...])`
- "Continue to Message" calls `onContinue`
- "View matched singers" calls `onViewRecipients(draft.recipients, 'Matched Singers')`; button is disabled when `draft.recipients.length === 0`
- The SMS-unavailable banner appears when `draft.recipientCounts.hasPhone === 0`
- The "first 5" singer preview renders at most 5 entries plus the "and N more" footer

Avoid asserting exact `AudienceStatCards` props. Verify the visible counts match `recipientCounts`.

---

## Step 8 — Slim down `ComposePanel.tsx`

After the extractions, `ComposePanel.tsx` becomes:

```ts
interface ComposePanelProps {
  draft: UseCommunicationDraftReturn;
  preview: UseCommunicationPreviewReturn;
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  commSettings: CommunicationSettings;
  templates: TemplateRecord[];
  setTab: (tab: CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  onInsertPlaceholder: (tag: string) => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  user: ChoirUser | null;
  choirName: string;
  senderEmail: string;
}
```

That's **~16 props** (down from 74) plus two object inputs. Internally:

1. Calls `useEvents()` and `useVoiceParts()` so `AudienceStep` can render the event, voice-part, and section filters.
2. Calls `useTemplateSelection({ templates, setSubject: draft.setSubject, setContent: draft.setContent, setMessageType: draft.setMessageType, onContinue: () => setWizardStep('COMPOSE') })`.
3. Reads `selectedEvent` from `preview.selectedEvent` (the preview hook already returns it — do **not** recompute).
4. Renders `<WizardStepper>`.
5. Switches on `wizardStep` to render one of the four step components.

**Target size:** ~80-100 lines.

---

## Step 9 — Update `CommunicationView.tsx`

**File:** `src/views/admin/CommunicationView.tsx`

Replace lines 382-397 (the `<ComposePanel>` block) with:

```tsx
{tab === 'compose' && (
  <ComposePanel
    draft={draft}
    preview={preview}
    wizardStep={wizardStep}
    setWizardStep={setWizardStep}
    commSettings={library.commSettings}
    templates={library.templates}
    setTab={setTab}
    setEditingTemplate={library.setEditingTemplate}
    editorRef={editorRef}
    onInsertPlaceholder={insertPlaceholder}
    onViewRecipients={handleViewRecipients}
    user={user}
    choirName={library.choirName}
    senderEmail={library.commConfig.smtp.from || 'no-reply@choir.management'}
  />
)}
```

No more `{...draft}` / `{...preview}` spreads.

---

## File layout after the refactor

Line counts are estimates; the JSX is preserved byte-for-byte so the actual numbers may run higher. Treat the file split and grouped prop contract as the acceptance criteria, not the line counts.

```
src/views/admin/communications/
├── AudienceStep.tsx              (new)
├── ComposeMessageStep.tsx        (new — includes both action bars, preserved)
├── ComposePanel.tsx              (was 649; target substantially smaller)
├── ReviewStep.tsx                (new)
├── SetlistWarning.tsx            (new)
├── TemplateStep.tsx              (new)
├── useTemplateSelection.ts       (new)
├── useCommunicationDraft.ts      (extended — adds UseCommunicationDraftReturn export)
├── useCommunicationPreview.ts    (extended — adds UseCommunicationPreviewReturn export)
├── types.ts                      (unchanged)
├── ReviewSidebar.tsx             (unchanged)
├── AudienceStatCards.tsx         (unchanged)
├── ...                           (all other files unchanged)

test/views/admin/communications/
├── AudienceStep.test.tsx         (new)
├── ComposeMessageStep.test.tsx   (new)
├── ReviewStep.test.tsx           (new)
├── TemplateStep.test.tsx         (new)
├── useAutomatedCommunicationTasks.test.ts (existing)
├── AutomatedTasksPanel.test.tsx  (existing)
└── useCommunicationDraft.test.ts (existing)
```

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Behavior drift during extraction | Keep all `className` strings, conditional rendering, and JSX structure byte-for-byte identical. Behavior-focused tests guard user-visible contracts. |
| Circular import from putting `ReturnType<>` types in `types.ts` | Types live in the hook files. `types.ts` stays a pure shared-types file. |
| `preview.selectedEvent` and a separately-computed `selectedEvent` drift | Don't recompute — read `preview.selectedEvent`. |
| `useCommunicationDraft`/`Preview` return shapes change later | `ReturnType<>` types follow automatically. No hard-coded prop lists to keep in sync. |
| `selectedTemplateId` loses between TEMPLATE and COMPOSE steps (e.g., on "back") | `useTemplateSelection` lives in `ComposePanel` (survives step navigation), same as today's `selectedTemplateId` state. Verified by reading lines 115 / 472-477. |
| `SetlistWarning` placement changes visibility | Rendered in the same JSX position as the old `renderSetlistWarning()` call. No layout shift. |
| Mismatched approval state passed to `SetlistWarning` | Component takes `selectedEvent: Event | null` and derives the answer internally — callers can't disagree with themselves. |
| Top-of-page action bar vs `WizardActionBar` duplication in COMPOSE step | Kept both for behavior preservation. Cleanup is a follow-up PR. |
| `placeholder panel`'s `hasApprovedSetList` computation duplicated with `SetlistWarning` | The two use the same input but render different UIs. `ComposeMessageStep` computes `hasApprovedSetList` once and passes it to `PlaceholderPanel`; `SetlistWarning` derives it itself from `selectedEvent`. No shared utility needed. |
| `AudienceStep` test asserts on `recipientCounts` while `draft` already exposes it | `recipientCounts` is read from `draft.recipientCounts` inside the test, not passed as a separate prop. Single source of truth. |
| Tests become brittle to prop forwarding | Each test checks user-visible behavior (button clicks, banner visibility, disabled state) and the relevant `draft` mutation, not exact child props. |

---

## Verification plan

**Acceptance criteria** (qualitative — these are what "done" means):

- `ComposePanel.tsx` is substantially smaller (the step JSX is gone).
- `ComposePanel` receives grouped `draft` and `preview` objects instead of 74 spread props.
- `CommunicationView` no longer uses `{...draft}` / `{...preview}` spreads.
- All four extracted step components render identical UI to the previous inline JSX.
- Behavior is unchanged: same wizard transitions, same warnings, same button states.
- New step tests pass; existing tests still pass.

After implementation, run:

1. `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/views/admin/communications/`
2. `rtk npx tsc --noEmit` (project typecheck)
3. `rtk npx vitest run test/views/admin/communications/`
4. `rtk npm test -- --run` (full suite — make sure no consumer tests break)
5. Manual smoke: open `/admin/communications` in the app, walk through TARGETS → TEMPLATE → COMPOSE → REVIEW. Verify:
   - Filter changes update the recipient count
   - Selecting a template then clicking "Use Template & Continue" populates the COMPOSE step
   - `{setlist}` placeholder + unapproved set list → warning appears
   - Both COMPOSE action bars are present and functional (top bar AND in-content `WizardActionBar`)
   - Send / Send Test buttons behave as before
   - "View matched singers" opens the recipient modal

---

## Decisions (resolved)

1. **`useTemplateSelection`** — keep as a small step-local hook in `communications/`. Do not move it into `useCommunicationDraft`. Template selection is wizard UI state, not draft state: it does not need to be saved, resumed, sent, or treated as part of the message lifecycle.
2. **Return type exports** — `UseCommunicationDraftReturn` and `UseCommunicationPreviewReturn` are exported from each hook file (using `ReturnType<typeof useCommunicationDraft>`), not from `types.ts`. This avoids a circular import. Step components import them with `import type`.
3. **COMPOSE step's two action bars** — kept both byte-for-byte in `ComposeMessageStep`. After this refactor merges, a follow-up cleanup PR can review whether the in-content `WizardActionBar` is still needed and remove it.
4. **Test scope** — Vitest/jsdom component tests for the 4 extracted step components. Behavior-focused assertions only (button clicks call the right handlers, banners show under the right conditions, disabled state reflects the right flag). No prop-forwarding assertions. No Playwright.

### Behavior-focused test matrix

| Component | Test focus |
|---|---|
| `AudienceStep` | Filter changes call `draft.updateFilter`; "View matched singers" calls `onViewRecipients`; SMS warning appears when `recipientCounts.hasPhone === 0`; continue button calls `onContinue`; "first 5" preview caps at 5 plus "and N more" footer. |
| `TemplateStep` | Selecting blank vs a template updates the selected ID; clicking the primary button applies blank/template values and advances; "Back" calls `onBack`. |
| `ComposeMessageStep` | Back / Save Draft / Next buttons call the right handlers; Save Draft disabled while `isSavingDraft`; setlist warning appears only when content has `{setlist}` and the event's set list is unapproved; composer renders for all three `messageType` values. |
| `ReviewStep` | Send disabled with zero `selectedRecipients`; Send and Send Test call `draft.sendMessage` and `draft.handleSendTest`; Back calls `onBack`; "Send to N Singers" label reflects the recipient count. |
