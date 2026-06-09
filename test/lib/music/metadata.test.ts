import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePieceForLibrary, findPieceDetails } from '../../../src/lib/music/metadata';
import type { MusicPiece } from '../../../src/types/musicLibrary';

test('validatePieceForLibrary', async (t) => {
  await t.test('returns true for valid title', () => {
    assert.equal(validatePieceForLibrary('A Valid Title'), true);
  });

  await t.test('returns false for empty title', () => {
    assert.equal(validatePieceForLibrary(''), false);
  });

  await t.test('returns false for whitespace-only title', () => {
    assert.equal(validatePieceForLibrary('   '), false);
  });

  await t.test('returns false for non-string values', () => {
    assert.equal(validatePieceForLibrary(null), false);
    assert.equal(validatePieceForLibrary(undefined), false);
    assert.equal(validatePieceForLibrary(123), false);
    assert.equal(validatePieceForLibrary({}), false);
  });
});

test('findPieceDetails', async (t) => {
  const mockLibrary: MusicPiece[] = [
    { id: '1', title: 'Piece 1', collectionId: 'coll1', collectionName: 'music', created: 'now', updated: 'now' },
    { id: '2', title: 'Piece 2', collectionId: 'coll1', collectionName: 'music', created: 'now', updated: 'now' },
    { id: '3', title: 'Piece 3', collectionId: 'coll1', collectionName: 'music', created: 'now', updated: 'now' },
  ];

  await t.test('returns matching piece when found', () => {
    const result = findPieceDetails('2', mockLibrary);
    assert.deepEqual(result, mockLibrary[1]);
  });

  await t.test('returns null when pieceId is not found', () => {
    const result = findPieceDetails('99', mockLibrary);
    assert.equal(result, null);
  });

  await t.test('returns null when pieceId is undefined or empty', () => {
    assert.equal(findPieceDetails(undefined, mockLibrary), null);
    assert.equal(findPieceDetails('', mockLibrary), null);
  });

  await t.test('returns null when library is undefined or empty', () => {
    assert.equal(findPieceDetails('1', undefined), null);
    assert.equal(findPieceDetails('1', []), null);
  });
});
