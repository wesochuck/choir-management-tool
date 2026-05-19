import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');

test('seating list print mode keeps navigation and editor controls out of the printed page', () => {
  const printRules = appCss.match(/@media print\s*\{[\s\S]*\n\}/)?.[0] || '';

  assert.match(
    printRules,
    /body\s+\.no-print\.no-print\.no-print\s*\{[^}]*display:\s*none\s*!important/,
    'print styles need a high-specificity no-print rule so broad print resets cannot reveal navigation or editor controls',
  );

  assert.match(
    printRules,
    /\[data-print-mode="text"\]\s+\.seating-print-shell\s*>\s*:not\(\.seating-text-list\)\s*\{[^}]*display:\s*none\s*!important/,
    'text print mode should hide every seating print sibling except the row list',
  );
});
