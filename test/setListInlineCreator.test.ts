import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterMusicLibrarySuggestions } from '../src/lib/setList/setListItems';
import { createMusicPieceFixture } from './helpers';

describe('SetListInlineCreator Logic (Phase 3)', () => {
  const library = [
    createMusicPieceFixture({ id: 'p1', title: 'Hallelujah Chorus', composer: 'Handel' }),
    createMusicPieceFixture({ id: 'p2', title: 'Ode to Joy', composer: 'Beethoven' }),
    createMusicPieceFixture({ id: 'p3', title: 'Messiah', composer: 'Handel' })
  ];

  it('filters suggestions by title', () => {
    const results = filterMusicLibrarySuggestions(library, 'hallelujah');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'p1');
  });

  it('filters suggestions by composer', () => {
    const results = filterMusicLibrarySuggestions(library, 'handel');
    assert.strictEqual(results.length, 2);
    assert.ok(results.some(r => r.id === 'p1'));
    assert.ok(results.some(r => r.id === 'p3'));
  });

  it('returns empty array for empty query', () => {
    const results = filterMusicLibrarySuggestions(library, '  ');
    assert.strictEqual(results.length, 0);
  });

  it('sorts results alphabetically by title', () => {
    const results = filterMusicLibrarySuggestions(library, 'h');
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[0].title, 'Hallelujah Chorus');
    assert.strictEqual(results[1].title, 'Messiah');
    assert.strictEqual(results[2].title, 'Ode to Joy');
  });
});
