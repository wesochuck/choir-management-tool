# PocketBase Request Hook Continuation Safety Design

## Problem

The first-run module guards generated PocketBase request hooks for guarded collections. On the
allowed path, those callbacks returned without calling `e.next()`. PocketBase therefore stopped
before its normal record handler, logged request status `0`, and returned no records even though
the database still contained them. This affected superusers as well as application users because
request hooks run before ordinary collection rule handling.

## Scope

This change will correct generated module-guard hooks for record creation, update, deletion, view,
and list requests. It will also add a generic generated-output invariant and a repository rule so
future request hooks cannot silently omit continuation. It will not change module selection,
collection rules, migrations, stored records, or hosted data.

## Generation Design

The generator will use a request-hook-specific rendering path for module guards. Each generated
callback will:

1. Check whether the collection's owning module is enabled.
2. Throw `NotFoundError` when the module is disabled.
3. Execute `return e.next();` when access is allowed.

The existing generic record-hook renderer will remain unchanged because after-success hooks and
other notification-style hooks do not share request middleware continuation semantics.

## Regression Test

The PocketBase integrity suite will parse the generated module-guard request hook registrations.
For every guarded collection and every supported request hook type, it will assert that the
callback contains both the module guard and `return e.next();`. The test will derive expectations
from the generated registrations rather than listing only `events` and `venues`, ensuring the
invariant covers future guarded collections and all request operations.

The test must be observed failing against the current generated output before the generator is
changed. After implementation, the generated hook bundle and focused integrity test must pass.

## Agent Guidance

`AGENTS.md` will state that every PocketBase request hook must explicitly continue its allowed
path with `return e.next();`. Falling through is not a successful no-op: it terminates the request,
usually produces status `0`, and can make existing data appear absent. Generated request hooks
must have a generic integrity test that checks this invariant.

## Verification

Verification will include:

- The focused integrity test, first failing and then passing.
- `rtk npm run generate:pb-hooks`.
- `rtk npm run check:pb-hooks`.
- Relevant linting for modified TypeScript and test files.
- A review of the generated callbacks for `events` and `venues`.

No migration is required because this is request middleware behavior, not a schema change.
