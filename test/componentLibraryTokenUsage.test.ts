import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const UI_DIR = path.resolve(import.meta.dirname, '../src/components/ui');

test('CSS Module files exist for all component directories', () => {
  const componentDirs = fs.readdirSync(UI_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const dir of componentDirs) {
    const cssFile = path.join(UI_DIR, dir, `${dir}.module.css`);
    assert.ok(fs.existsSync(cssFile), `Missing CSS Module for component "${dir}" — expected ${cssFile}`);
  }

  const tsxFile = path.join(UI_DIR, 'index.ts');
  assert.ok(fs.existsSync(tsxFile), 'Missing barrel export at src/components/ui/index.ts');
});
