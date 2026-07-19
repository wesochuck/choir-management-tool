# First-Run Experience and Modular Product Design

## Summary

Create a resumable first-run experience for a fresh PocketHost deployment. The experience turns
an initialized PocketBase database into a usable ensemble-management installation, creates the
first application administrator, configures the organization, enables only the product modules the
organization intends to use, verifies selected integrations, and optionally imports launch data.

The design also introduces a permanent setup checklist and an application-wide module model. A
disabled module is intentionally unused, not incomplete: it is hidden from navigation, unavailable
at direct routes, and rejected by its backend endpoints without deleting existing data.

## Goals

- Give a PocketHost owner a guided path from a fresh deployment to a usable application.
- Keep PocketBase superuser identity separate from the application's administrator identity while
  allowing the owner to use one email/password pair.
- Save progress after every section and resume safely after interruption.
- Let choirs, bands, and other ensembles start from useful terminology and roster presets.
- Let every product area except System Settings be enabled or disabled as a module.
- Configure selected modules in one guided session without making optional integrations a launch
  blocker.
- Keep unfinished work discoverable after launch through a permanent readiness checklist.
- Preserve the behavior and visibility of every existing installation during migration.

## Non-Goals

- Provisioning PocketHost or creating the initial PocketBase superuser.
- Writing environment variables into PocketHost from the application.
- Deleting data when a module is disabled.
- Replacing the normal feature configuration screens. The wizard may reuse their forms and
  services, but those screens remain the long-term editing surfaces.
- Making existing installations repeat first-run setup.
- Supporting a different person as the first application administrator in the initial release.

## Canonical Terms

- **PocketBase superuser:** The infrastructure identity created through PocketHost. It may claim a
  fresh installation or recover a missing application administrator, but it is not an application
  user.
- **Application administrator:** A record in `users` with `role: "admin"` and a linked `profiles`
  record. The first application administrator is the PocketHost owner in this release.
- **First-Run Setup:** The initialization workflow that blocks normal application use until the
  owner completes its required sections.
- **Module:** A product capability that can be enabled or disabled without deleting its data.
- **Readiness Item:** A measurable setup task that is complete, incomplete, or not applicable
  because its module is disabled.
- **System Settings:** The always-available organization-wide configuration surface.

## Experience States

The backend is the source of truth for initialization state. The frontend must not infer a fresh
installation by counting `appSettings` records because migrations already seed secrets, templates,
and feature defaults.

The setup state distinguishes at least these cases:

1. **Unclaimed:** No completion marker and no application administrator exists. A PocketBase
   superuser may claim the installation.
2. **In progress:** The first application administrator exists, but required setup sections are not
   complete. Only setup and authentication/recovery operations are available.
3. **Initialized:** The completion marker exists. Normal routing follows authentication and module
   rules, even if readiness items remain incomplete.
4. **Administrator recovery required:** The completion marker exists, but no application
   administrator remains. Setup never reopens as a public claim flow; a PocketBase superuser must
   authenticate and create a replacement administrator.

The completion marker is monotonic during ordinary operation. Deleting administrators or clearing
individual settings must not silently return an initialized installation to first-run claim mode.

## Route Gating

While setup is unclaimed or in progress, every normal frontend route redirects to `/setup`. This
includes public landing, audition, RSVP, poll, player, ticketing, donation, history, and performer
routes. Setup owns the whole installation until the required sections are complete, preventing
half-branded or partially secured public experiences.

The setup-status endpoint is public but returns only the minimum routing state. It must not expose
emails, configuration values, record counts, environment-variable values, or other installation
details.

After initialization:

- An authenticated administrator who opens a disabled module is redirected to Settings → Modules
  with an explanation and an enable action.
- An authenticated performer who opens a disabled module returns to their dashboard without
  learning about unavailable administrative capabilities.
- A public route for a disabled module shows a branded “This feature isn't available” page with a
  link to the configured organization homepage. Backend endpoints use an appropriate unavailable
  or not-found response and must enforce the same module state.
- Hiding a dashboard tile is never considered sufficient module enforcement.

Disabled-module backend responses use HTTP 404 for both public and authenticated callers. The
application's PocketBase interceptor deliberately treats every 401/403 as a stale or invalid session
and clears authentication, so those status codes remain reserved for genuine authentication and
authorization failures.

## Account Bootstrap and Recovery

### Initial claim

The owner authenticates against `_superusers` using the credentials already created in PocketHost.
The setup flow then creates:

- a `users` record using the same email and password, with `role: "admin"`; and
- a linked `profiles` record containing the owner's name and administrator notification defaults.

