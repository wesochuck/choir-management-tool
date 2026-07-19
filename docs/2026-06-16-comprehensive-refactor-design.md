# Comprehensive Refactor Design

**Date:** 2026-06-16
**Status:** Draft

## Problem Summary

The codebase has accumulated several categories of tech debt after migrations (TanStack Query, Web Awesome, Shoelace) that were completed on a per-feature basis, leaving behind legacy patterns and inconsistencies.

## Scope

Eight refactoring items grouped into three independent waves:

### Wave 1: Mechanical Cleanup (Low Risk)
1. **Dead import** — `pb` imported but unused in `PublicLandingView.tsx`
2. **Missing query key** — `useDues.ts` uses inline `['settings', 'roster']` instead of `queryKeys`
3. **Tailwind class ordering** — ~850 warnings from `prettier-plugin-tailwindcss`; auto-fixable
4. **Legacy CSS classes** — ~1472 instances of `btn`, `card`, `text-label`, etc. across ~95 files; replace component-first where possible
5. **Tailwind shorthand** — ~16 instances of `w-4 h-4` → `size-4` etc.

### Wave 2: Behavioral Refactors (Medium Risk)
1. **Direct `pb.collection()` calls in views** — ~12 views bypass the service layer, calling `pb.collection('X').method()` inside `queryFn`/`mutationFn` callbacks. Add missing methods to services and refactor callers.
2. **Direct `pb.authStore` access** — ~12 accesses in views/services bypass `AuthContext`. Extend `AuthContext` with `logout()`, replace `.record`/`.model` with `useAuth().user`, parameterize service calls.

### Wave 3: Architecture Improvements (Medium Risk)
1. **Legacy common component migration** — Replace `src/components/common/` components with their `src/components/ui/` equivalents where API surface matches
2. **Service parameterization** — Continue the authStore cleanup pattern: make `getMyRosters()` and `getMyProfile()` accept a `userId` parameter for testability

## Design Decisions

### Sequencing: Three Phased Waves
- **No wave depends on a later wave.** Each can be implemented, verified, and merged independently.
- Wave order: low-risk mechanical cleanup first, then behavioral changes, then architecture.
- Rationale: Wave 1 builds confidence, Wave 2 eliminates runtime inconsistencies, Wave 3 is optional polish.

### Legacy CSS: Component-First Replacement
- **Priority 1:** Replace with existing Shoelace wrappers (`<Button>`, `<AppCard>`, etc.)
- **Priority 2:** Replace with Tailwind utility classes where no wrapper exists
- **Priority 3:** Keep custom classes only if neither wrapper nor Tailwind can express the requirement
- Sub-tasks grouped by class family to keep diffs reviewable

### Service Testability: Parameterize Auth Only
- No new abstraction layer or repository pattern
- Services that currently read `pb.authStore.model?.id` internally will accept `userId` as a parameter
- React callers pass `user.id` from `useAuth()`
- This is the minimum viable change to enable unit testing without mocking `pb.authStore`

## Implementation Plan Tasks (by Wave)

### Wave 1 Tasks
1. Remove dead `pb` import in `PublicLandingView.tsx`
2. Add `settings.roster` key to `queryKeys.ts`, update `useDues.ts`
3. Run `prettier --write src/` for class ordering
4. Sub-task A: Replace button legacy classes with `<Button>` wrapper
5. Sub-task B: Replace typography legacy classes with Tailwind equivalents
6. Sub-task C: Replace layout/other legacy classes with Tailwind equivalents
7. Fix Tailwind shorthand instances

### Wave 2 Tasks
1. Add missing methods to `ticketService.ts` (bundle CRUD + `hasPaidPurchasesForEvent`)
2. Add missing methods to `pollService.ts` (admin CRUD + `getPollResponses`)
3. Add `getSentPollMessages()` to `communicationService.ts`
4. Add `getMovements()` to `musicLibraryService.ts`
5. Add bulk methods to `rosterService.ts`
6. Add admin/user methods to `profileService.ts`
7. Refactor 12 views to use service methods + remove direct `pb.collection()` calls
8. Extend `AuthContext` with `logout()` method
9. Replace `pb.authStore.record`/`.model` with `useAuth().user` in views
10. Parameterize `getMyRosters()` and `getMyProfile()` with `userId`

### Wave 3 Tasks
1. Audit legacy `src/components/common/` usage across the codebase
2. Replace `Pagination`, `PhotoUploader`, `MarkdownEditor` with `ui/` equivalents where APIs match
3. Verify `PageLayout`, `AppCard`, public components — keep or migrate

## Verification Strategy

### Per-Task Verification
- **Wave 1:** `rtk npx eslint src/` before/after to confirm warning count drops
- **Wave 2:** Each new service method gets a unit test. Views verified with `rtk npm test` and visual check.
- **Wave 3:** `rtk npm test` for component tests, visual check for integration.

### Wave-Level Verification
- `rtk npx eslint src/` — zero errors, warning count confirmed reduced
- `rtk npx vitest run` — all existing tests pass
- `rtk npm run check:pb-hooks` — if any service changes affect hooks (unlikely)
- `rtk npx tsc --noEmit` — no type errors

## Risk Assessment

| Risk | Wave | Mitigation |
|------|------|-----------|
| Renaming CSS classes breaks visual layout | 1 | Review diff per sub-task; verify renders of affected views |
| Service method signature change breaks callers | 2 | All callers updated in same commit; type-check before commit |
| `logout()` addition breaks existing context consumers | 2 | New optional addition; existing consumers unaffected |
| Parameterizing service methods breaks existing callers | 2, 3 | All callers updated in same commit; compile check catches gaps |
| Legacy component API mismatch breaks consumers | 3 | Audit first; only migrate where API parity exists |

## Out of Scope

- Replacing `PageLayout`, `AppCard`, `PublicLayout`, `PublicLogo`, `PublicBrandingWrapper` — these are either unique or public-facing with no available replacement
- Full service-layer abstraction (adapter/repository pattern) — deliberately excluded per design choice
- Test coverage for existing services — only new methods get tests
