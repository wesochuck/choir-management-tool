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

  assert.match(
    printRules,
    /@page\s*\{[^}]*size:\s*landscape;/,
    'text print mode should use the shared landscape print page setup',
  );
});

test('seating grid print mode prints only the visual grid surface', () => {
  const printRules = appCss.match(/@media print\s*\{[\s\S]*\n\}/)?.[0] || '';

  assert.match(
    printRules,
    /\[data-print-mode="visual"\]\s+\.seating-text-list[\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should not show the text list',
  );

  assert.match(
    printRules,
    /\[data-print-mode="visual"\]\s+\.seating-print-shell\s*>\s*:not\(\.grid-print\)[\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should hide shelf, warnings, and other print-shell siblings except the grid',
  );

  assert.match(
    printRules,
    /\[data-print-mode="visual"\]\s+\.unassigned-print-section[\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should not print the unassigned singers print badge or shelf',
  );

  assert.match(
    printRules,
    /body:has\(\[data-print-mode="visual"\]\)\s+\.admin-layout-header[\s\S]*?\{[^}]*display:\s*none\s*!important/,
    'visual print mode should hide the page header so only the chart prints',
  );

  assert.match(
    printRules,
    /\[data-print-mode="visual"\]\s+\.director-indicator\s*\{[^}]*display:\s*flex\s*!important/,
    'visual print mode should keep the director marker visible',
  );

  assert.match(
    printRules,
    /@page\s*\{[^}]*size:\s*landscape;/,
    'print CSS should request landscape orientation for wide seating charts',
  );

  assert.ok(
    !/\[data-print-mode="visual"\]\s+\.grid-print\s*\{[^}]*display:\s*none\s*!important/.test(printRules),
    'visual print mode must not hide the seating grid',
  );
});


test('visual print seat typography uses semantic seat classes', () => {
  const printRules = appCss.match(/@media print\s*\{[\s\S]*\n\}/)?.[0] || '';

  assert.match(printRules, /\.seat-label\s*\{[^}]*font-size:/, 'print CSS should style seat labels by semantic class');
  assert.match(printRules, /\.seat-person\s*\{[^}]*display:\s*flex\s*!important/, 'print CSS should style assigned singer container by semantic class');
  assert.match(printRules, /\.seat-initials\s*\{[^}]*font-size:/, 'print CSS should style singer initials by semantic class');
  assert.match(printRules, /\.seat-voice-part\s*\{[^}]*display:\s*none\s*!important/, 'print CSS should hide voice-part labels in print by semantic class');

  assert.ok(!/\.seat-cell\s*>\s*\.flex-col\s*\{/.test(printRules), 'print CSS should avoid fragile structural selector for assigned singer wrapper');
});