The password is submitted directly to PocketBase for both authentication and application-user
creation. It is never persisted in setup progress, application settings, logs, or local storage.
After the application administrator is created, the frontend authenticates as that user and clears
the superuser session before continuing.

The owner is asked whether they are also a performing member:

- **No** is the default and creates an administrative-only profile with an empty `voicePart`.
- **Yes** records the intent during administrator identity, then requires selection of a configured
  part after roster structure is saved. The owner becomes eligible for performer workflows only
  after that non-empty `voicePart` is persisted.

### Interruption

Creating the application administrator is an early step. Each later section is persisted when the
owner continues. If the browser closes, the owner returns to `/setup`, signs in through the normal
application `users` collection with the same credentials, and resumes at the first incomplete
required section. Secrets that have not been submitted must be entered again.

### Administrator recovery

If an initialized installation has no remaining application administrator, `/setup` presents a
recovery flow. PocketBase superuser authentication is required before a replacement `users` admin
and linked profile can be created. Recovery preserves organization settings, enabled modules,
readiness state, and all feature data.

## Wizard Information Architecture

The wizard is adaptive rather than a fixed sequence of every possible screen:

1. PocketHost owner sign-in
2. Administrator identity
3. Organization basics and branding
4. Roster terminology and structure
5. Module selection
6. Configuration for selected modules
7. PocketHost integrations and verification
8. Initial data
9. Readiness review and launch

After the application administrator exists, desktop layouts show a progress sidebar and mobile
layouts show a compact step menu. Owners may revisit any unlocked section. Dependencies may keep a
section locked until its prerequisite is saved, but the wizard is not otherwise strictly linear.

Every section has explicit states: not started, in progress, complete, or skipped/not applicable.
Continue saves the current section before navigation. A failed save leaves the owner on the section,
preserves entered non-secret values in memory, and displays the raw PocketBase validation details
through the application's existing error formatter.

## Organization Presets

The owner chooses Choir, Band, or Other. The choice initializes terminology and roster structure;
it does not change the recommended module selection.

### Choir

- Performer label: `Singer`
- Section Buckets: Sopranos, Altos, Tenors, Basses
- Voice Parts: S1, S2, A1, A2, T1, T2, B1, B2

### Band

- Performer label: `Musician`
- Section Buckets: Woodwinds, Brass, Percussion, Rhythm
- Parts: a practical starter list of common instruments grouped into those buckets

The exact starter instrument list is editable before save. It is a convenience template, not a
fixed taxonomy and not a claim that every band uses the same instrumentation.

### Other

- Performer label: `Performer`
- A simple General section and editable starter part

Every preset opens directly into the existing section/part editor model. The owner may add, remove,
rename, reorder, and recolor buckets and parts before saving. At least one non-track-only part is
required when Roster is enabled so future performing members can satisfy the domain eligibility
rule.

## Module Model

System Settings and administrator account management are always available. Every other product
area is a module, including:

- Roster
- Events & Venues
- Attendance
- RSVPs
- Music Library
- Set Lists
- Resources
- Reports
- Public Website
- Member Directory
- Auditions
- Communications
- Engagement Polls
- Seating Charts
- Ticket Sales
- Donations
- Patrons

The initial recommended selection is identical for Choir, Band, and Other:

- Roster
- Events & Venues
- Music Library
- Set Lists

The owner sees every module and explicitly reviews the recommendation. All other modules begin off
unless selected.

### Dependencies

Module dependencies are declared centrally and consumed by setup, Settings → Modules, route guards,
dashboard navigation, readiness evaluation, and backend enforcement. The initial dependency graph
includes at least:

- Set Lists → Music Library and Events & Venues
- Attendance → Events & Venues and Roster
- RSVPs → Events & Venues and Roster
- Seating Charts → Events & Venues and Roster
- Member Directory → Roster
- Auditions → Roster
- Resources → Roster
- Communications → Roster; Patrons adds an additional audience when enabled
- Engagement Polls → Communications
- Ticket Sales → Events & Venues and payment configuration
- Donations → payment configuration
- Patrons → at least one of Ticket Sales or Donations
- Reports → Roster and Events & Venues

Selecting a module automatically selects required modules and explains the change. Disabling a
dependency opens a danger-styled confirmation that lists every dependent module that will also be
disabled. Confirmation changes module state only; records and files are preserved.

Payment configuration is a capability dependency rather than a standalone dashboard module. A
commercial module may be selected before payment verification succeeds, but it remains not ready
and its public transaction endpoints remain unavailable until verification passes.

