import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicPieceFixture } from './helpers.ts';
import {
  isParentPiece,
  getChildMovements,
  hasOwnTracks,
  getMovementTrackCount,
  hasAnyTracks,
} from '../src/views/admin/music-library/table/musicLibraryTableUtils.ts';

test('isParentPiece() returns true when another piece has parentId equal to the piece id', () => {
  const parent = createMusicPieceFixture({ id: 'parent-1' });
  const child = createMusicPieceFixture({ id: 'child-1', parentId: 'parent-1' });
  const lone = createMusicPieceFixture({ id: 'lone-1' });

  const allPieces = [parent, child, lone];

  assert.equal(isParentPiece(parent, allPieces), true);
  assert.equal(isParentPiece(child, allPieces), false);
  assert.equal(isParentPiece(lone, allPieces), false);
});

test('getChildMovements() returns only direct children', () => {
  const parent = createMusicPieceFixture({ id: 'parent-1' });
  const child1 = createMusicPieceFixture({ id: 'child-1', parentId: 'parent-1' });
  const child2 = createMusicPieceFixture({ id: 'child-2', parentId: 'parent-1' });
  const otherChild = createMusicPieceFixture({ id: 'child-3', parentId: 'parent-2' });

  const allPieces = [parent, child1, child2, otherChild];

  const movements = getChildMovements(parent, allPieces);
  assert.equal(movements.length, 2);
  assert.ok(movements.some((m) => m.id === 'child-1'));
  assert.ok(movements.some((m) => m.id === 'child-2'));
  assert.ok(!movements.some((m) => m.id === 'child-3'));
});

test('hasOwnTracks() returns true when any audioTrackMapping value is truthy', () => {
  const pieceWithTracks = createMusicPieceFixture({
    audioTrackMapping: { track1: 'url1', track2: '' },
  });
  const pieceWithEmptyTracks = createMusicPieceFixture({
    audioTrackMapping: { track1: '', track2: '' },
  });
  const pieceWithoutMapping = createMusicPieceFixture({});

  assert.equal(hasOwnTracks(pieceWithTracks), true);
  assert.equal(hasOwnTracks(pieceWithEmptyTracks), false);
  assert.equal(hasOwnTracks(pieceWithoutMapping), false);
});

test('getMovementTrackCount() counts truthy movement track mappings', () => {
  const parent = createMusicPieceFixture({ id: 'parent-1' });
  const child1 = createMusicPieceFixture({
    id: 'child-1',
    parentId: 'parent-1',
    audioTrackMapping: { soprano: 'urlS', alto: '' },
  });
  const child2 = createMusicPieceFixture({
    id: 'child-2',
    parentId: 'parent-1',
    audioTrackMapping: { tenor: 'urlT', bass: 'urlB' },
  });
  const unrelatedChild = createMusicPieceFixture({
    id: 'child-3',
    parentId: 'parent-2',
    audioTrackMapping: { soprano: 'urlS2' },
  });

  const allPieces = [parent, child1, child2, unrelatedChild];

  assert.equal(getMovementTrackCount(parent, allPieces), 3); // soprano, tenor, bass
});

test('hasAnyTracks() returns true for own tracks or child movement tracks', () => {
  const parentWithOwnTracksOnly = createMusicPieceFixture({
    id: 'parent-1',
    audioTrackMapping: { full: 'urlFull' },
  });
  const parentWithMovementTracksOnly = createMusicPieceFixture({ id: 'parent-2' });
  const child = createMusicPieceFixture({
    id: 'child-1',
    parentId: 'parent-2',
    audioTrackMapping: { full: 'urlChild' },
  });
  const parentWithNoTracks = createMusicPieceFixture({ id: 'parent-3' });

  const allPieces = [parentWithOwnTracksOnly, parentWithMovementTracksOnly, child, parentWithNoTracks];

  assert.equal(hasAnyTracks(parentWithOwnTracksOnly, allPieces), true);
  assert.equal(hasAnyTracks(parentWithMovementTracksOnly, allPieces), true);
  assert.equal(hasAnyTracks(parentWithNoTracks, allPieces), false);
});
