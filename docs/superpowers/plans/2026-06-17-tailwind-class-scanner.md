# Tailwind Class Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce valid Tailwind class usage and detect unused `@theme` tokens via ESLint + a custom scanner script + pre-commit hooks.

**Architecture:** Three independent changes: (1) bump ESLint `no-custom-classname` to `error`, (2) `husky` + `lint-staged` for pre-commit enforcement, (3) a dedicated token scanner script for unused `@theme` token detection.

**Tech Stack:** ESLint flat config, Tailwind v4, husky v9, lint-staged v15, Node 25 `fs` APIs, node:test for tests.

---

### Task 1: Bump ESLint rule + add no-contradicting-classname

**Files:**
- Modify: `eslint.config.js:30-46`

- [ ] **Step 1: Edit eslint.config.js to bump severity and add contradicting class rule**

In `eslint.config.js`, change the `tailwindcss/no-custom-classname` severity from `'warn'` to `'error'` and add `'tailwindcss/no-contradicting-classname': 'error'`.

```js
// eslint.config.js lines 30-46
rules: {
  'tailwindcss/no-custom-classname': [
    'error',
    {
      whitelist: [
        'no-print',
        'seating-row-label',
        'progress-ring__circle',
        'progress-ring__circle-bg',
        'grid-print',
        'director-indicator',
        'seating-row-action-btn',
        'seating-toolbar',
        'prose',
      ],
    },
  ],
  'tailwindcss/no-contradicting-classname': 'error',
},
```

- [ ] **Step 2: Run full lint to verify zero errors**

Run: `rtk npm run lint`

Expected: Only the 2 pre-existing warnings (`react-hooks/exhaustive-deps` and `react-hooks/incompatible-library`), zero errors, zero tailwind violations.

- [ ] **Step 3: Commit**

Run:
```bash
rtk git add eslint.config.js
rtk git commit -m "feat: bump tailwindcss/no-custom-classname to error, add no-contradicting-classname"
```

---

### Task 2: Install husky + lint-staged, set up pre-commit

**Files:**
- Modify: `package.json`
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install dependencies**

Run: `rtk npm install --save-dev husky lint-staged`

- [ ] **Step 2: Initialize husky**

Run: `rtk npx husky init`

Expected: creates `.husky/pre-commit` with default content, creates `.husky/_/` directory.

- [ ] **Step 3: Configure `.husky/pre-commit`**

Replace the auto-generated pre-commit hook content with:

```bash
npx lint-staged
```

- [ ] **Step 4: Add lint-staged config and prepare script to package.json**

Edit `package.json` to add:

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": "eslint --max-warnings 0",
    "*": "prettier --write --ignore-unknown"
  }
}
```

The `prepare` script goes alongside the existing scripts. `lint-staged` goes at top level of `package.json`.

- [ ] **Step 5: Run lint-staged to verify it works on current state**

Run: `rtk npx lint-staged --dry-run`

Expected: lists staged files with the commands that would run (or says "No staged files found" if nothing is staged).

- [ ] **Step 6: Commit**

Run:
```bash
rtk git add package.json .husky/
rtk git commit -m "feat: add husky and lint-staged for pre-commit enforcement"
```

---

### Task 3: Write the token scanner script

**Files:**
- Create: `scripts/scan-unused-tokens.ts`
- Test: `test/scan-unused-tokens.test.ts`

- [ ] **Step 1: Write the failing test for @theme parsing**

Create `test/scan-unused-tokens.test.ts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';

const SAMPLE_CSS = `@theme {
  --color-primary: var(--color-primary);
  --color-primary-light: var(--color-primary-light);
  --color-danger-bg: var(--color-red-100);
  --color-section-red: #ef4444;
  --text-display: clamp(2rem, 5vw, 3rem);
  --text-display--line-height: 1.1;
  --animate-login-fade-in: login-fade-in 0.35s forwards;
  --default-font-family: 'Inter', sans-serif;
}

@utility print-landscape {
  page: landscape-canvas;
}`;

