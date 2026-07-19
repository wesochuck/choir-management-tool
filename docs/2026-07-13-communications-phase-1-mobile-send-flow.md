# Communications Phase 1 Mobile Send Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete Communications send workflow mobile-first, non-duplicative, keyboard accessible, and explicit about recipient reach and exclusions.

**Architecture:** Preserve the existing Audience/Template/Compose/Review step components. Add small pure reach helpers, one wizard-heading/focus mechanism, one action bar per step, a responsive section selector, and semantic template/audience controls. Move the existing template manager into its own top-level section in this phase so the new navigation never points to duplicate management surfaces.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Shoelace wrappers from `src/components/ui/`, TanStack Query, React Testing Library, Vitest through the repository's `node:test` compatibility layer.

---

**Design source:** `docs/superpowers/specs/2026-07-13-communications-ui-ux-polish-design.md`

**Depends on:** None. This is the first independently releasable phase.

## File responsibility map

### Create

- `src/views/admin/communications/recipientReach.ts` — channel eligibility, reachable/excluded totals, and send-confirmation copy.
- `src/views/admin/communications/WizardStepHeading.tsx` — consistent focusable step headings.
- `src/views/admin/communications/useWizardStepNavigation.ts` — scroll and focus on real step transitions.
- `src/views/admin/communications/RecipientSummaryCard.tsx` — review recipient summary, separated from compliance checks.
- `test/views/admin/communications/recipientReach.test.ts` — pure reach and copy tests.
- `test/views/admin/communications/useWizardStepNavigation.test.tsx` — transition focus/scroll tests.
- `test/components/TemplateGrid.test.tsx` — semantic template selection and ordering tests.
- `test/components/LivePreview.test.tsx` — mobile preview default and decorative-icon tests.

### Modify

- `src/types/Communication.ts` — add the `templates` section and template update timestamp.
- `src/components/CommunicationTabs.tsx` — desktop tabs plus mobile section selector.
- `test/CommunicationTabs.test.tsx` — six-section labels and selector behavior.
- `src/views/admin/CommunicationView.tsx` — render top-level Templates, use approved copy, and remove template props from Settings.
- `src/views/admin/communications/SettingsPanel.tsx` — stop rendering template management; broader reorganization waits for Phase 2.
- `src/components/WizardStepper.tsx` — semantic progress list and 44 px targets.
- `src/views/admin/communications/ComposePanel.tsx` — own transition focus/scroll and shared step refs.
- `src/views/admin/communications/AudienceStep.tsx` — one action bar, associated labels, compact mobile summary, and exclusions.
- `src/views/admin/communications/AudienceStatCards.tsx` — semantic buttons and responsive compact presentation.
- `test/views/admin/communications/AudienceStep.test.tsx` — single action, reach, and label coverage.
- `src/views/admin/communications/templateMapping.ts` — preserve `updated` for recent-custom ordering.
- `src/views/admin/communications/useTemplateSelection.ts` — separate selection from application/navigation.
- `src/components/TemplateGrid.tsx` — ordered semantic radio-style template list.
- `src/views/admin/communications/TemplateStep.tsx` — explicit Use Template action.
- `test/views/admin/communications/TemplateStep.test.tsx` — selection no longer advances until Use.
- `src/views/admin/communications/ComposeMessageStep.tsx` — remove duplicate actions and use the shared heading/bar.
- `test/views/admin/communications/ComposeMessageStep.test.tsx` — assert one Back/Save/Review action.
- `src/views/admin/communications/WizardActionBar.tsx` — compact safe-area-aware mobile row.
- `src/components/LivePreview.tsx` — phone-width default and accessible preview controls.
- `src/views/admin/communications/ReviewStep.tsx` — summary → preview → compliance → actions ordering.
- `src/views/admin/communications/PreFlightChecklist.tsx` — channel-aware excluded counts from the shared reach helper.
- `test/views/admin/communications/ReviewStep.test.tsx` — ordering, one action set, and reachable send labels.
- `src/views/admin/communications/useCommunicationDraft.ts` — exclude unreachable recipients and strengthen confirmation copy.
- `test/views/admin/communications/useCommunicationDraft.test.ts` — confirmation and sent-recipient behavior.
- `src/components/ComposeStep.tsx` — associated IDs for Subject, Channel, and Message Body.
- `src/components/common/MarkdownEditor.tsx` — forward an `id` to the underlying textarea.

### Delete

- `src/views/admin/communications/ReviewSidebar.tsx` — its recipient and compliance responsibilities become independently orderable components.

## Task 1: Add one source of truth for channel reach

**Files:**
- Create: `src/views/admin/communications/recipientReach.ts`
- Create: `test/views/admin/communications/recipientReach.test.ts`

- [ ] **Step 1: Write the failing pure-function tests**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CommunicationRecipient } from '../../../../src/services/communicationService';
import {
  buildSendConfirmation,
  getReachableRecipients,
  summarizeRecipientReach,
} from '../../../../src/views/admin/communications/recipientReach';

const recipient = (
  id: string,
  email: string,
  phone: string
): CommunicationRecipient => ({
  id,
  name: `Recipient ${id}`,
  email,
  phone,
  voicePart: 'Alto',
  globalStatus: 'Active',
});

const recipients = [
  recipient('both', 'both@example.com', '5551234567'),
  recipient('email', 'email@example.com', ''),
  recipient('sms', '', '5559876543'),
  recipient('none', '', ''),
];

