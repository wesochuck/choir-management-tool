# Tailwind Class Scanner Design

**Date:** 2026-06-17
**Status:** Draft

## Problem Summary

The codebase has custom `@theme` tokens and utility classes defined in `src/index.css` (Tailwind v4). There is currently no enforcement mechanism to:

1. Prevent invalid/typo'd Tailwind class names from being used
2. Detect custom `@theme` tokens that no code references

Additionally, coding agents (and humans) need visible, actionable feedback when violations occur — not just warnings that scroll past.

## Scope

Three independent changes:

1. **ESLint rule bump** — `tailwindcss/no-custom-classname` from `warn` to `error`
2. **Pre-commit hooks** — `husky` + `lint-staged` enforcing ESLint + Prettier on staged files
3. **Unused token scanner** — `scripts/scan-unused-tokens.ts` for on-demand/CI detection of unused `@theme` tokens

## Design Decisions

### 1. ESLint: Bump Severity

Current state: `tailwindcss/no-custom-classname: 'warn'` with a whitelist of 9 custom class names.

Change: `'warn'` → `'error'`. Verified safe via full lint run — zero existing violations. No cleanup required.

The rule already:
- Cross-references class names against the Tailwind v4 config (`cssConfigPath: './src/index.css'`)
- Handles custom `@theme` tokens correctly (e.g., `bg-primary`, `text-display`)
- Allows arbitrary value syntax (`text-[2rem]`) without false positives
- Accepts a whitelist for non-Tailwind CSS classes used legitimately (print styles, Shoelace parts, etc.)

Also add `tailwindcss/no-contradicting-classname: 'error'` to catch mutually exclusive classes (e.g., `flex` + `grid` on the same element).

### 2. Pre-commit: `husky` + `lint-staged`

**Why this tooling:** `husky` is the standard git hooks manager for JS projects. `lint-staged` runs linters only on staged files (fast pre-commit). Both are already industry convention.

**Hook behavior:**
- On `git commit`, `lint-staged` runs:
  - `eslint --max-warnings 0` on staged `.ts`/`.tsx`/`.js`/`.jsx` files
  - `prettier --write` on all staged files
- If ESLint finds errors, the commit is aborted with a clear message
- If Prettier rewrites files, the changes are re-staged and committed

**npm script:** `"prepare": "husky"` ensures hooks auto-install on `npm install`.

### 3. Unused Theme Token Scanner

A standalone script `scripts/scan-unused-tokens.ts` that:

**Parsing:**
- Reads `src/index.css`
- Extracts every `--<type>-<name>` from the `@theme { }` block:
  - `--color-*` (14 branding + 10 section colors)
  - `--text-*` (5 typography tokens)
  - `--animate-*` (9 animation tokens)
  - `--default-font-family` (ignored — not a utility-producing token)
- Also detects `@utility print-landscape` (custom utility class)

**Token-to-class mapping per Tailwind v4 conventions:**

| Theme prefix | Utility classes generated |
|---|---|
| `--color-<name>` | `bg-<name>`, `text-<name>`, `border-<name>`, `outline-<name>`, `ring-<name>`, `from-<name>`, `to-<name>`, `via-<name>`, `divide-<name>`, `accent-<name>`, `caret-<name>`, `fill-<name>`, `stroke-<name>`, `decoration-<name>` |
| `--text-<name>` | `text-<name>` |
| `--animate-<name>` | `animate-<name>` |
| `@utility <name>` | `<name>` |

**Scanning:**
- Searches all `.ts`, `.tsx`, `.css` files (excluding `node_modules`, `dist`, `pocketbase`)
- For each token, checks for:
  - **Direct class usage** — the className string or any part of it matches a generated utility class (e.g., `"bg-primary"`, `` `text-display ${x}` ``, `['ring-primary'].join(' ')`)
  - **CSS variable reference** — `var(--color-primary)` or bare `--color-primary` in CSS
- Reports with **usage locations** (file:line) for used tokens, to enable quick validation of scanner accuracy

**Context mode (`--context` flag):**
- For each token with zero matches, searches the codebase for the token's stem (e.g., `muted` for `--color-muted`)
- Surfaces partial/dynamic references an agent can inspect: `` `bg-${color}` ``, `` border-${variable} ``, etc.
- Prevents false "unused" reporting when tokens are accessed dynamically

**Output formats:**
- Default: CLI table with columns (Token, Possible classes, Match count, Usage locations)
- `--json`: JSON array of token objects for CI/automation

**npm script:** `"scan:theme": "tsx scripts/scan-unused-tokens.ts"`. Not in pre-commit (whole-codebase analysis). Runs on-demand and optionally in CI.

### Why Not a Combined Tool

ESLint handles per-file, pre-commit class validation — it's AST-aware and fast on staged files. The token scanner does cross-file analysis of the entire codebase. Combining them would mean either running the slow scanner on every commit or limiting the scanner to the staged files (wrong — a single file can't prove a token is unused globally). The hybrid approach lets each tool do what it's best at.

## Files Changed

### Modified
- `eslint.config.js` — bump `no-custom-classname` to `error`, add `no-contradicting-classname`
- `package.json` — add `husky`, `lint-staged` dependencies; add `prepare`, `scan:theme` scripts; add `lint-staged` config section
- `.husky/pre-commit` — created by husky init

### Created
- `scripts/scan-unused-tokens.ts` — token scanner
- `.husky/pre-commit` — git hook file

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| False positives from token scanner (dynamic class construction) | `--context` flag surfaces stem matches for manual review; usage-location output enables validation |
| husky hooks bypassed (e.g., `--no-verify`) | CI still catches violations via `npm run lint`; token scanner runs in CI as a warning step |
| Tailwind v4 @theme parsing breaks on version upgrade | Scanner reads CSS text directly — no dependency on Tailwind internals. Only the token-to-class mapping would need updates |
| Pre-commit slows git workflow | `lint-staged` runs only on staged files — typically sub-second for ESLint on a handful of files |
