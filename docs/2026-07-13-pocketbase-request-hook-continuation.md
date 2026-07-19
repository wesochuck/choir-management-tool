# PocketBase Request Hook Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Prevent PocketBase module-guard request hooks from silently terminating successful reads and writes, which can make existing records appear deleted.

**Architecture:** Add a generic generated-hook integrity test that examines every module-guarded PocketBase record request callback and requires an explicit continuation. Introduce a request-specific generator helper that always appends `return e.next();` to the allowed path, regenerate the bundled hook file, and document the invariant in `AGENTS.md`.

**Tech Stack:** TypeScript, PocketBase JavaScript hooks, node:test/Vitest compatibility layer

---

## Task 1: Add a failing generic regression test

**Files:**

- Modify: `test/pb-hooks/integrity.test.ts`

1. Add a helper that finds all generated registrations for a given PocketBase record request hook.
2. For each supported request hook name, select registrations containing the module guard.
3. Assert that at least one guarded registration was found so the test cannot pass vacuously.
4. Assert that every guarded callback contains `return e.next();`.
5. Run `rtk npx vitest run test/pb-hooks/integrity.test.ts`.
6. Confirm the new test fails because the generated guarded callbacks do not continue the request.

## Task 2: Make request-hook continuation structural

**Files:**

- Modify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Modify: `AGENTS.md`
- Regenerate: `pocketbase/pb_hooks/main.pb.js`

1. Add a request-specific renderer that delegates to the existing record-hook renderer and appends `return e.next();` after the supplied guard body.
2. Use the request-specific renderer for all generated module-guard request hooks: create, update, delete, view, and list.
3. Add an `AGENTS.md` rule requiring every PocketBase request hook to explicitly continue its allowed path with `return e.next()` and explaining that fallthrough can produce status `0` and false empty-state behavior.
4. Run `rtk npm run generate:pb-hooks` to regenerate `pocketbase/pb_hooks/main.pb.js`; do not edit the generated file manually.
5. Run `rtk npx vitest run test/pb-hooks/integrity.test.ts` and confirm the regression test passes.

## Task 3: Verify the complete change

**Files:**

- Verify: `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Verify: `test/pb-hooks/integrity.test.ts`
- Verify: `pocketbase/pb_hooks/main.pb.js`
- Verify: `AGENTS.md`

1. Run `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 pocketbase/pb_hooks_src/generate-main-pb-js.ts test/pb-hooks/integrity.test.ts`.
2. If lint changes a source file, regenerate hooks and rerun the focused integrity test.
3. Run `rtk npm run check:pb-hooks`.
4. Inspect the diff and confirm only the intended source, test, documentation, plan, and regenerated bundle changed; preserve unrelated user changes.
5. Report checks, generated-file handling, unsafe TypeScript avoidance, migration status, and deployment risk.