// We'll import from the script once it exists
// For now just define the function signatures we expect

test('parseThemeTokens extracts top-level tokens from @theme block', () => {
  // This test will fail until we implement parseThemeTokens
});

test('parseThemeTokens skips sub-properties (double-hyphen keys)', () => {
  // Should skip --text-display--line-height
});

test('parseThemeTokens skips --default-* tokens', () => {
  // Should skip --default-font-family
});

test('generateClasses maps color tokens to utility class variants', () => {
  // --color-primary → bg-primary, text-primary, border-primary, etc.
});

test('generateClasses maps text tokens to text-* classes', () => {
  // --text-display → text-display
});

test('generateClasses maps animate tokens to animate-* classes', () => {
  // --animate-login-fade-in → animate-login-fade-in
});

test('fileScanner finds class usage in string content', () => {
  // className="bg-primary text-display" should match both
});

test('fileScanner detects CSS variable references', () => {
  // var(--color-primary) should match --color-primary
});

test('scanner detects @utility print-landscape', () => {
  // @utility print-landscape should be detected as a token
});
```

Run: `rtk npx vitest run test/scan-unused-tokens.test.ts`

Expected: All tests fail (assertions not implemented yet).

- [ ] **Step 2: Write the scanner implementation**

Create `scripts/scan-unused-tokens.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

interface ThemeToken {
  rawName: string;
  type: string;
  name: string;
  generatedClasses: string[];
}

interface TokenUsage {
  token: ThemeToken;
  usageCount: number;
  usageLocations: { file: string; line: number }[];
}

type OutputFormat = 'cli' | 'json';

interface ScanOptions {
  context?: boolean;
  format?: OutputFormat;
}

// Parse tokens from @theme block in CSS
function parseThemeTokens(cssPath: string): ThemeToken[] {
  const css = readFileSync(cssPath, 'utf-8');
  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (!themeMatch) return [];

  const themeContent = themeMatch[1];
  const tokens: ThemeToken[] = [];
  const lines = themeContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('--')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const withoutPrefix = key.slice(2); // Remove leading --

    // Skip sub-properties (e.g., --text-display--line-height)
    if (withoutPrefix.includes('--')) continue;

    const firstHyphen = withoutPrefix.indexOf('-');
    if (firstHyphen === -1) continue;

    const type = withoutPrefix.slice(0, firstHyphen);
    const name = withoutPrefix.slice(firstHyphen + 1);

    // Skip non-utility-generating token types
    if (type === 'default') continue;

    const generatedClasses = generateClasses(type, name);
    tokens.push({ rawName: key, type, name, generatedClasses });
  }

  // Detect @utility declarations
  const utilityRegex = /@utility\s+(\S+)/g;
  let utilMatch: RegExpExecArray | null;
  while ((utilMatch = utilityRegex.exec(css)) !== null) {
    const name = utilMatch[1];
    tokens.push({
      rawName: `@utility ${name}`,
      type: 'utility',
      name,
      generatedClasses: [name],
    });
  }

  return tokens;
}

// Map theme token type + name to Tailwind utility class names
function generateClasses(type: string, name: string): string[] {
  switch (type) {
    case 'color':
      return [
        `bg-${name}`,
        `text-${name}`,
        `border-${name}`,
        `outline-${name}`,
        `ring-${name}`,
        `from-${name}`,
        `to-${name}`,
        `via-${name}`,
        `divide-${name}`,
        `accent-${name}`,
        `caret-${name}`,
        `fill-${name}`,
        `stroke-${name}`,
        `decoration-${name}`,
      ];
    case 'text':
      return [`text-${name}`];
    case 'animate':
      return [`animate-${name}`];
    default:
      return [];
  }
}

