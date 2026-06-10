import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const UI_DIR = path.resolve(import.meta.dirname, '../src/components/ui');

test('no CSS Module files remain after Tailwind migration', () => {
  const componentDirs = fs.readdirSync(UI_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const foundModuleCss: string[] = [];

  for (const dir of componentDirs) {
    const cssFile = path.join(UI_DIR, dir, `${dir}.module.css`);
    if (fs.existsSync(cssFile)) {
      foundModuleCss.push(cssFile);
    }
  }

  assert.equal(
    foundModuleCss.length,
    0,
    `Expected 0 CSS Module files after Tailwind migration, found ${foundModuleCss.length}: ${foundModuleCss.join(', ')}`,
  );

  const tsxFile = path.join(UI_DIR, 'index.ts');
  assert.ok(fs.existsSync(tsxFile), 'Missing barrel export at src/components/ui/index.ts');
});
