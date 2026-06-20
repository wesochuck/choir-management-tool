import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

test('seating list print mode keeps navigation and editor controls out of the printed page', () => {
  const printRules = appCss.match(/@media print\s*\{[\s\S]*\n\}/)?.[0] || '';

  assert.match(
    printRules,
    /body\s+\.no-print\.no-print\.no-print\s*\{[^}]*display:\s*none\s*!important/,
    'print styles need a high-specificity no-print rule so broad print resets cannot reveal navigation or editor controls',
  );

  assert.match(
    printRules,
    /\[data-print-mode=['"]text['"]\]\s+\[data-seating-text-list\]\s*\{[^}]*display:\s*block\s*!important/,
    'text print mode should show the text list',
  );

  assert.match(
    printRules,
    /@page\s*(?:landscape-canvas)?\s*\{[^}]*size:\s*landscape;/,
    'text print mode should use the shared landscape print page setup',
  );
});

test('seating grid print mode prints only the visual grid surface', () => {
  const printRules = appCss.match(/@media print\s*\{[\s\S]*\n\}/)?.[0] || '';

  assert.match(
    printRules,
    /\[data-print-mode=['"]visual['"]\]\s+\[data-seating-text-list\][\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should not show the text list',
  );

  assert.match(
    printRules,
    /\[data-print-mode=['"]visual['"]\]\s+\[data-unassigned-print\][\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should not print the unassigned singers print badge or shelf',
  );

  assert.match(
    printRules,
    /body:has\(\[data-print-mode=['"]visual['"]\]\)\s+\.admin-layout-header[\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should hide the page header so only the chart prints',
  );

  assert.match(
    printRules,
    /\[data-print-mode=['"]visual['"]\]\s+\.director-indicator\s*\{[^}]*display:\s*flex\s*!important/,
    'visual print mode should keep the director marker visible',
  );

  assert.match(
    printRules,
    /@page\s*(?:landscape-canvas)?\s*\{[^}]*size:\s*landscape;/,
    'print CSS should request landscape orientation for wide seating charts',
  );

  assert.ok(
    !/\[data-print-mode=['"]visual['"]\]\s+\.grid-print\s*\{[^}]*display:\s*none\s*!important/.test(printRules),
    'visual print mode must not hide the seating grid',
  );
});


test('visual print seat typography uses semantic seat classes', () => {
  const grid = readFileSync(resolve(process.cwd(), 'src/components/admin/SeatingGrid.tsx'), 'utf8');

  assert.match(grid, /grid-print/, 'SeatingGrid should use grid-print class for print layout identifier');
  assert.match(grid, /className=.*\btext-xs\b/, 'print seats should have readable font sizing via Tailwind');
  assert.ok(
    !/\.seat-cell\s*>\s*\.flex-col\s*\{/.test(appCss),
    'print CSS should avoid fragile structural selector for assigned singer wrapper',
  );
});