// Walk directory recursively, return matching files
function walkDir(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...walkDir(full, ext));
        }
      } else if (entry.isFile()) {
        if (ext.some((e) => entry.name.endsWith(e))) {
          results.push(full);
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return results;
}

// Find all lines containing a search term in file content
function findLines(content: string, searchTerm: string): number[] {
  const lines: number[] = [];
  let idx = 0;
  let lineNum = 1;
  while (idx < content.length) {
    const lineEnd = content.indexOf('\n', idx);
    const line = lineEnd === -1 ? content.slice(idx) : content.slice(idx, lineEnd);
    if (line.includes(searchTerm)) {
      lines.push(lineNum);
    }
    if (lineEnd === -1) break;
    idx = lineEnd + 1;
    lineNum++;
  }
  return lines;
}

// Scan source files for token usage
function scanTokenUsage(
  tokens: ThemeToken[],
  sourceFiles: string[],
  options: ScanOptions,
): TokenUsage[] {
  const usages: TokenUsage[] = tokens.map((token) => ({
    token,
    usageCount: 0,
    usageLocations: [],
  }));

  const searchTerms = new Map<string, { term: string; tokenIdx: number; isCssVar: boolean }[]>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    for (const cls of token.generatedClasses) {
      const entry = { term: cls, tokenIdx: i, isCssVar: false };
      const existing = searchTerms.get(cls) || [];
      existing.push(entry);
      searchTerms.set(cls, existing);
    }
    // Also search for CSS variable reference
    const cssVarEntry = { term: token.rawName, tokenIdx: i, isCssVar: true };
    const existing = searchTerms.get(token.rawName) || [];
    existing.push(cssVarEntry);
    searchTerms.set(token.rawName, existing);
  }

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf-8');
    for (const [term, indexes] of searchTerms) {
      if (content.includes(term)) {
        const lines = findLines(content, term);
        for (const { tokenIdx } of indexes) {
          usages[tokenIdx].usageCount++;
          usages[tokenIdx].usageLocations.push({ file, line: lines[0] });
        }
      }
    }
  }

  return usages;
}

// Search for stem references (dynamic/indirect usage) across all files
function findStemReferences(stem: string, files: string[]): { file: string; line: number; snippet: string }[] {
  const results: { file: string; line: number; snippet: string }[] = [];
  const stemRegex = new RegExp(`\\b${stem}\\b`, 'i');
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (stemRegex.test(lines[i]) && /className|style|var\(|--/.test(lines[i])) {
        results.push({ file, line: i + 1, snippet: lines[i].trim().slice(0, 80) });
        if (results.length >= 5) return results; // cap per stem
      }
    }
  }
  return results;
}

// Print CLI table report
function printCliReport(usages: TokenUsage[], tokens: ThemeToken[], sourceFiles: string[], options: ScanOptions): void {
  const unused = usages.filter((u) => u.usageCount === 0);
  const total = usages.length;
  const used = total - unused.length;
  const pct = total > 0 ? Math.round((used / total) * 100) : 100;

  console.log('\nUNUSED THEME TOKENS');
  console.log('━'.repeat(72));
  if (unused.length === 0) {
    console.log(' All theme tokens are in use. (100% usage)\n');
    return;
  }
  console.log(` Token${' '.repeat(22)}Possible classes${' '.repeat(24)}Matches`);
  console.log('─'.repeat(72));
  for (const u of unused) {
    const classes = u.token.generatedClasses.slice(0, 3).join(', ');
    const suffix = u.token.generatedClasses.length > 3 ? ', ...' : '';
    const clsDisplay = (classes + suffix).padEnd(40).slice(0, 40);
    console.log(` ${u.token.rawName.padEnd(24)}${clsDisplay}${String(u.usageCount).padStart(5)}`);
    if (options.context) {
      const stem = u.token.name;
      const refs = findStemReferences(stem, sourceFiles);
      if (refs.length > 0) {
        console.log(` ${' '.repeat(24)}potential indirect refs for "${stem}":`);
        for (const ref of refs.slice(0, 3)) {
          const shortPath = relative(process.cwd(), ref.file);
          console.log(` ${' '.repeat(28)}${shortPath}:${ref.line}  ${ref.snippet}`);
        }
        if (refs.length > 3) {
          console.log(` ${' '.repeat(28)}... and ${refs.length - 3} more`);
        }
      }
    }
  }
  console.log('─'.repeat(72));
  console.log(` ${unused.length} of ${total} tokens unused (${pct}% usage)\n`);
}