describe('recipient reach', () => {
  it('counts unique people and per-channel deliveries', () => {
    assert.deepEqual(summarizeRecipientReach(recipients, 'Both'), {
      totalSelected: 4,
      reachablePeople: 3,
      excludedPeople: 1,
      emailDeliveries: 2,
      smsDeliveries: 2,
    });
  });

  it('filters recipients for a single channel', () => {
    assert.deepEqual(
      getReachableRecipients(recipients, 'SMS').map((item) => item.id),
      ['both', 'sms']
    );
  });

  it('builds subject, channel, delivery, and exclusion confirmation copy', () => {
    const summary = summarizeRecipientReach(recipients, 'Both');
    assert.equal(
      buildSendConfirmation('Concert Update', 'Both', summary),
      [
        'Send “Concert Update” by email and SMS to 3 recipients?',
        '2 email deliveries · 2 SMS deliveries.',
        '1 selected recipient will be excluded because neither channel is available.',
      ].join('\n')
    );
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `rtk npx vitest run test/views/admin/communications/recipientReach.test.ts`

Expected: FAIL because `recipientReach.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
import type {
  CommunicationRecipient,
  MessageType,
} from '../../../services/communicationService';

export interface RecipientReachSummary {
  totalSelected: number;
  reachablePeople: number;
  excludedPeople: number;
  emailDeliveries: number;
  smsDeliveries: number;
}

function hasEmail(recipient: CommunicationRecipient): boolean {
  return Boolean(recipient.email?.trim());
}

function hasSms(recipient: CommunicationRecipient): boolean {
  return Boolean(recipient.phone?.trim());
}

export function getReachableRecipients(
  recipients: CommunicationRecipient[],
  messageType: MessageType
): CommunicationRecipient[] {
  return recipients.filter((recipient) => {
    if (messageType === 'Email') return hasEmail(recipient);
    if (messageType === 'SMS') return hasSms(recipient);
    return hasEmail(recipient) || hasSms(recipient);
  });
}

export function summarizeRecipientReach(
  recipients: CommunicationRecipient[],
  messageType: MessageType
): RecipientReachSummary {
  const emailDeliveries = recipients.filter(hasEmail).length;
  const smsDeliveries = recipients.filter(hasSms).length;
  const reachablePeople = getReachableRecipients(recipients, messageType).length;

  return {
    totalSelected: recipients.length,
    reachablePeople,
    excludedPeople: recipients.length - reachablePeople,
    emailDeliveries: messageType === 'SMS' ? 0 : emailDeliveries,
    smsDeliveries: messageType === 'Email' ? 0 : smsDeliveries,
  };
}

function recipientWord(count: number): string {
  return count === 1 ? 'recipient' : 'recipients';
}

export function buildSendConfirmation(
  subject: string,
  messageType: MessageType,
  summary: RecipientReachSummary
): string {
  const displaySubject = subject.trim() || 'SMS message';
  const channel =
    messageType === 'Both' ? 'email and SMS' : messageType === 'Email' ? 'email' : 'SMS';
  const lines = [
    `Send “${displaySubject}” by ${channel} to ${summary.reachablePeople} ${recipientWord(summary.reachablePeople)}?`,
  ];

  if (messageType === 'Both') {
    lines.push(
      `${summary.emailDeliveries} email deliveries · ${summary.smsDeliveries} SMS deliveries.`
    );
  }

  if (summary.excludedPeople > 0) {
    lines.push(
      `${summary.excludedPeople} selected ${recipientWord(summary.excludedPeople)} will be excluded because ${messageType === 'Both' ? 'neither channel is' : `${channel} is`} available.`
    );
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run the focused test**

Run: `rtk npx vitest run test/views/admin/communications/recipientReach.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the helper**

```bash
rtk git add src/views/admin/communications/recipientReach.ts test/views/admin/communications/recipientReach.test.ts
rtk git commit -m "feat(communications): centralize recipient reach calculations"
```

## Task 2: Replace the clipped mobile tab rail and expose Templates

**Files:**
- Modify: `src/types/Communication.ts`
- Modify: `src/components/CommunicationTabs.tsx`
- Modify: `test/CommunicationTabs.test.tsx`
- Modify: `src/views/admin/CommunicationView.tsx`
- Modify: `src/views/admin/communications/SettingsPanel.tsx`

- [ ] **Step 1: Update the navigation tests first**

Replace the old label assertions with:

```tsx
it('renders all six desktop communication sections', () => {
  render(<CommunicationTabs activeTab="compose" onTabChange={mock.fn()} draftsCount={2} />);

  for (const label of ['Compose', 'Drafts', 'History', 'Templates', 'Upcoming Sends', 'Settings']) {
    assert.ok(screen.getAllByText(label).length > 0, `${label} should be present`);
  }
});

it('changes sections through the mobile selector', () => {
  const onTabChange = mock.fn();
  render(<CommunicationTabs activeTab="compose" onTabChange={onTabChange} draftsCount={2} />);

  fireEvent.change(screen.getByLabelText('Communications section'), {
    target: { value: 'templates' },
  });

  assert.equal(onTabChange.mock.calls[0].arguments[0], 'templates');
});
```

Import `fireEvent` from React Testing Library and remove tests for the old `Scheduled` and `New Message` tab labels.

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk npx vitest run test/CommunicationTabs.test.tsx`

Expected: FAIL because Templates and the mobile selector are absent.

- [ ] **Step 3: Add the new tab type and shared section definition**

```ts
export type CommunicationTab =
  | 'compose'
  | 'drafts'
  | 'history'
  | 'templates'
  | 'automated'
  | 'settings';

export const COMMUNICATION_SECTIONS: ReadonlyArray<{
  value: CommunicationTab;
  label: string;
}> = [
  { value: 'compose', label: 'Compose' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'history', label: 'History' },
  { value: 'templates', label: 'Templates' },
  { value: 'automated', label: 'Upcoming Sends' },
  { value: 'settings', label: 'Settings' },
];
```

Keep `MessageTemplate` in the same file. Add `updated?: string` to it for Task 6.

- [ ] **Step 4: Render desktop tabs and the mobile Select from the same data**

Use the existing wrapper, never a raw Shoelace import:

```tsx
import { Select } from './ui';
import { COMMUNICATION_SECTIONS, type CommunicationTab } from '../types/Communication';

return (
  <div className="w-full">
    <div className="md:hidden">
      <label htmlFor="communications-section" className="text-text mb-1 block text-sm font-medium">
        Communications section
      </label>
      <Select
        id="communications-section"
        aria-label="Communications section"
        value={activeTab}
        onChange={(event) => onTabChange(event.target.value as CommunicationTab)}
      >
        {COMMUNICATION_SECTIONS.map((section) => (
          <option key={section.value} value={section.value}>
            {section.value === 'drafts' && draftsCount > 0
              ? `${section.label} (${draftsCount})`
              : section.label}
          </option>
        ))}
      </Select>
    </div>

    <nav className="border-border hidden border-b md:block" aria-label="Communications sections">
      <div className="flex items-center gap-6">
        {COMMUNICATION_SECTIONS.map((section) => (
          <button
            key={section.value}
            type="button"
            className={`relative -mb-px flex min-h-[44px] cursor-pointer items-center gap-1.5 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors duration-150 ${
              activeTab === section.value
                ? 'border-primary text-primary'
                : 'text-text-muted hover:text-text border-transparent hover:border-slate-300'
            }`}
            onClick={() => onTabChange(section.value)}
            aria-current={activeTab === section.value ? 'page' : undefined}
          >
            <span>{section.label}</span>
            {section.value === 'drafts' && draftsCount > 0 && (
              <span className="bg-primary inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white">
                {draftsCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  </div>
);
```

Delete the mobile fade indicator and overflow rail.

- [ ] **Step 5: Move the existing template manager to the top-level Templates section**

In `CommunicationView.tsx`, import `TemplatesPanel`, render it for `tab === 'templates'`, and pass the props currently passed through `SettingsPanel`:

```tsx
{tab === 'templates' && (
  <TemplatesPanel
    templates={library.templates}
    setTemplates={library.setTemplates}
    editingTemplate={library.editingTemplate}
    setEditingTemplate={library.setEditingTemplate}
    dialog={dialog}
    previewHtml={preview.previewHtml}
    onInsertPlaceholder={insertPlaceholder}
    editorRef={editorRef}
    choirName={library.choirName}
    senderEmail={library.commConfig.smtp.from || 'no-reply@choir.management'}
  />
)}
```

Remove all template-related props and the `editingTemplate ? ... : ...` branch from `SettingsPanel`; render its existing settings cards directly. Remove now-unused `EasyMDE`, `TemplateRecord`, `TemplatesPanel`, and `useDialog` imports from that file. Change the header action label to a single visible `+ New Message` string.

- [ ] **Step 6: Run navigation tests and TypeScript build**

Run: `rtk npx vitest run test/CommunicationTabs.test.tsx`

Expected: PASS.

Run: `rtk npm run build`

Expected: PASS. The build also runs hook integrity and the required high-severity audit.

- [ ] **Step 7: Commit responsive navigation and the template move**

```bash
rtk git add src/types/Communication.ts src/components/CommunicationTabs.tsx test/CommunicationTabs.test.tsx src/views/admin/CommunicationView.tsx src/views/admin/communications/SettingsPanel.tsx
rtk git commit -m "feat(communications): add mobile section navigation"
```

## Task 3: Add semantic wizard progress and transition focus

**Files:**
- Create: `src/views/admin/communications/WizardStepHeading.tsx`
- Create: `src/views/admin/communications/useWizardStepNavigation.ts`
- Create: `test/views/admin/communications/useWizardStepNavigation.test.tsx`
- Modify: `src/components/WizardStepper.tsx`
- Modify: `src/views/admin/communications/ComposePanel.tsx`
- Modify: all four step components

- [ ] **Step 1: Write the transition test**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useWizardStepNavigation } from '../../../../src/views/admin/communications/useWizardStepNavigation';
import type { WizardStep } from '../../../../src/views/admin/communications/types';

afterEach(() => cleanup());

function Fixture() {
  const [step, setStep] = useState<WizardStep>('TARGETS');
  const ref = useRef<HTMLDivElement>(null);
  useWizardStepNavigation(step, ref);
  return (
    <div ref={ref}>
      <button onClick={() => setStep('REVIEW')}>Next</button>
      <h2 tabIndex={-1} data-wizard-step-heading={step}>Heading {step}</h2>
    </div>
  );
}

describe('useWizardStepNavigation', () => {
  it('scrolls and focuses only after a real step change', () => {
    const scrollIntoView = mock.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    render(<Fixture />);

    assert.equal(scrollIntoView.mock.callCount(), 0);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    assert.equal(scrollIntoView.mock.callCount(), 1);
    assert.equal(document.activeElement, screen.getByRole('heading', { name: 'Heading REVIEW' }));
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk npx vitest run test/views/admin/communications/useWizardStepNavigation.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the heading and hook**

```tsx
// WizardStepHeading.tsx
import type { WizardStep } from './types';

interface WizardStepHeadingProps {
  step: WizardStep;
  number: number;
  title: string;
  description: string;
}

export function WizardStepHeading({ step, number, title, description }: WizardStepHeadingProps) {
  return (
    <div>
      <h2
        tabIndex={-1}
        data-wizard-step-heading={step}
        className="text-text text-base font-semibold outline-none sm:text-lg"
      >
        Step {number}: {title}
      </h2>
      <p className="text-text-muted text-xs sm:text-sm">{description}</p>
    </div>
  );
}
```

```ts
// useWizardStepNavigation.ts
import { useEffect, useRef } from 'react';
import type React from 'react';
import type { WizardStep } from './types';

export function useWizardStepNavigation(
  step: WizardStep,
  containerRef: React.RefObject<HTMLDivElement | null>
): void {
  const previousStepRef = useRef(step);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;

    const container = containerRef.current;
    const heading = container?.querySelector<HTMLElement>(
      `[data-wizard-step-heading="${step}"]`
    );
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    container?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [step, containerRef]);
}
```

- [ ] **Step 4: Wire the hook into ComposePanel**

Add `const wizardRef = useRef<HTMLDivElement>(null);`, call `useWizardStepNavigation(wizardStep, wizardRef)`, and place `ref={wizardRef}` on the outer composer container. Replace each step's ad-hoc heading with `WizardStepHeading`, using step IDs `TARGETS`, `TEMPLATE`, `COMPOSE`, and `REVIEW`.

Change `WizardStepper` to a `<nav aria-label="Message creation progress"><ol>…</ol></nav>`, set `aria-current="step"` on the active button, and give each button `min-h-11 min-w-11`. Keep disabled-step rules unchanged.

- [ ] **Step 5: Run focused tests**

Run: `rtk npx vitest run test/views/admin/communications/useWizardStepNavigation.test.tsx test/views/admin/communications/AudienceStep.test.tsx test/views/admin/communications/ComposeMessageStep.test.tsx test/views/admin/communications/ReviewStep.test.tsx`

Expected: PASS after updating heading text queries to the shared wording.

- [ ] **Step 6: Commit wizard navigation behavior**

```bash
rtk git add src/components/WizardStepper.tsx src/views/admin/communications/ComposePanel.tsx src/views/admin/communications/WizardStepHeading.tsx src/views/admin/communications/useWizardStepNavigation.ts src/views/admin/communications/AudienceStep.tsx src/views/admin/communications/TemplateStep.tsx src/views/admin/communications/ComposeMessageStep.tsx src/views/admin/communications/ReviewStep.tsx test/views/admin/communications/
rtk git commit -m "fix(communications): reset wizard scroll and focus"
```

## Task 4: Enforce one safe-area action bar per step

**Files:**
- Modify: `src/views/admin/communications/WizardActionBar.tsx`
- Modify: all four step components
- Modify: the four existing step test files

- [ ] **Step 1: Change duplicate-action tests to require one button**

Add or update these assertions:

```ts
assert.equal(screen.getAllByRole('button', { name: /Continue to Templates/i }).length, 1);
assert.equal(screen.getAllByRole('button', { name: /Back to Templates/i }).length, 1);
assert.equal(screen.getAllByRole('button', { name: /Save Draft/i }).length, 1);
assert.equal(screen.getAllByRole('button', { name: /Review Message/i }).length, 1);
assert.equal(screen.getAllByRole('button', { name: /Send Test to Me/i }).length, 1);
assert.equal(
  screen.getAllByRole('button', { name: /^Send (Email|SMS|Both) to/i }).length,
  1
);
```

Place each assertion in the test file for the component that owns the action. Template tests should assert one Back and one Use action.

- [ ] **Step 2: Run the tests and observe duplicate failures**

Run: `rtk npx vitest run test/views/admin/communications/AudienceStep.test.tsx test/views/admin/communications/TemplateStep.test.tsx test/views/admin/communications/ComposeMessageStep.test.tsx test/views/admin/communications/ReviewStep.test.tsx`

Expected: FAIL for Audience, Compose, and Review duplicate actions.

- [ ] **Step 3: Make WizardActionBar one compact row**

```tsx
export function WizardActionBar({ children, className = '' }: WizardActionBarProps) {
  return (
    <div
      className={`border-border bg-surface sticky inset-x-0 bottom-0 z-50 -mx-3 flex min-h-16 items-center justify-between gap-2 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:-mx-6 lg:static lg:mx-0 lg:min-h-0 lg:w-full lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Remove every top action group and keep only the bottom bar**

Use compact responsive labels. Example Back button:

```tsx
<Button
  variant="outline"
  onClick={onBack}
  aria-label="Back to Templates"
  className="size-11 px-0 sm:w-auto sm:px-6"
>
  <span aria-hidden="true">←</span>
  <span className="hidden sm:inline">Back</span>
</Button>
```

Audience primary copy becomes `Continue to Templates`; Template uses `Use blank message` or `Use template`; Compose uses `Save Draft` and `Review Message`; Review uses `Send Test to Me` and the channel-aware send action from Task 7. Add `pb-20 lg:pb-0` to each step's content wrapper before its action bar.

- [ ] **Step 5: Run the focused tests**

Run: `rtk npx vitest run test/views/admin/communications/AudienceStep.test.tsx test/views/admin/communications/TemplateStep.test.tsx test/views/admin/communications/ComposeMessageStep.test.tsx test/views/admin/communications/ReviewStep.test.tsx`

Expected: PASS with exactly one action set per step.

- [ ] **Step 6: Commit action-bar cleanup**

```bash
rtk git add src/views/admin/communications/WizardActionBar.tsx src/views/admin/communications/AudienceStep.tsx src/views/admin/communications/TemplateStep.tsx src/views/admin/communications/ComposeMessageStep.tsx src/views/admin/communications/ReviewStep.tsx test/views/admin/communications/
rtk git commit -m "fix(communications): remove duplicate wizard actions"
```

## Task 5: Compact the audience summary and expose exclusions

**Files:**
- Modify: `src/views/admin/communications/AudienceStatCards.tsx`
- Modify: `src/views/admin/communications/AudienceStep.tsx`
- Modify: `test/views/admin/communications/AudienceStep.test.tsx`

- [ ] **Step 1: Add mobile-summary and exclusion assertions**

```tsx
it('shows compact reach and exclusion information', () => {
  renderWithRouter(
    <AudienceStep
      draft={makeDraft({
        messageType: 'Email',
        recipients: [makeRecipient('email'), makeRecipient('missing', { email: '' })],
        selectedRecipients: [makeRecipient('email'), makeRecipient('missing', { email: '' })],
        recipientCounts: { total: 2, hasEmail: 1, hasPhone: 0 },
      })}
      events={mockEvents}
      voicePartLabels={['Soprano']}
      configSections={mockSections}
      onViewRecipients={mock.fn()}
      onContinue={mock.fn()}
    />
  );

  assert.ok(screen.getByText('1 reachable by email'));
  assert.ok(screen.getByText('1 excluded'));
  assert.ok(screen.getByRole('button', { name: 'Review recipients' }));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk npx vitest run test/views/admin/communications/AudienceStep.test.tsx`

Expected: FAIL because channel exclusions and approved copy are absent.

- [ ] **Step 3: Make interactive stats semantic**

In `AudienceStatCards`, render a `<button type="button">` when `onCardClick` exists and a `<div>` otherwise. Both variants share `grid grid-cols-3 gap-2 md:gap-4`; mobile typography uses `text-xl`, desktop uses `md:text-3xl`, and subtitles use `hidden sm:block`. Set an accessible label such as `${card.label}: ${card.count}. ${card.subtitle}` on buttons.

- [ ] **Step 4: Use the reach helper in AudienceStep**

```tsx
const reach = summarizeRecipientReach(draft.selectedRecipients, draft.messageType);
const channelLabel = draft.messageType === 'SMS' ? 'SMS' : draft.messageType.toLowerCase();

<p className="text-text-muted mt-3 text-sm" aria-live="polite">
  {reach.reachablePeople} reachable by {channelLabel}
  {reach.excludedPeople > 0 ? ` · ${reach.excludedPeople} excluded` : ''}
</p>

<Button
  type="button"
  variant="outline"
  disabled={draft.selectedRecipients.length === 0}
  onClick={() => onViewRecipients(draft.selectedRecipients, 'Recipients selected for send')}
>
  Review recipients
</Button>
```

Remove the tall first-five recipient preview card on mobile with `hidden lg:block`; keep it available on desktop. Mark decorative summary SVGs `aria-hidden="true"`.

- [ ] **Step 5: Associate Audience labels with controls**

Add stable IDs and matching `htmlFor` values: `audience-event`, `audience-rsvp`, `audience-status`, and `audience-voice-parts`. Use a `<fieldset><legend>` for Audience Types instead of an unassociated label.

- [ ] **Step 6: Run the audience tests**

Run: `rtk npx vitest run test/views/admin/communications/AudienceStep.test.tsx test/views/admin/communications/recipientReach.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the audience treatment**

```bash
rtk git add src/views/admin/communications/AudienceStatCards.tsx src/views/admin/communications/AudienceStep.tsx test/views/admin/communications/AudienceStep.test.tsx
rtk git commit -m "feat(communications): clarify mobile audience reach"
```

## Task 6: Make template choice semantic, curated, and explicit

**Files:**
- Modify: `src/types/Communication.ts`
- Modify: `src/views/admin/communications/templateMapping.ts`
- Modify: `src/views/admin/communications/useTemplateSelection.ts`
- Modify: `src/components/TemplateGrid.tsx`
- Create: `test/components/TemplateGrid.test.tsx`
- Modify: `src/views/admin/communications/TemplateStep.tsx`
- Modify: `test/views/admin/communications/TemplateStep.test.tsx`

- [ ] **Step 1: Write semantic ordering tests**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TemplateGrid } from '../../src/components/TemplateGrid';
import type { MessageTemplate } from '../../src/types/Communication';

afterEach(() => cleanup());

const templates: MessageTemplate[] = [
  { id: 'custom-old', title: 'Old Custom', description: '', category: 'general', channel: 'email', origin: 'custom', updated: '2026-01-01' },
  { id: 'system', title: 'Recommended', description: '', category: 'general', channel: 'email', origin: 'system', updated: '2026-01-02' },
  { id: 'custom-new', title: 'New Custom', description: '', category: 'general', channel: 'email', origin: 'custom', updated: '2026-07-01' },
];

describe('TemplateGrid', () => {
  it('uses a radio group and selects without applying', () => {
    const onSelect = mock.fn();
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={onSelect} />);
    const recommended = screen.getByRole('radio', { name: /Recommended/i });
    fireEvent.click(recommended);
    assert.equal(onSelect.mock.calls[0].arguments[0].id, 'system');
    assert.equal(screen.getByRole('radio', { name: /Blank Message/i }).getAttribute('aria-checked'), 'true');
  });

  it('orders blank, recommended system, then recent custom templates', () => {
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={mock.fn()} />);
    const labels = screen.getAllByRole('radio').map((item) => item.textContent || '');
    assert.match(labels[0], /Blank Message/);
    assert.match(labels[1], /Recommended/);
    assert.match(labels[2], /New Custom/);
  });
});
```

- [ ] **Step 2: Change TemplateStep tests to selection-then-use**

The card click must call `setSelectedTemplateId('tpl-1')` and must not call `handleUseTemplate`. Clicking the one `Use template` button then calls `handleUseTemplate()` once.

- [ ] **Step 3: Run both tests and verify they fail**

Run: `rtk npx vitest run test/components/TemplateGrid.test.tsx test/views/admin/communications/TemplateStep.test.tsx`

Expected: FAIL because cards are clickable divs and selection currently advances immediately.

- [ ] **Step 4: Separate selection from application**

Change the hook contract to:

```ts
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');

const handleUseTemplate = useCallback(() => {
  if (selectedTemplateId === 'blank') {
    setSubject('');
    setContent('');
    setMessageType('Email');
  } else {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    setSubject(template.subject || '');
    setContent(template.content || '');
    setMessageType(template.type);
  }
  onContinue();
}, [selectedTemplateId, templates, setSubject, setContent, setMessageType, onContinue]);

return { selectedTemplateId, setSelectedTemplateId, handleUseTemplate };
```

- [ ] **Step 5: Preserve timestamps and render semantic choices**

Add `updated: tpl.updated` in `mapToMessageTemplate`. In `TemplateGrid`, create one Blank option, sort system templates by title, sort custom templates by descending `updated`, show the three newest custom templates before a closed `<details>` labeled `More templates`, and render every option as:

```tsx
<button
  key={template.id}
  type="button"
  role="radio"
  aria-checked={template.id === selectedTemplateId}
  onClick={() => onSelect(template)}
  className={`flex min-h-[120px] w-full cursor-pointer flex-col rounded-lg border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
    template.id === selectedTemplateId
      ? 'border-primary bg-primary-light/30 ring-primary/20 ring-2'
      : 'border-border bg-bg hover:border-primary'
  }`}
>
  <div
    className={`mb-2.5 flex items-center justify-between ${
      template.id === selectedTemplateId ? 'text-primary-deep' : 'text-primary'
    }`}
  >
    <IconComponent />
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${
        template.id === selectedTemplateId
          ? 'bg-primary/20 text-primary-deep'
          : 'bg-primary-light text-primary-deep'
      }`}
    >
      {isBlank ? 'blank' : template.channel}
    </span>
  </div>
  <h4 className="text-text m-0 mb-1 text-sm font-semibold">{template.title}</h4>
  <p className="text-text-muted m-0 text-xs leading-relaxed">
    {template.description}
  </p>
  {template.id === selectedTemplateId && (
    <span className="text-text-muted mt-2 block text-xs sm:hidden">
      {template.subjectLine || template.description}
    </span>
  )}
</button>
```

Wrap choices with `<div role="radiogroup" aria-label="Message templates">`.

- [ ] **Step 6: Add the explicit TemplateStep action bar**

Pass `onSelect={(template) => templateSelection.setSelectedTemplateId(template.id)}`. The primary action calls `templateSelection.handleUseTemplate` and reads `Use blank message` or `Use template`. It must be the only action that advances.

- [ ] **Step 7: Run template tests**

Run: `rtk npx vitest run test/components/TemplateGrid.test.tsx test/views/admin/communications/TemplateStep.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit template selection changes**

```bash
rtk git add src/types/Communication.ts src/views/admin/communications/templateMapping.ts src/views/admin/communications/useTemplateSelection.ts src/components/TemplateGrid.tsx src/views/admin/communications/TemplateStep.tsx test/components/TemplateGrid.test.tsx test/views/admin/communications/TemplateStep.test.tsx
rtk git commit -m "feat(communications): make template selection explicit"
```

## Task 7: Reorder Review and default phone previews to Mobile

**Files:**
- Create: `src/views/admin/communications/RecipientSummaryCard.tsx`
- Modify: `src/views/admin/communications/ReviewStep.tsx`
- Delete: `src/views/admin/communications/ReviewSidebar.tsx`
- Modify: `src/components/LivePreview.tsx`
- Create: `test/components/LivePreview.test.tsx`
- Modify: `test/views/admin/communications/ReviewStep.test.tsx`

- [ ] **Step 1: Add Review ordering and preview-default tests**

In `ReviewStep.test.tsx`, assert DOM order using stable section markers and `compareDocumentPosition`:

```ts
const summary = document.querySelector<HTMLElement>('[data-review-section="recipients"]');
const preview = document.querySelector<HTMLElement>('[data-review-section="preview"]');
const checklist = document.querySelector<HTMLElement>('[data-review-section="checklist"]');
assert.ok(summary && preview && checklist);
assert.ok(summary.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING);
assert.ok(preview.compareDocumentPosition(checklist) & Node.DOCUMENT_POSITION_FOLLOWING);
```

Create `LivePreview.test.tsx`, mock `window.matchMedia` to return `matches: true` for `max-width: 767px`, render an Email preview, and assert the Mobile button has the selected `secondary` class while Desktop is outline.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `rtk npx vitest run test/components/LivePreview.test.tsx test/views/admin/communications/ReviewStep.test.tsx`

Expected: FAIL because the preview defaults to desktop and ReviewSidebar prevents the desired order.

- [ ] **Step 3: Extract RecipientSummaryCard**

Move only the current recipient-summary `AppCard` from `ReviewSidebar.tsx` into `RecipientSummaryCard.tsx`. Its props are `selectedRecipients`, `recipientCounts`, and `onViewRecipients`. Retain semantic stat-button filtering and change `View List` to `Review recipients`.

- [ ] **Step 4: Use one CSS grid with three independently orderable children**

In `ReviewStep.tsx`, replace `ReviewSidebar` with:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
  <div data-review-section="recipients" className="order-1 lg:col-start-2 lg:row-start-1">
    <RecipientSummaryCard {...recipientSummaryProps} />
  </div>
  <div data-review-section="preview" className="order-2 lg:col-start-1 lg:row-span-2 lg:row-start-1">
    <AppCard noPadding>
      <div className="p-4">
        <LivePreview
          channel={draft.messageType}
          subject={preview.renderedSubject}
          bodyHtml={preview.previewHtml}
          smsBody={preview.renderedSmsBody}
          recipientName={preview.previewRecipient?.name}
          recipientEmail={preview.previewRecipient?.email}
          senderName={choirName}
          senderEmail={senderEmail}
        />
      </div>
    </AppCard>
  </div>
  <div data-review-section="checklist" className="order-3 lg:col-start-2 lg:row-start-2">
    <PreFlightChecklist {...preflightProps} />
  </div>
</div>
```

Render the one `WizardActionBar` after the grid. Delete `ReviewSidebar.tsx` after all imports are removed.

- [ ] **Step 5: Default LivePreview from the existing media-query hook**

```tsx
const isPhone = useMediaQuery('(max-width: 767px)');
const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>(() =>
  isPhone ? 'mobile' : 'desktop'
);
```

Wrap desktop and phone emoji in `<span aria-hidden="true">`; keep visible Desktop and Mobile text in separate spans.

- [ ] **Step 6: Run Review and preview tests**

Run: `rtk npx vitest run test/components/LivePreview.test.tsx test/views/admin/communications/ReviewStep.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit Review hierarchy**

```bash
rtk git add src/views/admin/communications/RecipientSummaryCard.tsx src/views/admin/communications/ReviewStep.tsx src/views/admin/communications/ReviewSidebar.tsx src/components/LivePreview.tsx test/components/LivePreview.test.tsx test/views/admin/communications/ReviewStep.test.tsx
rtk git commit -m "feat(communications): prioritize mobile review trust"
```

## Task 8: Filter unreachable recipients and strengthen send confirmation

**Files:**
- Modify: `src/views/admin/communications/useCommunicationDraft.ts`
- Modify: `test/views/admin/communications/useCommunicationDraft.test.ts`
- Modify: `src/views/admin/communications/ReviewStep.tsx`
- Modify: `src/views/admin/communications/PreFlightChecklist.tsx`

- [ ] **Step 1: Add a send-pipeline test**

Append a test that replaces `communicationService.sendBulkMessage` with `mock.method`, renders the hook with a dialog whose `confirm` captures options, sets recipients to one email-capable and one unreachable record, and calls `sendMessage` inside `act`. Assert:

```ts
act(() => {
  result.current.setSubject('Test subject');
  result.current.setMessageType('Email');
  result.current.setRecipients([reachable, unreachable]);
  result.current.setSelectedIds(new Set(['reachable', 'unreachable']));
});

await act(async () => {
  await result.current.sendMessage();
});

assert.match(String(confirmOptions.message), /Send “Test subject” by email to 1 recipient/);
assert.match(String(confirmOptions.message), /1 selected recipient will be excluded/);
assert.equal(sendInput.recipients.length, 1);
assert.equal(sendInput.recipients[0]?.id, 'reachable');
```

Use a fresh `QueryClient` inside the test so mutation state cannot leak from existing tests.

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk npx vitest run test/views/admin/communications/useCommunicationDraft.test.ts`

Expected: FAIL because confirmation is generic and unreachable recipients are still persisted.

- [ ] **Step 3: Apply the reach helper at the send boundary**

Inside `sendMessage`:

```ts
const reach = summarizeRecipientReach(selectedRecipients, messageType);
const reachableRecipients = getReachableRecipients(selectedRecipients, messageType);

if (reachableRecipients.length === 0) {
  await dialog.showMessage({
    title: 'No Reachable Recipients',
    message: 'None of the selected recipients can receive the selected channel.',
    variant: 'warning',
  });
  return;
}

const confirmSend = await dialog.confirm({
  title: 'Confirm Send',
  message: buildSendConfirmation(subject, messageType, reach),
  confirmLabel: messageType === 'SMS' ? 'Send SMS' : messageType === 'Email' ? 'Send Email' : 'Send Both',
  cancelLabel: 'Cancel',
});
```

Use `reachableRecipients` in the final `SendMessageInput`. Do not wrap the PocketBase error returned by the mutation.

Replace the send catch block's raw console logging and generic text with display-only formatting:

```ts
} catch (error: unknown) {
  await dialog.showMessage({
    title: 'Message Not Sent',
    message: formatPocketBaseError(error),
    variant: 'danger',
  });
}
```

Import the existing `formatPocketBaseError` helper. The caught value remains unchanged; it is formatted only at the UI boundary.

- [ ] **Step 4: Make Review actions channel-aware**

Compute `const reach = summarizeRecipientReach(draft.selectedRecipients, draft.messageType)`. Disable Send when `reach.reachablePeople === 0`. Use visible copy `Send Email to N`, `Send SMS to N`, or `Send Both to N`, followed by the configured singular/plural performer label. Update `PreFlightChecklist` to derive exclusions from the same helper rather than independent `some()` checks.

- [ ] **Step 5: Run draft and Review tests**

Run: `rtk npx vitest run test/views/admin/communications/useCommunicationDraft.test.ts test/views/admin/communications/ReviewStep.test.tsx test/views/admin/communications/recipientReach.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit send safety**

```bash
rtk git add src/views/admin/communications/useCommunicationDraft.ts src/views/admin/communications/ReviewStep.tsx src/views/admin/communications/PreFlightChecklist.tsx test/views/admin/communications/useCommunicationDraft.test.ts test/views/admin/communications/ReviewStep.test.tsx
rtk git commit -m "fix(communications): confirm actual channel reach before send"
```

## Task 9: Associate composer fields and complete the accessibility sweep

**Files:**
- Modify: `src/components/common/MarkdownEditor.tsx`
- Modify: `src/components/ComposeStep.tsx`
- Modify: `src/views/admin/communications/AudienceStep.tsx`
- Modify: `src/views/admin/communications/TemplatesPanel.tsx`
- Modify: Phase 1 component tests

- [ ] **Step 1: Add label assertions**

In `ComposeMessageStep.test.tsx`, assert:

```ts
assert.ok(screen.getByLabelText('Subject'));
assert.ok(screen.getByLabelText('Channel'));
assert.ok(screen.getByLabelText('Message Body (Markdown Supported)'));
```

Add equivalent `getByLabelText` assertions for the Audience selects and template editor fields.

Use these exact accessible names in the tests: `Event Context`, `RSVP Status`, `Member Status`, `Voice Part / Section`, `Template Title`, `Channel`, `Subject`, and `Template Body (Markdown Supported)`. Give the four Audience Selects IDs `audience-event-context`, `audience-rsvp-status`, `audience-member-status`, and `audience-voice-parts`. Render Audience Types as a `<fieldset>` with a `<legend>` so the Checkbox children retain their own accessible names. Give template fields IDs `template-title`, `template-channel`, `template-subject`, and `template-body`.

- [ ] **Step 2: Run the tests and verify missing associations**

Run: `rtk npx vitest run test/views/admin/communications/ComposeMessageStep.test.tsx test/views/admin/communications/AudienceStep.test.tsx`

Expected: FAIL for controls whose labels lack matching IDs.

- [ ] **Step 3: Forward an ID through MarkdownEditor**

Add `id?: string` to `MarkdownEditorProps`, accept it in the component, and apply `id={id}` to both the test textarea and production textarea.

- [ ] **Step 4: Add stable IDs to ComposeStep**

```tsx
<FormField label="Subject" htmlFor="communication-subject" error={subjectWarning?.message}>
  <Input id="communication-subject" ... />
</FormField>
<FormField label="Channel" htmlFor="communication-channel">
  <Select id="communication-channel" ... />
</FormField>
<FormField label="Message Body (Markdown Supported)" htmlFor="communication-body">
  <MarkdownEditor id="communication-body" ... />
</FormField>
```

Apply the same `htmlFor`/`id` pattern to template title, channel, subject, and body. Mark decorative SVGs `aria-hidden="true"`; preserve accessible text for all actions.

- [ ] **Step 5: Run focused tests and lint changed files**

Run: `rtk npx vitest run test/views/admin/communications/ test/components/TemplateGrid.test.tsx test/components/LivePreview.test.tsx test/CommunicationTabs.test.tsx`

Expected: PASS.

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/components/CommunicationTabs.tsx src/components/WizardStepper.tsx src/components/TemplateGrid.tsx src/components/LivePreview.tsx src/components/ComposeStep.tsx src/components/common/MarkdownEditor.tsx src/views/admin/CommunicationView.tsx src/views/admin/communications/`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit accessibility associations**

```bash
rtk git add src/components src/views/admin/CommunicationView.tsx src/views/admin/communications test
rtk git commit -m "fix(communications): complete send-flow accessibility"
```

## Task 10: Phase 1 regression and responsive verification

**Files:**
- No source changes expected; fix only failures caused by this phase.

- [ ] **Step 1: Run all communications tests**

Run: `rtk npx vitest run test/views/admin/communications/ test/CommunicationTabs.test.tsx test/components/TemplateGrid.test.tsx test/components/LivePreview.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run project checks proportionate to the UI change**

Run: `rtk npm run build`

Expected: PASS, including TypeScript, Vite build, hook integrity, and high-severity audit.

- [ ] **Step 3: Perform responsive smoke tests**

Start: `rtk npm run dev`

At 390 × 844, tablet width, and desktop width, verify:

- the mobile selector exposes all six sections;
- every wizard step has one action set;
- the sticky bar remains above the safe area and never blocks the last field;
- focusing Subject and Message Body with the phone keyboard open leaves the active control and action bar usable;
- a long Compose page enters Review at Recipient Summary;
- template selection does not advance until Use is pressed;
- Review order is summary → preview → checklist → actions on mobile;
- keyboard focus follows step changes;
- confirmation reports subject, channel, reach, and exclusions.

- [ ] **Step 4: Inspect final scope**

Run: `rtk git status --short`

Expected: only intentional Phase 1 files are modified, or clean if every task was committed.

## Phase 1 completion report requirements

Report changed behavior, focused test commands, build result, responsive smoke viewports, and any unavailable manual device checks. Confirm that no generated hook file, migration, unsafe TypeScript escape hatch, raw Shoelace import, or signed-token contract changed.
