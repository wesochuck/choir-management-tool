# First-Run Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a resumable PocketHost first-run wizard, permanent module system, readiness checklist, integration verification, and optional launch-data workflow while preserving existing installations.

**Architecture:** PocketBase hook endpoints own coarse setup state, privileged claim/recovery, environment health, and backend module enforcement. Typed frontend registries own modules, dependencies, wizard sections, and readiness evaluators; focused React steps reuse existing settings and import services. A single forward migration backfills existing installations as initialized with all modules enabled, while fresh databases remain unclaimed.

**Tech Stack:** React 19, TypeScript, React Router, TanStack Query, PocketBase 0.36.9 hooks and migrations, PocketBase JS SDK ^0.27.0, Tailwind, Shoelace wrappers, Node test/Vitest compatibility layer.

**Approved design:** `docs/superpowers/specs/2026-07-11-first-run-experience-design.md`

---

## Delivery Rules

- Execute tasks in order. Later tasks depend on contracts created earlier.
- Use test-driven development: add one focused failing test, observe the expected failure, add the minimal implementation, and rerun it.
- Prefix every command with `rtk`.
- Never edit `pocketbase/pb_hooks/main.pb.js`; regenerate it from `pocketbase/pb_hooks_src/`.
- Never edit a historical migration. Use only the new forward migration introduced in Task 1.
- Do not use `any`, `as any`, `// @ts-ignore`, or `// eslint-disable`.
- Preserve raw PocketBase errors.
- Verify every PocketBase server API against the bundled 0.36.9 declarations or an existing hook
  before using it; do not infer APIs from the JS SDK.
- Never put email on `profiles`; create/update the related `users` record and use
  `getProfileEmail(profile)` on the frontend.
- Treat a profile as a performer only when `voicePart` is non-empty. Keep administrative-only
  profiles out of roster, RSVP, attendance, seating, and performer communication flows.
- Render stored `Idle` status as “On Break”; never change the enum or CSV value.
- Use shared query keys, depend on whole mutation objects, return invalidation promises, and avoid
  syncing refetched query data over editable local state.
- Use Tailwind and existing UI wrappers. Every modal has a visible Cancel/Close action; destructive
  dependency changes use a danger-styled `useDialog()` confirmation.
- Use `DataTable` for any tabular readiness or import-preview surface.
- Use `chunkArray`, `mapWithConcurrency`, and `retryOn429` for non-trivial network batches.
- Commit after every task.

## File and Responsibility Map

### Backend

- `pocketbase/pb_migrations/1783814400_add_setup_and_modules.js` — forward migration and existing-install backfill.
- `pocketbase/pb_hooks_src/setup/setupTypes.ts` — shared backend setup/module types and constants.
- `pocketbase/pb_hooks_src/setup/setupState.ts` — coarse setup-state resolution and persisted progress.
- `pocketbase/pb_hooks_src/setup/setupAuth.ts` — superuser/admin authorization helpers.
- `pocketbase/pb_hooks_src/setup/setupEndpoints.ts` — status, claim, progress, completion, recovery, and health handlers.
- `pocketbase/pb_hooks_src/setup/moduleGuard.ts` — backend module-state checks for custom endpoints.
- `pocketbase/pb_hooks_src/generate-main-pb-js.ts` — setup bundle and route registrations.

### Frontend domain and services

- `src/lib/modules.ts` — typed module registry, dependency resolution, and route ownership.
- `src/services/moduleService.ts` — persisted module-state API.
- `src/services/setupService.ts` — setup endpoint client and contracts.
- `src/lib/readiness.ts` — deterministic readiness registry and evaluation.
- `src/lib/setupPresets.ts` — Choir, Band, and Other roster presets.
- `src/lib/queryKeys.ts` — setup, module, and readiness query keys.
- `src/contexts/SetupContext.tsx` — one setup/module query boundary for routing and navigation.

### Frontend UI

- `src/components/setup/SetupGate.tsx` — global pre-route setup seal.
- `src/views/setup/SetupView.tsx` — wizard shell and adaptive navigation.
- `src/views/setup/steps/OwnerSignInStep.tsx`, `AdminIdentityStep.tsx`,
  `AdminRecoveryStep.tsx`, `OrganizationStep.tsx`, `RosterStructureStep.tsx`, `ModulesStep.tsx`,
  `FeatureConfigurationStep.tsx`, `PocketHostStep.tsx`, `IntegrationVerificationStep.tsx`,
  `InitialDataStep.tsx`, and `ReviewStep.tsx` — focused setup steps.
- `src/components/setup/ModulePicker.tsx` — module dependencies and cascading-disable confirmation.
- `src/components/setup/ReadinessChecklist.tsx` — reusable permanent checklist.
- `src/components/setup/SetupDashboardCard.tsx` — persistent dashboard reminder.
- `src/components/common/ModuleRoute.tsx` — authenticated and public disabled-module behavior.
- `src/views/FeatureUnavailableView.tsx` — branded disabled-public-module page.
- `src/views/admin/ModulesSettingsView.tsx` — permanent module control center.
- `src/views/admin/SetupChecklistView.tsx` — permanent readiness destination.
- `src/App.tsx` — setup, recovery, module, and settings routes.
- `src/views/admin/AdminDashboardView.tsx` — filtered module navigation and checklist card.