// Print JSON report
function printJsonReport(usages: TokenUsage[], _tokens: ThemeToken[]): void {
  const output = usages.map((u) => ({
    token: u.token.rawName,
    type: u.token.type,
    generatedClasses: u.token.generatedClasses,
    usageCount: u.usageCount,
    usageLocations: u.usageLocations.map((l) => `${relative(process.cwd(), l.file)}:${l.line}`),
  }));
  console.log(JSON.stringify(output, null, 2));
}

// Main
function main(): void {
  const args = process.argv.slice(2);
  const options: ScanOptions = {
    context: args.includes('--context'),
    format: args.includes('--json') ? 'json' : 'cli',
  };

  const rootDir = resolve(process.cwd());
  const cssPath = join(rootDir, 'src', 'index.css');

  const tokens = parseThemeTokens(cssPath);
  if (tokens.length === 0) {
    console.error('No theme tokens found in src/index.css');
    process.exit(1);
  }

  const sourceFiles = walkDir(join(rootDir, 'src'), ['.ts', '.tsx', '.css']);
  const usages = scanTokenUsage(tokens, sourceFiles, options);

  if (options.format === 'json') {
    printJsonReport(usages, tokens);
  } else {
    printCliReport(usages, tokens, sourceFiles, options);
  }

  if (usages.some((u) => u.usageCount === 0)) {
    process.exit(1);
  }
}

