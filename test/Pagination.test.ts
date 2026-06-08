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

test('computePaginationRange handles zero total pages by returning an empty array', () => {
  const range = computePaginationRange(1, 0);
  assert.deepEqual(range, []);
});

test('computePaginationRange clamps out-of-bounds current page (zero or negative)', () => {
  const rangeZero = computePaginationRange(0, 10);
  assert.deepEqual(rangeZero, [1, 2, 3, 4, 5, DOTS, 10]);

  const rangeNegative = computePaginationRange(-5, 10);
  assert.deepEqual(rangeNegative, [1, 2, 3, 4, 5, DOTS, 10]);
});

test('computePaginationRange clamps out-of-bounds current page (exceeding total pages)', () => {
  const range = computePaginationRange(15, 10);
  assert.deepEqual(range, [1, DOTS, 6, 7, 8, 9, 10]);
});

test('computePaginationRange uses a default siblingCount of 1', () => {
  const rangeWithExplicitDefault = computePaginationRange(5, 10, 1);
  const rangeWithoutDefault = computePaginationRange(5, 10);
  assert.deepEqual(rangeWithoutDefault, rangeWithExplicitDefault);
});

test('computePaginationRange handles custom siblingCount parameter', () => {
  // siblingCount = 2 -> totalPageNumbers = 7
  // If we are at page 6 out of 15:
  // leftSiblingIndex = 6 - 2 = 4
  // rightSiblingIndex = 6 + 2 = 8
  // shouldShowLeftDots = 4 > 2 (true)
  // shouldShowRightDots = 8 < 14 (true)
  const range = computePaginationRange(6, 15, 2);
  // [1, DOTS, 4, 5, 6, 7, 8, DOTS, 15]
  assert.deepEqual(range, [1, DOTS, 4, 5, 6, 7, 8, DOTS, 15]);
});