### Existing installations

A new forward migration initializes every module as enabled for any database that already contains
an application administrator. It also marks first-run setup complete. This preserves all currently
visible functionality after upgrade. Existing configuration is evaluated to populate readiness
items, but no existing administrator is forced through the wizard.

## Comprehensive Configuration

The wizard offers configuration for every selected module so an owner can finish setup in one
session. It reuses the same schemas, defaults, validation, and persistence services as the normal
feature configuration screens. Setup must not create a second, divergent settings model.

The boundary from the domain glossary remains intact:

- Organization metadata, app URL, timezone, branding, infrastructure, modules, and authentication
  belong to System Configuration.
- Module-specific behavior, templates, and presets remain Feature Configuration owned by that
  feature. The wizard embeds or composes those feature forms rather than relocating their eventual
  editing surface into global settings.

Only administrator identity, organization name, organization type, timezone, a valid roster
structure when Roster is enabled, module selection, and explicit launch confirmation block initial
completion. Credential-dependent and optional feature sections may be skipped.

## PocketHost Handoff and Integration Verification

The application cannot and must not write PocketHost environment variables. For required or
selected integrations, setup provides:

- the exact environment-variable names;
- concise instructions for locating PocketHost environment settings;
- generated values where the owner needs to invent a secret;
- copy buttons;
- restart guidance; and
- a Check Configuration action.

Strong random values for secrets such as `HMAC_SECRET` and `MAINTENANCE_SECRET` are generated with
Web Crypto in the browser. They are displayed for the current step only and never written to
PocketBase, logs, analytics, or browser storage. If the owner loses an unsubmitted value, setup
generates a new one.

Owner-supplied integration values, such as Stripe keys, are never echoed back after submission.
A safe authenticated health endpoint reports only whether expected environment variables are
present and whether supported verification calls succeed. It never returns secret values or
distinguishing fragments.

Integration readiness requires functional verification:

- **Email:** Send a test message to the owner's email and confirm successful provider/queue
  handling. Saving SMTP or Brevo fields alone is insufficient.
- **Stripe:** Validate the server secret key, report test versus live mode, and confirm that the
  webhook secret exists. Transaction modules remain unavailable until the selected mode is ready.
- **Server secrets:** Confirm required environment variables are present after restart.
- **Application URL:** Confirm the configured public URL matches the installation origin or require
  the owner to acknowledge a deliberate mismatch.

Verification failure does not prevent launching the core application. It leaves the associated
readiness item incomplete and prevents only the dependent public operation.

## Initial Data

Near the end, setup offers optional launch tasks for enabled modules:

- import a roster CSV or add the first performer;
- import a music-library CSV or add the first piece;
- add the first venue; and
- add the first event.

Imports reuse the existing import workflows and network-safety helpers. Setup adds downloadable
templates, a preview, row-level validation, and an explicit commit action. Imports are never
requirements for launch. When skipped, their readiness items remain visible only if the owning
module is enabled.

## Readiness Checklist

Readiness is permanent product infrastructure, not a one-time final screen.

Each item has:

- a stable identifier;
- an owning module or System Settings;
- a deterministic completion evaluator;
- a destination for remediation;
- an optional verification action; and
- one of three effective states: complete, incomplete, or not applicable.

Disabled modules make their readiness items not applicable. Re-enabling a module reevaluates and
restores its incomplete tasks automatically. Checklist state must be derived from persisted
configuration and verification evidence rather than manually checked boxes.

After launch:

- The admin dashboard always shows a “Finish setting up your organization” card while applicable
  items remain incomplete.
- The card may be collapsed but not permanently dismissed while incomplete.
- Settings contains a permanent Setup Checklist entry, including after every item is complete.
- Every item links directly to the relevant configuration or verification surface.

The readiness review at the end of first-run setup separates:

- required items blocking launch;
- selected-module tasks that remain incomplete;
- verified integrations;
- deliberately disabled modules; and
- optional initial-data tasks.

The launch action records the completion marker and routes the owner to the admin dashboard.

## Security and Failure Handling

- Initial claim and administrator recovery require current PocketBase superuser authentication.
- Setup creation endpoints must reject requests after claim unless they are valid resume or recovery
  operations for the authenticated identity.
- Backend writes must be idempotent or detect existing records so retries cannot create duplicate
  first administrators or profiles.
