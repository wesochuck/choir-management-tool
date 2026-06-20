import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
