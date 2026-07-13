# Communications UI/UX Polish Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Communications UX improvements as three independently verifiable releases, with mobile usability, accessibility, save safety, and send safety treated as release gates.

**Architecture:** Execute three workflow-oriented plans in order. Phase 1 fixes the message-send journey and establishes the final navigation structure; Phase 2 adds autosave and reorganizes management surfaces; Phase 3 adds bounded queue observability and retry without denormalizing delivery state into messages.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Shoelace wrappers, TanStack Query v5, PocketBase 0.36.9 hooks and JS SDK, responsive DataTable, Vitest/React Testing Library through the repository's compatibility layer.

---

## Source documents

- Design: `docs/superpowers/specs/2026-07-13-communications-ui-ux-polish-design.md`
- Phase 1: `docs/superpowers/plans/2026-07-13-communications-phase-1-mobile-send-flow.md`
- Phase 2: `docs/superpowers/plans/2026-07-13-communications-phase-2-drafts-settings.md`
- Phase 3: `docs/superpowers/plans/2026-07-13-communications-phase-3-delivery-visibility.md`
- Evidence audit: `/Users/wesosborn/.codex/visualizations/2026/07/13/019f5bd7-404b-7d41-ac85-36099882837e/communications-ui-ux-audit/communications-ux-audit.md`

## Execution order and release gates

### Release 1: Mobile send flow

- [ ] Execute every task in the Phase 1 plan.
- [ ] Require focused communication tests and `rtk npm run build` to pass.
- [ ] Smoke test 390 × 844, tablet, and desktop widths.
- [ ] Confirm one action bar per step, step focus reset, semantic template/audience controls, and accurate channel exclusions.
- [ ] Release independently before starting Phase 2.

### Release 2: Draft confidence and settings

- [ ] Start only after Phase 1 is merged and template management has one top-level home.
- [ ] Execute every task in the Phase 2 plan.
- [ ] Require fake-timer autosave tests, Settings tests, communications tests, lint, and build to pass.
- [ ] Smoke test background/foreground, failed save retry, conflict recovery, and first-click settings persistence.
- [ ] Release independently before starting Phase 3.

### Release 3: Delivery visibility and retry

- [ ] Start only after Phase 2 History and empty-state contracts are stable.
- [ ] Execute every task in the Phase 3 plan.
- [ ] Require frontend delivery tests, `rtk npm run generate:pb-hooks`, `rtk npm run check:pb-hooks`, lint, and build to pass.
- [ ] Verify active, terminal, archived, legacy, Both-channel, partial, failed, and retry states.
- [ ] Confirm the generated hook changed only through regeneration and successful deliveries cannot be retried.

## Cross-phase verification matrix

| Requirement | Phase | Automated evidence | Manual evidence |
| --- | --- | --- | --- |
| Mobile section navigation exposes every area | 1 | `test/CommunicationTabs.test.tsx` | 390 × 844 selector walkthrough |
| One action set per wizard step | 1 | Four step-component test files | Phone and desktop wizard walkthrough |
| Step changes reset scroll and focus | 1 | `useWizardStepNavigation.test.tsx` | Long Compose → Review transition |
| Audience exclusions are visible and accurate | 1 | `recipientReach.test.ts`, Audience tests | Email/SMS/Both recipient mixtures |
| Template selection is keyboard semantic and explicit | 1 | `TemplateGrid.test.tsx`, TemplateStep tests | Keyboard-only template choice |
| Review order builds trust before send | 1 | ReviewStep DOM-order assertions | Phone Review walkthrough |
| Confirmation repeats subject/channel/reach/exclusions | 1 | `useCommunicationDraft.test.ts` | Cancel and confirm sends |
| Autosave never creates an empty draft | 2 | `useDraftAutosave.test.tsx` | Open/leave untouched Compose |
| Rapid edits cannot produce stale writes | 2 | deferred-promise coalescing test | Rapid typing with slow network |
| Background conflicts require an explicit choice | 2 | conflict tests | Two-tab or edited-server simulation |
| Settings save the values visible on first click | 2 | `SettingsPanel.test.tsx` | Change/save/reload each section |
| Empty management screens have useful actions | 2 | panel empty-state tests | Empty database walkthrough |
| Queue-derived labels never overclaim delivery | 3 | `deliveryPresentation.test.ts` | Check Sent wording in History |
| Summary retrieval is one bounded page request | 3 | endpoint and hook call-count tests | Network panel inspection |
| Polling runs only for active visible pages | 3 | fake-timer polling test | Navigate away from History |
| Raw errors and destinations do not reach the browser | 3 | endpoint sanitization tests | Failed-delivery details review |
| Retry touches Failed rows only and is idempotent | 3 | hook endpoint tests | Retry partial message twice |
| Successful deliveries are never resent | 3 | retry preservation test | Observe queue rows after retry |

## Repository-wide safety gates

- [ ] **React Imports:** Always use `import type React from 'react'` instead of value imports.
- [ ] **PocketBase Errors:** Use `formatPocketBaseError(err)` in UI dialogues. Do not use `err instanceof Error ? err.message : String(err)`.
- [ ] **Accessibility:** Ensure all form controls are natively semantic (e.g. use `id`/`htmlFor` bindings and native `<input type="radio">`).
- [ ] **Responsiveness:** Ensure responsive classes (e.g., `sm:hidden`) are applied where requested.
- [ ] Every shell command is prefixed with `rtk`.
- [ ] No `any`, `as any`, `// @ts-ignore`, or new ESLint suppression is introduced.
- [ ] No raw Shoelace component import is introduced; wrappers continue to use `safeSlProps`.
- [ ] PocketBase errors remain raw until display formatting.
- [ ] `profiles.email` is never assumed; existing recipient resolution remains authoritative.
- [ ] Singer eligibility and `On Break` display rules remain unchanged.
- [ ] Signed-token payload formats and parsers remain unchanged.
- [ ] No historical migration is edited.
- [ ] `pocketbase/pb_hooks/main.pb.js` is never hand-edited.
- [ ] Phase 3 hook changes run generation and integrity checks before completion.
- [ ] Network reads and writes remain bounded; no `Promise.all(items.map(networkCall))` is added.

## Final program verification

- [ ] Run all communications and new delivery tests:

```bash
rtk npx vitest run test/views/admin/communications/ test/components/admin/MessageHistory.test.tsx test/components/TemplateGrid.test.tsx test/components/LivePreview.test.tsx test/CommunicationTabs.test.tsx
```

Expected: PASS.

- [ ] Run PocketBase hook verification:

```bash
rtk npm run generate:pb-hooks
rtk npm run check:pb-hooks
```

Expected: PASS; generated output matches source bundles.

- [ ] Run the full build:

```bash
rtk npm run build
```

Expected: PASS, including TypeScript, Vite build, hook integrity, and high-severity audit.

- [ ] Inspect final worktree:

```bash
rtk git status --short
```

Expected: only intentional Communications, tests, hook source, generated hook, and plan/spec files are present, or the tree is clean after task commits.

## Program completion report

Summarize each released phase, commands and results, unavailable manual checks, generated-file handling, TypeScript safety, migration status, signed-token compatibility, network bounds, and remaining risks. The principal remaining product limitation should be stated plainly: `Sent` means provider dispatch succeeded; true inbox delivery requires a separate provider-webhook design.
