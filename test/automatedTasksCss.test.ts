import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const commViewCss = readFileSync(new URL('../src/views/admin/CommunicationView.css', import.meta.url), 'utf8');
const commsCss = readFileSync(new URL('../src/views/admin/communications/Communications.css', import.meta.url), 'utf8');

test('CommunicationView.css no longer contains legacy automated-* class definitions', () => {
  const legacyPatterns = [
    /\.automated-grid\s*\{/,
    /\.automated-task-card\s*\{/,
    /\.automated-task-header\s*\{/,
    /\.automated-task-status-group\s*\{/,
    /\.automated-task-type-badge/,
    /\.automated-task-resolution-badge/,
    /\.automated-task-timestamp\s*\{/,
    /\.automated-task-footer\s*\{/,
  ];
  for (const pattern of legacyPatterns) {
    assert.doesNotMatch(commViewCss, pattern, `Legacy pattern ${pattern} should not exist in CommunicationView.css`);
  }
});

test('Communications.css contains all comm-automated-* class definitions', () => {
  const requiredClasses = [
    /\.comm-automated-grid\s*\{/,
    /\.comm-automated-card\s*\{/,
    /\.comm-automated-header\s*\{/,
    /\.comm-automated-footer\s*\{/,
    /\.comm-automated-status-group\s*\{/,
    /\.comm-automated-type-badge/,
    /\.comm-automated-resolution-badge/,
    /\.comm-automated-resolution-sent/,
    /\.comm-automated-resolution-archived/,
    /\.comm-automated-resolution-scheduled/,
    /\.comm-automated-timestamp\s*\{/,
  ];
  for (const pattern of requiredClasses) {
    assert.match(commsCss, pattern, `Required pattern ${pattern} should exist in Communications.css`);
  }
});

test('comm-automated-grid uses auto-fit, not auto-fill', () => {
  assert.match(commsCss, /\.comm-automated-grid\s*\{[^}]*auto-fit/);
});

test('comm-automated-card includes padding', () => {
  assert.match(commsCss, /\.comm-automated-card\s*\{[^}]*padding/);
});

test('comm-automated-header includes gap and flex-wrap', () => {
  const headerBlock = commsCss.match(/\.comm-automated-header\s*\{([^}]+)\}/);
  assert.ok(headerBlock, 'comm-automated-header block must exist');
  assert.match(headerBlock![1], /gap/);
  assert.match(headerBlock![1], /flex-wrap/);
});

test('comm-automated-timestamp has responsive rule at width <= 640px', () => {
  assert.match(commsCss, /@media\s*\(width\s*<=\s*640px\)\s*\{[\s\S]*\.comm-automated-timestamp[\s\S]*?\}/);
});
