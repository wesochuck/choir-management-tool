import test from 'node:test';
import assert from 'node:assert/strict';

// We test the pure formatting logic, not the React hook itself.
// The hook just calls: document.title = formatDocumentTitle(pageTitle, choirName)
import { formatDocumentTitle } from '../src/lib/documentTitle.ts';

test('formatDocumentTitle returns "PageTitle - Choir Name" when choir name is set', () => {
  const result = formatDocumentTitle('Roster Management', 'Harmony Voices');
  assert.equal(result, 'Roster Management - Harmony Voices');
});

test('formatDocumentTitle returns just page title when choir name is empty', () => {
  const result = formatDocumentTitle('Roster Management', '');
  assert.equal(result, 'Roster Management');
});

test('formatDocumentTitle trims whitespace from choir name', () => {
  const result = formatDocumentTitle('Events', '  My Choir  ');
  assert.equal(result, 'Events - My Choir');
});

test('formatDocumentTitle handles empty page title with choir name', () => {
  const result = formatDocumentTitle('', 'Downtown Chorale');
  assert.equal(result, 'Downtown Chorale');
});

test('formatDocumentTitle handles both empty', () => {
  const result = formatDocumentTitle('', '');
  assert.equal(result, 'Choir Manager');
});