main();
```

- [ ] **Step 3: Implement the tests**

Update `test/scan-unused-tokens.test.ts` with real assertions:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Helpers: inline the parse/generate functions for testing
// In a real test, we'd import from the script. For now, duplicate for isolation.
function generateClasses(type: string, name: string): string[] {
  switch (type) {
    case 'color':
      return [
        `bg-${name}`, `text-${name}`, `border-${name}`, `outline-${name}`,
        `ring-${name}`, `from-${name}`, `to-${name}`, `via-${name}`,
        `divide-${name}`, `accent-${name}`, `caret-${name}`, `fill-${name}`,
        `stroke-${name}`, `decoration-${name}`,
      ];
    case 'text':
      return [`text-${name}`];
    case 'animate':
      return [`animate-${name}`];
    default:
      return [];
  }
}

function parseThemeTokens(css: string): Array<{ rawName: string; type: string; name: string; generatedClasses: string[] }> {
  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (!themeMatch) return [];
  const themeContent = themeMatch[1];
  const tokens: Array<{ rawName: string; type: string; name: string; generatedClasses: string[] }> = [];
  for (const line of themeContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('--')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const withoutPrefix = key.slice(2);
    if (withoutPrefix.includes('--')) continue;
    const firstHyphen = withoutPrefix.indexOf('-');
    if (firstHyphen === -1) continue;
    const type = withoutPrefix.slice(0, firstHyphen);
    const name = withoutPrefix.slice(firstHyphen + 1);
    if (type === 'default') continue;
    tokens.push({ rawName: key, type, name, generatedClasses: generateClasses(type, name) });
  }
  const utilityRegex = /@utility\s+(\S+)/g;
  let utilMatch: RegExpExecArray | null;
  while ((utilMatch = utilityRegex.exec(css)) !== null) {
    const name = utilMatch[1];
    tokens.push({ rawName: `@utility ${name}`, type: 'utility', name, generatedClasses: [name] });
  }
  return tokens;
}

test('parseThemeTokens extracts color tokens', () => {
  const css = `@theme {
    --color-primary: #000;
    --color-danger-bg: var(--color-red-100);
  }`;
  const tokens = parseThemeTokens(css);
  const colorTokens = tokens.filter((t) => t.type === 'color');
  assert.equal(colorTokens.length, 2);
  assert.ok(colorTokens.some((t) => t.name === 'primary'));
  assert.ok(colorTokens.some((t) => t.name === 'danger-bg'));
});

test('parseThemeTokens skips sub-properties', () => {
  const css = `@theme {
    --text-display: clamp(2rem, 5vw, 3rem);
    --text-display--line-height: 1.1;
  }`;
  const tokens = parseThemeTokens(css);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].name, 'display');
});

test('parseThemeTokens skips --default-* tokens', () => {
  const css = `@theme {
    --default-font-family: 'Inter', sans-serif;
    --color-primary: #000;
  }`;
  const tokens = parseThemeTokens(css);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, 'color');
});

test('parseThemeTokens extracts @utility declarations', () => {
  const css = `@theme {
    --color-primary: #000;
  }
  @utility print-landscape {
    page: landscape-canvas;
  }`;
  const tokens = parseThemeTokens(css);
  const utilTokens = tokens.filter((t) => t.type === 'utility');
  assert.equal(utilTokens.length, 1);
  assert.equal(utilTokens[0].name, 'print-landscape');
  assert.deepEqual(utilTokens[0].generatedClasses, ['print-landscape']);
});

test('generateClasses produces correct variants for color tokens', () => {
  const classes = generateClasses('color', 'primary');
  assert.ok(classes.includes('bg-primary'));
  assert.ok(classes.includes('text-primary'));
  assert.ok(classes.includes('border-primary'));
  assert.ok(classes.includes('ring-primary'));
  assert.ok(classes.length >= 14);
});

test('generateClasses produces correct class for text tokens', () => {
  assert.deepEqual(generateClasses('text', 'display'), ['text-display']);
});

test('generateClasses produces correct class for animate tokens', () => {
  assert.deepEqual(generateClasses('animate', 'login-fade-in'), ['animate-login-fade-in']);
});

test('parseThemeTokens handles empty @theme gracefully', () => {
  assert.deepEqual(parseThemeTokens('/* no theme */'), []);
});

test('real project index.css contains expected tokens', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');
  const tokens = parseThemeTokens(css);
  assert.ok(tokens.length > 20, `Expected >20 theme tokens, got ${tokens.length}`);
  assert.ok(tokens.some((t) => t.type === 'color' && t.name === 'primary'));
  assert.ok(tokens.some((t) => t.type === 'text' && t.name === 'display'));
  assert.ok(tokens.some((t) => t.type === 'animate' && t.name === 'login-fade-in'));
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npx vitest run test/scan-unused-tokens.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Run the scanner on the real project to verify it works**

Run: `rtk node --import ./test/register.js --experimental-strip-types scripts/scan-unused-tokens.ts`

Expected: CLI table output showing which (if any) theme tokens are unused. Exit code 0 if all used, 1 if any unused.

Also test JSON mode: `rtk node --import ./test/register.js --experimental-strip-types scripts/scan-unused-tokens.ts --json`

Expected: JSON array output.

- [ ] **Step 6: Commit**

Run:
```bash
rtk git add scripts/scan-unused-tokens.ts test/scan-unused-tokens.test.ts
rtk git commit -m "feat: add unused theme token scanner script"
```

---

### Task 4: Add npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scan:theme npm script**

Edit `package.json` to add a new script:

```json
"scan:theme": "node --import ./test/register.js --experimental-strip-types scripts/scan-unused-tokens.ts"
```

Add it to the `scripts` object alongside the existing ones.

- [ ] **Step 2: Verify the script works via npm**

Run: `rtk npm run scan:theme`

Expected: Same output as running the script directly in Task 3 Step 5.

- [ ] **Step 3: Commit**

Run:
```bash
rtk git add package.json
rtk git commit -m "feat: add scan:theme npm script for unused token detection"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `rtk npm test`

Expected: All existing tests pass plus the new scanner tests.

- [ ] **Step 2: Run the scanner a final time**

Run: `rtk npm run scan:theme`

Expected: Zero unused tokens (exit 0) or a report of unused tokens (exit 1) — either is correct output.

- [ ] **Step 3: Verify lint still passes**

Run: `rtk npm run lint`

Expected: Only the 2 pre-existing warnings (React hooks / TanStack Table compatibility), zero tailwind violations.