- The server must serialize or otherwise safely reject simultaneous claim attempts.
- PocketBase errors propagate raw; the frontend formats them without replacing the original error.
- Passwords, provider secrets, generated server secrets, and signed tokens are never logged.
- Module checks run server-side on public and privileged custom endpoints.
- Disabling a module never changes signed-token formats or invalidates existing records. Requests to
  disabled endpoints fail before token-driven actions occur.
- Setup-status and health endpoints expose booleans and coarse states only.
- 401 and 403 responses continue through the existing stale-token interceptor behavior.

## Architecture Boundaries

Implementation should separate these responsibilities:

1. **Setup status service:** Returns coarse initialization/recovery state and performs guarded claim,
   resume, completion, and recovery operations.
2. **Setup progress model:** Stores completed section identifiers and versioned progress metadata,
   never credentials or secrets.
3. **Module registry:** Defines module identifiers, labels, dependencies, routes, public endpoints,
   and readiness-item ownership in one typed source of truth.
4. **Module settings service:** Reads and writes enabled module state and provides frontend guards.
5. **Backend module guard:** Applies equivalent enforcement to PocketBase hook routes.
6. **Readiness registry:** Evaluates deterministic completion from settings, environment-health
   booleans, verification evidence, and initial data.
7. **Wizard shell:** Owns progress navigation and composes focused step components.
8. **Existing feature forms/services:** Remain authoritative for feature-specific validation and
   persistence.

The wizard must not become one monolithic route component. Each step should have a focused data
contract and save operation, and shared registries must be testable independently of React.

## Testing Strategy

### Setup state and security

- Fresh migrated database reports unclaimed.
- Migrated existing database reports initialized with all modules enabled.
- Every normal route redirects before initialization.
- Superuser claim creates exactly one application admin and one linked profile.
- Retried or concurrent claims cannot create duplicates.
- Resume works after interruption at every persisted step.
- Deleting the final administrator enters recovery-required state without reopening public claim.
- Recovery preserves configuration and feature data.
- Setup and health endpoints never disclose secret values.

### Module behavior

- Recommended modules are selected for all three organization types.
- Dependencies auto-select and cascading disable requires confirmation.
- Disabling preserves records.
- Dashboard and navigation omit disabled modules.
- Admin, performer, and public direct-route behavior matches the design.
- Backend endpoints reject disabled-module operations.
- Re-enabling a module restores its routes and reevaluates readiness.

### Presets and account domain rules

- Choir, Band, and Other presets persist valid Section Buckets and parts.
- Band presets use Woodwinds, Brass, Percussion, and Rhythm.
- Administrative-only owner profiles have empty `voicePart`.
- Performing-owner profiles require a valid non-track-only part.
- UI renders stored `Idle` status as “On Break” throughout any embedded roster workflow.

### Readiness and integrations

- Readiness derives from actual settings and verification evidence.
- Disabled-module tasks become not applicable and return when enabled.
- The dashboard card remains while applicable tasks are incomplete.
- Generated secrets use Web Crypto and are not persisted.
- Email, Stripe, server-secret, and app-URL checks distinguish saved from verified.
- Failed checks remain actionable without blocking core launch.

### Initial data and regression

- CSV preview and validation occur before writes.
- Imports use bounded network operations.
- Skipping imports does not block launch.
- Existing installations retain every module and never enter first-run routing.
- Existing signed links and stored data remain compatible.

## Rollout and Verification

Implementation requires a new forward migration; historical migrations remain untouched. PocketBase
hook changes are made only under `pocketbase/pb_hooks_src/`, followed by regeneration of
`pocketbase/pb_hooks/main.pb.js`.

Before release:

- run focused unit and route tests for setup, module state, readiness, and migration compatibility;
- run PocketBase hook generation and integrity checks;
- run lint and the relevant application test suite;
- run a browser smoke test against a genuinely fresh temporary database;
- run an upgrade smoke test against a populated pre-feature database;
- verify mobile and desktop wizard navigation; and
- confirm no unsafe TypeScript escape hatches or secret logging were introduced.

## Delivery Decomposition

This design is too broad for a single implementation change. The implementation plan should stage
work so each phase is independently verifiable:

1. Setup-state backend, migration compatibility, and route seal
2. Account claim, resume, and administrator recovery
3. Module registry, persistence, dependencies, navigation, and backend guards
4. Core organization/roster wizard steps and presets
5. Permanent readiness registry and dashboard/Settings surfaces
6. Selected-module configuration composition
7. PocketHost handoff, secret generation, and integration health checks
8. Initial-data launch tasks and full fresh/upgrade smoke coverage

Later phases may depend on earlier infrastructure, but each should preserve a deployable application
and include its own migration, hook, and regression verification where applicable.
