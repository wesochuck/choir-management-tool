import test from 'node:test';
import assert from 'node:assert/strict';
import { computePaginationRange, DOTS } from '../src/lib/paginationUtils.ts';

test('computePaginationRange returns all pages when totalPages is small', () => {
  const range = computePaginationRange(1, 5, 1);
  assert.deepEqual(range, [1, 2, 3, 4, 5]);
});

test('computePaginationRange shows right dots when close to first page in large totalPages', () => {
  const range = computePaginationRange(2, 10, 1);
  // siblingCount = 1 -> leftItemCount = 3 + 2(1) = 5 -> [1, 2, 3, 4, 5, DOTS, 10]
  assert.deepEqual(range, [1, 2, 3, 4, 5, DOTS, 10]);
});

test('computePaginationRange shows left dots when close to last page in large totalPages', () => {
  const range = computePaginationRange(9, 10, 1);
  // [1, DOTS, 6, 7, 8, 9, 10]
  assert.deepEqual(range, [1, DOTS, 6, 7, 8, 9, 10]);
});

test('computePaginationRange shows both left and right dots when in the middle of a large list', () => {
  const range = computePaginationRange(5, 10, 1);
  // [1, DOTS, 4, 5, 6, DOTS, 10]
  assert.deepEqual(range, [1, DOTS, 4, 5, 6, DOTS, 10]);
});
