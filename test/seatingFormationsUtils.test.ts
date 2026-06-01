import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleAccordion } from '../src/lib/seatingFormationsUtils.ts';

test('Seating Formations Accordion Toggle - should expand a collapsed item', () => {
  const current = null;
  const clicked = 'preset-1';
  const result = toggleAccordion(current, clicked);
  assert.equal(result, 'preset-1');
});

test('Seating Formations Accordion Toggle - should collapse an already expanded item', () => {
  const current = 'preset-1';
  const clicked = 'preset-1';
  const result = toggleAccordion(current, clicked);
  assert.equal(result, null);
});

test('Seating Formations Accordion Toggle - should switch to the newly clicked item and collapse the old one', () => {
  const current = 'preset-1';
  const clicked = 'preset-2';
  const result = toggleAccordion(current, clicked);
  assert.equal(result, 'preset-2');
});
