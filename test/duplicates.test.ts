import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates } from '../src/lib/music/duplicates.ts';
import { createMusicPieceFixture } from './helpers.ts';

describe('findDuplicates', () => {
  it('returns empty array when given empty array', () => {
    assert.deepEqual(findDuplicates([]), []);
  });

  it('returns empty array when given pieces with no duplicates', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: 'Song A', composer: 'Comp A' }),
      createMusicPieceFixture({ id: '2', title: 'Song B', composer: 'Comp B' }),
    ];
    assert.deepEqual(findDuplicates(pieces), []);
  });

  it('returns duplicates when exact matches exist', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: 'Song A', composer: 'Comp A' }),
      createMusicPieceFixture({ id: '2', title: 'Song B', composer: 'Comp B' }),
      createMusicPieceFixture({ id: '3', title: 'Song A', composer: 'Comp A' }),
    ];
    const duplicates = findDuplicates(pieces);
    assert.equal(duplicates.length, 2);
    assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '3']);
  });

  it('handles case-insensitivity in title and composer', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: 'song a', composer: 'COMP A' }),
      createMusicPieceFixture({ id: '2', title: 'Song A', composer: 'comp a' }),
    ];
    const duplicates = findDuplicates(pieces);
    assert.equal(duplicates.length, 2);
    assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '2']);
  });

  it('handles leading and trailing whitespace', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: ' Song A ', composer: '  Comp A' }),
      createMusicPieceFixture({ id: '2', title: 'Song A', composer: 'Comp A  ' }),
    ];
    const duplicates = findDuplicates(pieces);
    assert.equal(duplicates.length, 2);
    assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '2']);
  });

  it('handles missing title or composer', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: undefined, composer: undefined }),
      createMusicPieceFixture({ id: '2', title: undefined, composer: undefined }),
      createMusicPieceFixture({ id: '3', title: 'Song', composer: undefined }),
      createMusicPieceFixture({ id: '4', title: 'Song', composer: undefined }),
    ];
    const duplicates = findDuplicates(pieces);
    assert.equal(duplicates.length, 4);
    assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '2', '3', '4']);
  });

  it('handles multiple groups of duplicates', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: 'Song A', composer: 'Comp A' }),
      createMusicPieceFixture({ id: '2', title: 'Song B', composer: 'Comp B' }),
      createMusicPieceFixture({ id: '3', title: 'Song A', composer: 'Comp A' }),
      createMusicPieceFixture({ id: '4', title: 'Song B', composer: 'Comp B' }),
      createMusicPieceFixture({ id: '5', title: 'Song C', composer: 'Comp C' }),
    ];
    const duplicates = findDuplicates(pieces);
    assert.equal(duplicates.length, 4);
    assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '2', '3', '4']);
  });

  it('handles duplicate groups of three or more', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: 'Song A', composer: 'Comp A' }),
      createMusicPieceFixture({ id: '2', title: 'Song A', composer: 'Comp A' }),
      createMusicPieceFixture({ id: '3', title: 'Song A', composer: 'Comp A' }),
    ];
    const duplicates = findDuplicates(pieces);
    assert.equal(duplicates.length, 3);
    assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '2', '3']);
  });
});
