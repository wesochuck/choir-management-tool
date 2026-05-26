import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAutoPaint } from '../src/lib/seatingAlgorithm.ts';

test('Seating Auto-Paint Formations Strategy Engine - horizontal_row spillover', () => {
  const rowCounts = [10, 10]; // 20 total seats
  const sectionCounts = { S: 10, A: 10 };
  const order = ['S', 'A'];
  
  const result = calculateAutoPaint(rowCounts, sectionCounts, order, 'horizontal_row');
  
  // Row 1 (Back) must be entirely filled with Sopranos (order[0], top of editor)
  assert.equal(result['1-0'], 'S');
  assert.equal(result['1-9'], 'S');
  // Row 0 (Front) must be entirely filled with Altos (order[1], bottom of editor)
  assert.equal(result['0-0'], 'A');
  assert.equal(result['0-9'], 'A');
});