### Tests

- `test/migrations.test.ts` — forward migration and backfill invariants.
- `test/pb-hooks/setupState.test.ts` — setup state machine.
- `test/pb-hooks/setupEndpoints.test.ts` — claim, recovery, health, and secrecy.
- `test/pb-hooks/moduleGuard.test.ts` — backend feature enforcement.
- `test/modules.test.ts` — dependency graph and cascading selection.
- `test/readiness.test.ts` — readiness evaluation.
- `test/setupPresets.test.ts` — organization presets.
- `test/setupService.test.ts` — endpoint client behavior.
- `test/components/setup/SetupGate.test.tsx`, `SetupView.test.tsx`,
  `OrganizationSteps.test.tsx`, `ModulePicker.test.tsx`, `ReadinessChecklist.test.tsx`,
  `FeatureConfigurationStep.test.tsx`, `PocketHostStep.test.tsx`, and
  `InitialDataStep.test.tsx` — wizard, gate, picker, checklist, and dashboard behavior.
- `test/App.setup.test.tsx` — route sealing and module routing.

---

### Task 1: Add the Forward Migration and Persisted State Contracts

**Files:**
- Create: `pocketbase/pb_migrations/1783814400_add_setup_and_modules.js`
- Modify: `test/migrations.test.ts`

- [ ] **Step 1: Add a failing migration contract test**

Add a test that reads the new migration and asserts it creates `setup_state` and `module_state` app-setting records, checks for an existing `users.role = 'admin'` record, enables every module for an existing install, and never edits a collection schema.

```ts
function readMigration(filename: string): string {
  return fs.readFileSync(
    path.resolve(
      import.meta.dirname || __dirname || '.',
      `../pocketbase/pb_migrations/${filename}`
    ),
    'utf8'
  );
}

test('first-run migration backfills existing installs without changing schemas', () => {
  const migration = readMigration('1783814400_add_setup_and_modules.js');
  assert.match(migration, /key:\s*['"]setup_state['"]/);
  assert.match(migration, /key:\s*['"]module_state['"]/);
  assert.match(migration, /role = ['"]admin['"]/);
  assert.match(migration, /initialized:\s*true/);
  assert.doesNotMatch(migration, /save\(collection\)|new Collection/);
});
```

- [ ] **Step 2: Run the focused test and verify the missing-file failure**

Run: `rtk npx vitest run test/migrations.test.ts`

Expected: FAIL because `1783814400_add_setup_and_modules.js` does not exist.

- [ ] **Step 3: Create the migration**

Use `appSettings` records rather than a schema change. Persist versioned JSON values:

```js
migrate((app) => {
  const settings = app.findCollectionByNameOrId('appSettings');
  let hasAdmin = false;
  try {
    hasAdmin = !!app.findFirstRecordByFilter('users', "role = 'admin'");
  } catch {
    hasAdmin = false;
  }

  const setup = new Record(settings, {
    key: 'setup_state',
    value: {
      version: 1,
      initialized: hasAdmin,
      completedSections: hasAdmin ? ['legacy-install'] : [],
    },
    isPublic: false,
  });
  app.save(setup);

  const modules = new Record(settings, {
    key: 'module_state',
    value: {
      version: 1,
      enabled: hasAdmin
        ? [
            'roster',
            'events',
            'attendance',
            'rsvps',
            'musicLibrary',
            'setLists',
            'resources',
            'reports',
            'publicWebsite',
            'directory',
            'auditions',
            'communications',
            'polls',
            'seating',
            'ticketSales',
            'donations',
            'patrons',
          ]
        : [],
    },
    isPublic: false,
  });
  app.save(modules);
}, (app) => {
  for (const key of ['setup_state', 'module_state']) {
    try {
      app.delete(
        app.findFirstRecordByFilter('appSettings', 'key = {:key}', { key })
      );
    } catch {
      // rollback is idempotent
    }
  }
});
```

Task 4 adds a test that keeps this literal list synchronized with the typed frontend registry.

- [ ] **Step 4: Run migration tests**

Run: `rtk npx vitest run test/migrations.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add pocketbase/pb_migrations/1783814400_add_setup_and_modules.js test/migrations.test.ts
rtk git commit -m "feat: add first-run state migration"
```

### Task 2: Implement the Backend Setup State Machine

**Files:**
- Create: `pocketbase/pb_hooks_src/setup/setupTypes.ts`
- Create: `pocketbase/pb_hooks_src/setup/setupState.ts`
- Test: `test/pb-hooks/setupState.test.ts`

- [ ] **Step 1: Write failing state-resolution tests**

Cover unclaimed, in-progress, initialized, and recovery-required states with a small fake app. Use the project test imports:

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveSetupStatus } from '../../pocketbase/pb_hooks_src/setup/setupState.ts';

