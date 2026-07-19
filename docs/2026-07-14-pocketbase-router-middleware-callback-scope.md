# PocketBase Router Middleware Callback Scope Implementation Plan

## File Responsibility Map

### Create

- `docs/superpowers/specs/2026-07-14-pocketbase-router-middleware-callback-scope-design.md` — approved design and runtime contract.
- `docs/superpowers/plans/2026-07-14-pocketbase-router-middleware-callback-scope.md` — implementation and validation checklist.
- `scripts/check-pb-hooks-runtime.mjs` — isolated PocketBase 0.36.9 runtime probe.

### Modify

- `pocketbase/pb_hooks_src/generate-main-pb-js.ts` — render `routerUse` through a utility-aware callback renderer and remove the unsafe global utility prelude.
- `test/pb-hooks/integrity.test.ts` — require callback-local module-guard helpers.
- `pocketbase/pb_hooks/main.pb.js` — regenerate from hook sources; never edit directly.
- `package.json` — expose the runtime smoke command.
- `AGENTS.md` — forbid raw generated callback registration templates.
- `pocketbase/pb_hooks_src/README.md` — document callback-local rendering for middleware.
- `docs/pockethost-deploy-runbook.md` — include the runtime smoke check in deployment safeguards.

## Tasks

1. Change the integrity assertion so the current global-helper output fails.
2. Add a runtime harness that reproduces the current PocketBase 0.36.9 `ReferenceError` and assert the route reaches its own validation response.
3. Add a utility-aware router middleware renderer and generate the module guard through it.
4. Regenerate the hook bundle from source.
5. Add the runtime smoke script to `package.json` as an explicit local diagnostic.
6. Document the structural generator rule and deployment check.
7. Run the focused integrity test, runtime smoke test, hook generator checks, and relevant repository checks.
8. Validate every file in this responsibility map before reporting completion.
