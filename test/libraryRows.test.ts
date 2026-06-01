import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisibleMusicLibraryRows, toggleIdInSet } from '../src/lib/music/libraryRows.ts';
import { createMusicPieceFixture } from './helpers.ts';

describe('Music Library Row Building (P5)', () => {
  const p1 = createMusicPieceFixture({ id: 'p1', title: 'B Title', composer: 'Z Composer' });
  const p2 = createMusicPieceFixture({ id: 'p2', title: 'A Title', composer: 'A Composer', catalogId: 'CAT123' });
  const m1 = createMusicPieceFixture({ id: 'm1', title: 'Mvt 2', parentId: 'p1' });
  const m2 = createMusicPieceFixture({ id: 'm2', title: 'Mvt 1', parentId: 'p1' });
  const orphan = createMusicPieceFixture({ id: 'orphan', title: 'Orphan', parentId: 'non-existent' });

  const allPieces = [p1, p2, m1, m2, orphan];

  it('hides movements by default', () => {
    const rows = buildVisibleMusicLibraryRows(allPieces, { showMovements: false });
    assert.strictEqual(rows.length, 2);
    assert.ok(rows.find(r => r.id === 'p1'));
    assert.ok(rows.find(r => r.id === 'p2'));
    assert.ok(!rows.find(r => r.id === 'm1'));
  });

  it('shows movements immediately after parent and sorted alphabetically', () => {
    const rows = buildVisibleMusicLibraryRows(allPieces, { showMovements: true });
    // Order should be: A Title (p2), B Title (p1), Mvt 1 (m2), Mvt 2 (m1), Orphan
    assert.strictEqual(rows[0].id, 'p2');
    assert.strictEqual(rows[1].id, 'p1');
    assert.strictEqual(rows[2].id, 'm2'); // Mvt 1
    assert.strictEqual(rows[3].id, 'm1'); // Mvt 2
    assert.strictEqual(rows[4].id, 'orphan');
  });

  it('filters by search term (title)', () => {
    const rows = buildVisibleMusicLibraryRows(allPieces, { searchTerm: 'A Title' });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 'p2');
  });

  it('filters by search term (composer)', () => {
    const rows = buildVisibleMusicLibraryRows(allPieces, { searchTerm: 'Z Composer' });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 'p1');
  });

  it('filters by search term (catalog ID)', () => {
    const rows = buildVisibleMusicLibraryRows(allPieces, { searchTerm: 'CAT123' });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 'p2');
  });

  it('filters by duplicates only', () => {
    const duplicateIds = new Set(['p1']);
    const rows = buildVisibleMusicLibraryRows(allPieces, { showDuplicatesOnly: true, duplicateIds });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 'p1');
  });

  it('handles orphans at the end when their parent is filtered out', () => {
    // Search for 'A Title' (p2), p1 is gone, so m1/m2 are orphans relative to the filtered list
    // Actually, orphans are defined as children whose parents are NOT in the CURRENT filtered list.
    const rows = buildVisibleMusicLibraryRows(allPieces, { searchTerm: 'Mvt', showMovements: true });
    // p1, p2 are filtered out. m1, m2 are orphans.
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].id, 'm2'); // Alpha sort
    assert.strictEqual(rows[1].id, 'm1');
  });

  it('respects section bucket filter', () => {
    const restricted = createMusicPieceFixture({ id: 'res', title: 'Restricted', sectionBuckets: ['S'] });
    const pieces = [...allPieces, restricted];
    
    // Filter by 'S' - should include unrestricted (p1, p2, etc) and 'res'
    const rows = buildVisibleMusicLibraryRows(pieces, { sectionFilter: 'S' });
    assert.ok(rows.find(r => r.id === 'res'));
    
    // Filter by 'A' - should NOT include 'res'
    const rowsA = buildVisibleMusicLibraryRows(pieces, { sectionFilter: 'A' });
    assert.ok(!rowsA.find(r => r.id === 'res'));
  });

  it('respects multiple section filters and matches any selected section', () => {
    const pS = createMusicPieceFixture({ id: 'pS', title: 'Section S', sectionBuckets: ['S'] });
    const pA = createMusicPieceFixture({ id: 'pA', title: 'Section A', sectionBuckets: ['A'] });
    const pB = createMusicPieceFixture({ id: 'pB', title: 'Section B', sectionBuckets: ['B'] });
    const pieces = [pS, pA, pB];

    const rows = buildVisibleMusicLibraryRows(pieces, { sectionFilters: ['S', 'A'] });
    assert.strictEqual(rows.length, 2);
    assert.ok(rows.find(r => r.id === 'pS'));
    assert.ok(rows.find(r => r.id === 'pA'));
    assert.ok(!rows.find(r => r.id === 'pB'));
  });

  it('pieces with empty sectionBuckets remain visible under section filters', () => {
    const pS = createMusicPieceFixture({ id: 'pS', title: 'Section S', sectionBuckets: ['S'] });
    const pEmpty = createMusicPieceFixture({ id: 'pEmpty', title: 'Empty Sections', sectionBuckets: [] });
    const pNull = createMusicPieceFixture({ id: 'pNull', title: 'Null Sections', sectionBuckets: undefined });
    const pieces = [pS, pEmpty, pNull];

    const rows = buildVisibleMusicLibraryRows(pieces, { sectionFilters: ['S'] });
    assert.strictEqual(rows.length, 3);
    assert.ok(rows.find(r => r.id === 'pS'));
    assert.ok(rows.find(r => r.id === 'pEmpty'));
    assert.ok(rows.find(r => r.id === 'pNull'));
  });

  it('respects multiple genre filters and matches any selected genre', () => {
    const pG1 = createMusicPieceFixture({ id: 'pG1', title: 'Genre 1', genres: ['sacred'] });
    const pG2 = createMusicPieceFixture({ id: 'pG2', title: 'Genre 2', genres: ['pop'] });
    const pG3 = createMusicPieceFixture({ id: 'pG3', title: 'Genre 3', genres: ['classical'] });
    const pieces = [pG1, pG2, pG3];

    const rows = buildVisibleMusicLibraryRows(pieces, { genreFilters: ['sacred', 'pop'] });
    assert.strictEqual(rows.length, 2);
    assert.ok(rows.find(r => r.id === 'pG1'));
    assert.ok(rows.find(r => r.id === 'pG2'));
    assert.ok(!rows.find(r => r.id === 'pG3'));
  });

  it('pieces with no genres are hidden when genre filters are active', () => {
    const pG1 = createMusicPieceFixture({ id: 'pG1', title: 'Genre 1', genres: ['sacred'] });
    const pNoGenres = createMusicPieceFixture({ id: 'pNoGenres', title: 'No Genres', genres: [] });
    const pNullGenres = createMusicPieceFixture({ id: 'pNullGenres', title: 'Null Genres', genres: undefined });
    const pieces = [pG1, pNoGenres, pNullGenres];

    const rows = buildVisibleMusicLibraryRows(pieces, { genreFilters: ['sacred'] });
    assert.strictEqual(rows.length, 1);
    assert.ok(rows.find(r => r.id === 'pG1'));
    assert.ok(!rows.find(r => r.id === 'pNoGenres'));
    assert.ok(!rows.find(r => r.id === 'pNullGenres'));
  });

  it('combined section and genre filters both apply', () => {
    const pBoth = createMusicPieceFixture({ id: 'pBoth', title: 'Both Match', sectionBuckets: ['S'], genres: ['sacred'] });
    const pSecOnly = createMusicPieceFixture({ id: 'pSecOnly', title: 'Section Match Only', sectionBuckets: ['S'], genres: ['pop'] });
    const pGenreOnly = createMusicPieceFixture({ id: 'pGenreOnly', title: 'Genre Match Only', sectionBuckets: ['A'], genres: ['sacred'] });
    const pNeither = createMusicPieceFixture({ id: 'pNeither', title: 'Neither Match', sectionBuckets: ['A'], genres: ['pop'] });
    const pieces = [pBoth, pSecOnly, pGenreOnly, pNeither];

    const rows = buildVisibleMusicLibraryRows(pieces, { sectionFilters: ['S'], genreFilters: ['sacred'] });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 'pBoth');
  });

  it('excludes pieces that possess a non-empty parentId when showMovements is false', () => {
    const pieces = [
      createMusicPieceFixture({ id: 'parent1', title: 'Parent 1' }),
      createMusicPieceFixture({ id: 'child1', title: 'Child 1', parentId: 'parent1' }),
      createMusicPieceFixture({ id: 'child2', title: 'Child 2', parentId: 'parent1' }),
      createMusicPieceFixture({ id: 'standalone', title: 'Standalone' })
    ];
    const rows = buildVisibleMusicLibraryRows(pieces, { showMovements: false });
    assert.strictEqual(rows.length, 2);
    assert.ok(rows.find(r => r.id === 'parent1'));
    assert.ok(rows.find(r => r.id === 'standalone'));
    assert.ok(!rows.find(r => r.id === 'child1'));
    assert.ok(!rows.find(r => r.id === 'child2'));
  });

  it('toggleIdInSet correctly adds a missing ID and removes an existing ID', () => {
    const initialSet = new Set(['id1', 'id2']);
    
    // Test adding missing ID
    const addedSet = toggleIdInSet(initialSet, 'id3');
    assert.ok(addedSet.has('id3'));
    assert.ok(addedSet.has('id1'));
    assert.ok(addedSet.has('id2'));
    assert.strictEqual(addedSet.size, 3);

    // Test removing existing ID
    const removedSet = toggleIdInSet(initialSet, 'id1');
    assert.ok(!removedSet.has('id1'));
    assert.ok(removedSet.has('id2'));
    assert.strictEqual(removedSet.size, 1);
  });
});

