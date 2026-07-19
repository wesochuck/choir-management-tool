# PocketBase Router Middleware Callback Scope Design

## Problem

PocketBase 0.36.9 executes registered JavaScript callbacks in pooled Goja runtimes. A callback cannot safely rely on file-level helper declarations being visible when the callback later runs.

The generated backend module guard was registered with a raw `routerUse(...)` template that referenced `isBackendModuleEnabled` from the generated file prelude. The bundle passed static generation checks, but every guarded route failed at runtime with `ReferenceError: isBackendModuleEnabled is not defined`.

## Decision

Callback isolation is a generator invariant. Every generated callback registration must be rendered through a callback renderer that injects the exact utility closure required by that callback.

For router middleware, add a dedicated renderer that:

1. Accepts the middleware callback body.
2. Applies `withUtilities(...)` to inline `isBackendModuleEnabled` inside the callback.
3. Emits the complete `routerUse(...)` registration.

Raw generated callback templates are forbidden for `routerAdd`, `routerUse`, cron, and record-hook registrations.

## Regression Protection

### Static integrity check

The integrity test must assert that the module helper declaration occurs inside the generated `routerUse` callback, before its first use. It must not accept a file-level declaration as sufficient.

### PocketBase runtime smoke check

A Node harness will start the generated hooks under the pinned PocketBase 0.36.9 binary and request a guarded public route. The expected response is the route's own validation error (`Missing token`), which proves the middleware executed without a scope failure and allowed the request to reach the handler.

The harness will:

- use a temporary database directory;
- wait for PocketBase health before probing;
- capture process output for failures;
- terminate PocketBase and remove temporary state in all cases;
- never print secrets or signed tokens.

### Manual runtime diagnostic

The runtime smoke check remains an explicit diagnostic for generator changes and PocketHost-only scope failures. It is not part of the deployment workflow and does not block routine deployments.

## Compatibility

The change does not alter signed-token formats, endpoint contracts, schema, or frontend behavior. It only changes where the existing module-guard helper is emitted in the generated hook bundle.