it('requires recovery instead of reopening claim after the last admin is deleted', () => {
  const app = fakeSetupApp({ initialized: true, adminCount: 0 });
  assert.deepStrictEqual(resolveSetupStatus(app), {
    state: 'recovery_required',
    initialized: true,
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `rtk npx vitest run test/pb-hooks/setupState.test.ts`

Expected: FAIL because `setupState.ts` is missing.

- [ ] **Step 3: Define backend contracts and state resolution**

```ts
export type SetupStatusName = 'unclaimed' | 'in_progress' | 'initialized' | 'recovery_required';

export interface PersistedSetupState {
  version: 1;
  initialized: boolean;
  completedSections: string[];
}

export interface PublicSetupStatus {
  state: SetupStatusName;
  initialized: boolean;
}
```

`resolveSetupStatus(app)` must decode Goja JSON byte arrays defensively, count application admins,
and return only the two public fields above. Add focused helpers to load and save progress without
catching or wrapping PocketBase save errors.

- [ ] **Step 4: Run state tests**

Run: `rtk npx vitest run test/pb-hooks/setupState.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add pocketbase/pb_hooks_src/setup/setupTypes.ts pocketbase/pb_hooks_src/setup/setupState.ts test/pb-hooks/setupState.test.ts
rtk git commit -m "feat: add setup state machine"
```

### Task 3: Add Guarded Setup, Recovery, and Health Endpoints

**Files:**
- Create: `pocketbase/pb_hooks_src/setup/setupAuth.ts`
- Create: `pocketbase/pb_hooks_src/setup/setupEndpoints.ts`
- Modify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Modify: `test/pb-hooks/integrity.test.ts`
- Test: `test/pb-hooks/setupEndpoints.test.ts`

- [ ] **Step 1: Write failing endpoint handler tests**

Test these handlers directly:

- `handleSetupStatus` returns only `state` and `initialized`.
- `handleSetupClaim` rejects non-superusers, creates one admin plus linked profile, and is idempotent.
- `handleSetupProgress` requires the first application admin and persists section IDs only.
- `handleSetupComplete` rejects missing required sections.
- `handleAdminRecovery` works only when initialized and adminless.
- `handleSetupHealth` returns booleans/mode only and never environment values.

```ts
assert.deepStrictEqual(result.body.environment, {
  appUrl: true,
  hmacSecret: true,
  maintenanceSecret: false,
  stripeSecretKey: false,
  stripeWebhookSecret: false,
});
assert.ok(!JSON.stringify(result.body).includes('super-secret-value'));
```

- [ ] **Step 2: Run handler tests and verify failure**

Run: `rtk npx vitest run test/pb-hooks/setupEndpoints.test.ts`

Expected: FAIL because the endpoint handlers are missing.

- [ ] **Step 3: Implement authorization and handlers**

Before implementation, inspect `pocketbase/pb_data/types.d.ts` and an existing generated hook to
confirm the PocketBase 0.36.9 auth-record collection-name API. Add a handler test for the confirmed
shape. Also verify `src/lib/pocketbase.ts` still contains the `afterSend` stale-token interceptor;
restore and test it before continuing if it is missing. Use the verified server API for superuser
checks and `e.auth?.get('role') === 'admin'` for
application administrators. Claim must validate a normalized email, password/password confirmation,
owner name, and performing-member intent. Create the email only on the `users` record. Create the
linked profile without an `email` property and with `receiveAttendanceReports: true`; if the owner
is administrative-only, persist an empty `voicePart`. Keep user/profile creation inside a rollback
boundary; if profile creation fails, delete the newly created user and rethrow the raw error.

Register:

```text
GET  /api/setup/status
POST /api/setup/claim
POST /api/setup/progress
POST /api/setup/complete
POST /api/setup/recover-admin
GET  /api/setup/health
```

Health is administrator-only after claim. It reads `APP_URL`, `HMAC_SECRET`, `MAINTENANCE_SECRET`,
`STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`, returning presence booleans plus Stripe test/live
mode derived from the key prefix.

- [ ] **Step 4: Add the setup utility bundle and route registrations**

Add `setup` to `UtilityBundleName`, list the three setup files, export their handler symbols, and
register each route once in `generate()`. Update the exact route count and required route list in
`integrity.test.ts`.

- [ ] **Step 5: Regenerate hooks and run backend checks**

Run: `rtk npm run generate:pb-hooks`

Run: `rtk npm run check:pb-hooks`

Run: `rtk npx vitest run test/pb-hooks/setupEndpoints.test.ts`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add pocketbase/pb_hooks_src/setup pocketbase/pb_hooks_src/generate-main-pb-js.ts pocketbase/pb_hooks/main.pb.js test/pb-hooks/setupEndpoints.test.ts test/pb-hooks/integrity.test.ts
rtk git commit -m "feat: add secure setup endpoints"
```

### Task 4: Build the Typed Module Registry and Dependency Engine

**Files:**
- Create: `src/lib/modules.ts`
- Test: `test/modules.test.ts`

- [ ] **Step 1: Write failing registry tests**

Assert the full stable ID list, the four recommended modules, transitive auto-selection, any-of
dependencies for Patrons, and reverse cascading disable.

```ts
assert.deepStrictEqual(
  enableModule(new Set(['setLists']), 'setLists'),
  new Set(['setLists', 'musicLibrary', 'events'])
);
assert.deepStrictEqual(getDisableCascade(new Set(['roster', 'attendance']), 'roster'), [
  'attendance',
  'roster',
]);
```

- [ ] **Step 2: Run the test and verify failure**

Run: `rtk npx vitest run test/modules.test.ts`

Expected: FAIL because `src/lib/modules.ts` is missing.

- [ ] **Step 3: Implement the registry**

Define `MODULE_IDS` as a const tuple and derive `ModuleId`. Each definition includes label,
description, dashboard routes, public routes, `requiresAll`, and `requiresAny`. Export pure
`enableModule`, `getDisableCascade`, `isModuleRoute`, and `getModuleForRoute` functions. Use the exact
dependency graph in the approved design.

```ts
export const RECOMMENDED_MODULES: readonly ModuleId[] = [
  'roster',
  'events',
  'musicLibrary',
  'setLists',
] as const;
```

- [ ] **Step 4: Run module tests**

Run: `rtk npx vitest run test/modules.test.ts`

Expected: PASS.

- [ ] **Step 5: Synchronize the migration ID list and rerun migration tests**

Confirm the migration's existing-install list exactly matches `MODULE_IDS` and update the migration
test to compare both lists as sets.

Run: `rtk npx vitest run test/modules.test.ts test/migrations.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/modules.ts test/modules.test.ts pocketbase/pb_migrations/1783814400_add_setup_and_modules.js test/migrations.test.ts
rtk git commit -m "feat: define application modules"
```

### Task 5: Add Frontend Setup and Module Services

**Files:**
- Create: `src/services/setupService.ts`
- Create: `src/services/moduleService.ts`
- Modify: `src/lib/queryKeys.ts`
- Test: `test/setupService.test.ts`
- Modify: `test/queryKeys.test.ts`

- [ ] **Step 1: Write failing service and query-key tests**

Mock `pb.send` and assert exact paths, methods, and typed payload shapes. Verify query keys are
centralized:

```ts
assert.deepStrictEqual(queryKeys.setup.status, ['setup', 'status']);
assert.deepStrictEqual(queryKeys.modules.state, ['modules', 'state']);
assert.deepStrictEqual(queryKeys.readiness.all, ['readiness']);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/setupService.test.ts test/queryKeys.test.ts`

Expected: FAIL because services and keys are missing.

- [ ] **Step 3: Implement endpoint clients**

`setupService` exposes `getStatus`, `claim`, `saveProgress`, `complete`, `recoverAdmin`, and
`getHealth`. `moduleService` reads/writes the private `module_state` setting for authenticated admins
using `getSetting`/`upsertSetting`; it returns the recommended four when a fresh in-progress install
has no saved selection. Do not catch and replace PocketBase errors.

- [ ] **Step 4: Run focused tests**

Run: `rtk npx vitest run test/setupService.test.ts test/queryKeys.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/services/setupService.ts src/services/moduleService.ts src/lib/queryKeys.ts test/setupService.test.ts test/queryKeys.test.ts
rtk git commit -m "feat: add setup and module clients"
```

### Task 6: Seal Routing with SetupContext and SetupGate

**Files:**
- Create: `src/contexts/SetupContext.tsx`
- Create: `src/components/setup/SetupGate.tsx`
- Create: `src/views/setup/SetupView.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Test: `test/components/setup/SetupGate.test.tsx`
- Test: `test/App.setup.test.tsx`

- [ ] **Step 1: Write failing route-seal tests**

Use JSDOM, a `QueryClientProvider` with retries disabled, and explicit `cleanup()`. Test that every
representative route (`/`, `/login`, `/tickets`, `/donate`, `/dashboard`) renders a redirect to
`/setup` for unclaimed/in-progress status, while `/setup` remains available.

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/components/setup/SetupGate.test.tsx test/App.setup.test.tsx`

Expected: FAIL because setup routing does not exist.

- [ ] **Step 3: Implement one setup query boundary**

`SetupContext` owns the status and module queries and exposes loading, status, enabled module set,
and invalidation helpers. `SetupGate` renders the existing app loader while pending, routes
unclaimed/in-progress/recovery-required installations to `/setup`, and allows the normal route tree
only for initialized status.

- [ ] **Step 4: Wire providers and the setup route**

Wrap the existing provider tree with `SetupProvider`. Add a lazy-loaded `SetupView` using
`lazyWithReload(...)`. For this task, `SetupView` renders the resolved setup state and a stable
heading; Task 7 replaces that minimal body with the account wizard. Place `SetupGate` around the
route tree without bypassing `ErrorBoundary`.

- [ ] **Step 5: Run route tests**

Run: `rtk npx vitest run test/components/setup/SetupGate.test.tsx test/App.setup.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/contexts/SetupContext.tsx src/components/setup/SetupGate.tsx src/main.tsx src/App.tsx src/views/setup/SetupView.tsx test/components/setup/SetupGate.test.tsx test/App.setup.test.tsx
rtk git commit -m "feat: seal routes until setup completes"
```

### Task 7: Implement Claim, Resume, and Recovery UI

**Files:**
- Modify: `src/views/setup/SetupView.tsx`
- Create: `src/views/setup/steps/OwnerSignInStep.tsx`
- Create: `src/views/setup/steps/AdminIdentityStep.tsx`
- Create: `src/views/setup/steps/AdminRecoveryStep.tsx`
- Create: `src/components/setup/SetupNavigation.tsx`
- Test: `test/components/setup/SetupView.test.tsx`

- [ ] **Step 1: Write failing wizard-state tests**

Test unclaimed superuser sign-in, admin creation with the same credentials, auth-store transition to
`users`, resume after reload, performing-member intent, and recovery-required rendering. Assert
password fields are absent from progress payloads.

- [ ] **Step 2: Run the test and verify failure**

Run: `rtk npx vitest run test/components/setup/SetupView.test.tsx`

Expected: FAIL because setup steps are missing.

- [ ] **Step 3: Implement the wizard shell and account steps**

Use UI wrappers from `src/components/ui/`, `safeSlProps` indirectly through those wrappers, and
`useDialog()` for errors. The shell derives available steps from persisted progress. On successful
claim, authenticate against `users` with the same email/password, clear the superuser auth record,
discard password component state, invalidate setup status, and continue.

- [ ] **Step 4: Implement recovery**

Recovery authenticates `_superusers`, calls `/api/setup/recover-admin`, signs in as the new app
admin, and routes to the dashboard without modifying setup/module settings.

- [ ] **Step 5: Run wizard tests and lint affected files**

Run: `rtk npx vitest run test/components/setup/SetupView.test.tsx`

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/views/setup src/components/setup/SetupNavigation.tsx`

Expected: PASS with zero lint warnings.

- [ ] **Step 6: Commit**

```bash
rtk git add src/views/setup src/components/setup/SetupNavigation.tsx test/components/setup/SetupView.test.tsx
rtk git commit -m "feat: add resumable setup account flow"
```

### Task 8: Add Organization and Roster Presets

**Files:**
- Create: `src/lib/setupPresets.ts`
- Create: `src/views/setup/steps/OrganizationStep.tsx`
- Create: `src/views/setup/steps/RosterStructureStep.tsx`
- Modify: `src/views/setup/SetupView.tsx`
- Test: `test/setupPresets.test.ts`
- Test: `test/components/setup/OrganizationSteps.test.tsx`

- [ ] **Step 1: Write failing preset tests**

Assert Choir produces Singer/SATB/S1-B2, Band produces Musician plus Woodwinds/Brass/Percussion/
Rhythm with non-empty instrument parts, and Other produces Performer plus a valid General part.

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/setupPresets.test.ts`

Expected: FAIL because `setupPresets.ts` is missing.

- [ ] **Step 3: Implement immutable preset factories**

Return new arrays on every call so editor mutations cannot alter constants. Use existing
`SectionDef`/`VoicePartDef` types. Include common concert-band instruments without introducing band
subtypes.

- [ ] **Step 4: Compose organization and roster editors**

Save organization name, timezone, performer label, logo, and organization type through existing
settings services. Reuse `SectionBucketEditor` and `VoicePartEditor`; validate through
`validateRosterConfig`. If the owner chose to perform, require and persist their selected part only
after this step saves.

- [ ] **Step 5: Run focused tests**

Run: `rtk npx vitest run test/setupPresets.test.ts test/components/setup/OrganizationSteps.test.tsx test/rosterConfigForm.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/setupPresets.ts src/views/setup/steps/OrganizationStep.tsx src/views/setup/steps/RosterStructureStep.tsx src/views/setup/SetupView.tsx test/setupPresets.test.ts test/components/setup/OrganizationSteps.test.tsx
rtk git commit -m "feat: add ensemble setup presets"
```

### Task 9: Add Module Selection, Settings, Route Guards, and Backend Guards

**Files:**
- Create: `src/components/setup/ModulePicker.tsx`
- Create: `src/views/setup/steps/ModulesStep.tsx`
- Create: `src/views/admin/ModulesSettingsView.tsx`
- Create: `src/components/common/ModuleRoute.tsx`
- Create: `src/views/FeatureUnavailableView.tsx`
- Create: `pocketbase/pb_hooks_src/setup/moduleGuard.ts`
- Modify: `src/App.tsx`
- Modify: `src/views/admin/AdminDashboardView.tsx`
- Modify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Test: `test/components/setup/ModulePicker.test.tsx`
- Test: `test/pb-hooks/moduleGuard.test.ts`
- Modify: `test/App.setup.test.tsx`

- [ ] **Step 1: Write failing dependency UI and guard tests**

Test recommended defaults, automatic dependencies, danger confirmation for cascade disable, no
record deletion calls, admin redirect to Modules Settings, performer redirect to dashboard, branded
public unavailable page, and backend rejection before endpoint work.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `rtk npx vitest run test/components/setup/ModulePicker.test.tsx test/App.setup.test.tsx test/pb-hooks/moduleGuard.test.ts`

Expected: FAIL because module UI and guards are missing.

- [ ] **Step 3: Implement module selection and settings**

The picker consumes only pure registry functions. Persist the resulting complete enabled set with
`moduleService`. The permanent settings view uses the same component and danger-styled
`dialog.confirm` flow.

- [ ] **Step 4: Apply frontend module ownership**

Filter dashboard tiles from the registry. Wrap module routes with `ModuleRoute`; do not duplicate
ad-hoc flag checks in individual views. Add `/admin/settings/modules` and the public unavailable
view.

- [ ] **Step 5: Apply backend guards**

Add `requireModule(app, moduleId)` to the setup bundle. Insert it at the beginning of public and
admin custom endpoints owned by ticketing, donations, auditions, polls, RSVP, player, seating, and
communications. The guard reads the persisted state defensively and returns 404 for every disabled
module operation. Do not use 401/403 for module state: the global stale-token interceptor clears auth
on those statuses. Reserve 401/403 for genuine authentication/authorization failures. Existing
installations remain enabled by the migration.

- [ ] **Step 6: Regenerate hooks and run checks**

Run: `rtk npm run check:pb-hooks`

Run: `rtk npx vitest run test/components/setup/ModulePicker.test.tsx test/App.setup.test.tsx test/pb-hooks/moduleGuard.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add src/components/setup/ModulePicker.tsx src/views/setup/steps/ModulesStep.tsx src/views/admin/ModulesSettingsView.tsx src/components/common/ModuleRoute.tsx src/views/FeatureUnavailableView.tsx src/App.tsx src/views/admin/AdminDashboardView.tsx pocketbase/pb_hooks_src/setup/moduleGuard.ts pocketbase/pb_hooks_src/generate-main-pb-js.ts pocketbase/pb_hooks/main.pb.js test/components/setup/ModulePicker.test.tsx test/App.setup.test.tsx test/pb-hooks/moduleGuard.test.ts
rtk git commit -m "feat: enforce configurable modules"
```

### Task 10: Build the Permanent Readiness Registry and UI

**Files:**
- Create: `src/lib/readiness.ts`
- Create: `src/components/setup/ReadinessChecklist.tsx`
- Create: `src/components/setup/SetupDashboardCard.tsx`
- Create: `src/views/admin/SetupChecklistView.tsx`
- Create: `src/views/setup/steps/ReviewStep.tsx`
- Modify: `src/App.tsx`
- Modify: `src/views/admin/AdminDashboardView.tsx`
- Test: `test/readiness.test.ts`
- Test: `test/components/setup/ReadinessChecklist.test.tsx`

- [ ] **Step 1: Write failing readiness tests**

Define fixtures for complete, incomplete, and not-applicable states. Verify disabled-module tasks are
not applicable, re-enabling restores them, unverified credentials remain incomplete, dashboard card
cannot be permanently dismissed, and required items block `setupService.complete`.

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/readiness.test.ts test/components/setup/ReadinessChecklist.test.tsx`

Expected: FAIL because the readiness registry is missing.

- [ ] **Step 3: Implement deterministic readiness evaluation**

Each definition contains `id`, `label`, `moduleId`, `destination`, `requiredForLaunch`, and a pure
`evaluate(snapshot)` function. Build a typed `ReadinessSnapshot` from settings, health results,
verification evidence, and record-presence booleans. Never persist manual completion checkboxes.

- [ ] **Step 4: Implement shared checklist surfaces**

Use the same checklist component for the wizard review, `/admin/settings/setup-checklist`, and the
dashboard card. Collapse state may be local user preference, but incomplete items remain reachable
and the Settings entry is permanent.

- [ ] **Step 5: Run readiness tests**

Run: `rtk npx vitest run test/readiness.test.ts test/components/setup/ReadinessChecklist.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/readiness.ts src/components/setup/ReadinessChecklist.tsx src/components/setup/SetupDashboardCard.tsx src/views/admin/SetupChecklistView.tsx src/views/setup/steps/ReviewStep.tsx src/App.tsx src/views/admin/AdminDashboardView.tsx test/readiness.test.ts test/components/setup/ReadinessChecklist.test.tsx
rtk git commit -m "feat: add permanent setup readiness"
```

### Task 11: Compose Selected Feature Configuration Steps

**Files:**
- Create: `src/views/setup/steps/FeatureConfigurationStep.tsx`
- Create: `src/views/setup/setupSections.ts`
- Create: `src/views/setup/featureSteps/RosterFeatureSetup.tsx`
- Create: `src/views/setup/featureSteps/EventsFeatureSetup.tsx`
- Create: `src/views/setup/featureSteps/MusicFeatureSetup.tsx`
- Create: `src/views/setup/featureSteps/EngagementFeatureSetup.tsx`
- Create: `src/views/setup/featureSteps/CommercialFeatureSetup.tsx`
- Create: `src/views/setup/featureSteps/PublicFeatureSetup.tsx`
- Modify: `src/components/admin/RosterSettingsTab.tsx`
- Modify: `src/views/admin/SettingsView.tsx`
- Test: `test/components/setup/FeatureConfigurationStep.test.tsx`

- [ ] **Step 1: Write failing adaptive-section tests**

For several module sets, assert only selected configuration sections appear and prerequisites lock
correctly. Verify saves call the same service functions as the normal settings surfaces.

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/components/setup/FeatureConfigurationStep.test.tsx`

Expected: FAIL because adaptive feature sections are missing.

- [ ] **Step 3: Define the section registry**

Each section definition includes stable ID, owning module, prerequisite IDs, component, and save
contract. Extract focused forms from existing large views only when needed; keep their normal tabs
as consumers of the same form. Do not copy settings schemas or validation into setup.

- [ ] **Step 4: Compose sections for every enabled module**

Cover roster automation, event defaults, music catalog, set-list behavior, resources, reports,
public website, directory, auditions, communications, polls, seating, tickets, donations, and
patrons. Credential-dependent sections expose “Set up later,” which records progress but leaves the
readiness evaluator incomplete.

- [ ] **Step 5: Run feature and existing settings tests**

Run: `rtk npx vitest run test/components/setup/FeatureConfigurationStep.test.tsx test/services/settingsService.test.ts test/settingsDirtyCheck.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/views/setup/steps/FeatureConfigurationStep.tsx src/views/setup/setupSections.ts src/views/setup/featureSteps/RosterFeatureSetup.tsx src/views/setup/featureSteps/EventsFeatureSetup.tsx src/views/setup/featureSteps/MusicFeatureSetup.tsx src/views/setup/featureSteps/EngagementFeatureSetup.tsx src/views/setup/featureSteps/CommercialFeatureSetup.tsx src/views/setup/featureSteps/PublicFeatureSetup.tsx src/components/admin/RosterSettingsTab.tsx src/views/admin/SettingsView.tsx test/components/setup/FeatureConfigurationStep.test.tsx
rtk git commit -m "feat: compose module setup sections"
```

### Task 12: Add PocketHost Secret Generation and Functional Verification

**Files:**
- Create: `src/lib/setupSecrets.ts`
- Create: `src/views/setup/steps/PocketHostStep.tsx`
- Create: `src/views/setup/steps/IntegrationVerificationStep.tsx`
- Modify: `src/services/settings/emailProviderSettings.ts`
- Modify: `pocketbase/pb_hooks_src/setup/setupEndpoints.ts`
- Modify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Test: `test/setupSecrets.test.ts`
- Test: `test/components/setup/PocketHostStep.test.tsx`
- Modify: `test/services/settingsService.test.ts`
- Modify: `test/pb-hooks/setupEndpoints.test.ts`

- [ ] **Step 1: Write failing secret and verification tests**

Mock `crypto.getRandomValues` and assert generated secrets have at least 32 bytes of entropy, are
shown once, and are absent from progress/storage calls. Test health output secrecy, app-URL mismatch,
Stripe test/live detection, and failed email test readiness.

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/setupSecrets.test.ts test/components/setup/PocketHostStep.test.tsx test/pb-hooks/setupEndpoints.test.ts`

Expected: FAIL because secret generation and functional checks are incomplete.

- [ ] **Step 3: Implement browser-only secret generation**

Use Web Crypto exclusively. Return base64url strings without writing them to storage. The UI provides
copy buttons, PocketHost variable names, restart instructions, and regeneration after loss.

- [ ] **Step 4: Implement functional verification**

Reuse the existing SMTP test route for email and extend authenticated setup health to validate
Stripe server credentials without returning them. Persist only verification evidence such as
provider, mode, checked timestamp, and success boolean in private `appSettings`; never persist a
generated environment secret. Update email-provider persistence so SMTP passwords and Brevo API
keys are stored only in non-public settings; no public getter or setup-status response may return
them.

- [ ] **Step 5: Regenerate hooks and run checks**

Run: `rtk npm run check:pb-hooks`

Run: `rtk npx vitest run test/setupSecrets.test.ts test/components/setup/PocketHostStep.test.tsx test/pb-hooks/setupEndpoints.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/setupSecrets.ts src/views/setup/steps/PocketHostStep.tsx src/views/setup/steps/IntegrationVerificationStep.tsx src/services/settings/emailProviderSettings.ts pocketbase/pb_hooks_src/setup/setupEndpoints.ts pocketbase/pb_hooks_src/generate-main-pb-js.ts pocketbase/pb_hooks/main.pb.js test/setupSecrets.test.ts test/components/setup/PocketHostStep.test.tsx test/services/settingsService.test.ts test/pb-hooks/setupEndpoints.test.ts
rtk git commit -m "feat: verify PocketHost integrations"
```

### Task 13: Add Optional Launch-Data Tasks

**Files:**
- Create: `src/views/setup/steps/InitialDataStep.tsx`
- Create: `src/components/admin/imports/RosterImportFlow.tsx`
- Create: `src/components/admin/imports/MusicImportFlow.tsx`
- Modify: `src/components/admin/RosterImportModal.tsx`
- Modify: `src/components/admin/MusicImportModal.tsx`
- Test: `test/components/setup/InitialDataStep.test.tsx`

- [ ] **Step 1: Write failing initial-data tests**

Test module-dependent task visibility, downloadable templates, preview-before-commit, row validation,
bounded import calls, first-record shortcuts, and non-blocking skip behavior.

- [ ] **Step 2: Run tests and verify failure**

Run: `rtk npx vitest run test/components/setup/InitialDataStep.test.tsx`

Expected: FAIL because the initial-data step is missing.

- [ ] **Step 3: Compose existing import workflows**

Extract shared form bodies/hooks rather than duplicating CSV parsing. Ensure network writes use
`chunkArray`, `mapWithConcurrency`, and `retryOn429` from `src/lib/networkSafety.ts`. Add `+ Add First
Performer`, `+ Add First Piece`, `+ Add First Venue`, and `+ Add First Event` actions for enabled
modules.

- [ ] **Step 4: Run import and setup tests**

Run: `rtk npx vitest run test/components/setup/InitialDataStep.test.tsx test/profileService.test.ts test/eventService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/views/setup/steps/InitialDataStep.tsx src/components/admin/imports/RosterImportFlow.tsx src/components/admin/imports/MusicImportFlow.tsx src/components/admin/RosterImportModal.tsx src/components/admin/MusicImportModal.tsx test/components/setup/InitialDataStep.test.tsx
rtk git commit -m "feat: add setup launch data tasks"
```

### Task 14: Complete End-to-End Fresh and Upgrade Verification

**Files:**
- Create: `test/setupFreshInstall.test.ts`
- Create: `test/setupUpgradeCompatibility.test.ts`
- Modify: `docs/pockethost-deploy-runbook.md`
- Modify: `docs/setup-wizard-plan.md` (replace the obsolete plan with a link/status note)

- [ ] **Step 1: Add fresh-install smoke coverage**

Create a temporary PocketBase data directory, apply migrations, assert unclaimed status, claim with a
superuser, complete the required organization/module sections, launch, and verify normal routes open.
Assert public routes remain sealed before completion.

- [ ] **Step 2: Add upgrade compatibility coverage**

Seed an admin and representative feature records before applying the new migration. Assert setup is
initialized, every module is enabled, records remain, and signed-token payload construction remains
unchanged.

- [ ] **Step 3: Run both smoke tests**

Run: `rtk npx vitest run test/setupFreshInstall.test.ts test/setupUpgradeCompatibility.test.ts`

Expected: PASS.

- [ ] **Step 4: Update operator documentation**

Document PocketHost prerequisites, superuser creation, required environment variables, restart and
verification flow, admin recovery, and the fact that existing installations are not re-onboarded.
Mark `docs/setup-wizard-plan.md` superseded by the approved design and implementation plan rather
than leaving contradictory instructions about browser-created superusers.

- [ ] **Step 5: Run full required verification**

```bash
rtk npm run check:pb-hooks
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
rtk npm test
rtk npm run build
rtk npm audit --audit-level=high
```

Expected: every command exits 0. The build's nested audit and the explicit audit report no high
severity vulnerabilities.

- [ ] **Step 6: Perform browser smoke checks**

Against a fresh temporary database, verify desktop and mobile setup navigation, interruption/resume,
module dependencies, disabled public feature rendering, PocketHost copy/verification UX, dashboard
readiness card, and last-admin recovery. Capture any browser-only defects as failing regression tests
before fixing them.

- [ ] **Step 7: Confirm repository safety rules**

Run:

```bash
rtk rg -n "as any|@ts-ignore|eslint-disable" src pocketbase/pb_hooks_src test
rtk git diff --check
rtk git status --short
```

Expected: no newly introduced unsafe TypeScript patterns, no whitespace errors, and only intended
task changes before the final commit.

- [ ] **Step 8: Commit**

```bash
rtk git add test/setupFreshInstall.test.ts test/setupUpgradeCompatibility.test.ts docs/pockethost-deploy-runbook.md docs/setup-wizard-plan.md
rtk git commit -m "test: verify first-run setup rollout"
```

---

## Final Review Checkpoint

Before merging, review the implementation against every section of
`docs/superpowers/specs/2026-07-11-first-run-experience-design.md` and record:

- what changed;
- every `rtk` verification command and result;
- any command that could not run and why;
- confirmation that generated hooks were regenerated from source;
- confirmation that unsafe TypeScript patterns were avoided;
- confirmation that the schema change is a new forward migration only; and
- remaining operational or security risks.

Use the `requesting-code-review` skill after Task 14, then the `finishing-a-development-branch` skill
once all review findings are resolved and verification remains green.
