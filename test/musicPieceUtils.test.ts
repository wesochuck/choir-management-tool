import test from 'node:test';
import assert from 'node:assert/strict';
import { exportMusicToCSV, findDuplicates, appendPieceToSetList } from '../src/lib/musicPieceUtils.ts';

test('exportMusicToCSV maps music pieces to CSV format correctly', () => {
  const pieces = [{ id: '1', title: 'Hallelujah', composer: 'Handel', voicing: 'SATB' }];
  const csv = exportMusicToCSV(pieces);
  assert.ok(csv.includes('Title,Composer,Voicing'));
  assert.ok(csv.includes('"Hallelujah","Handel","SATB"'));
});

test('findDuplicates returns pieces with identical title and composer', () => {
  const pieces = [
    { id: '1', title: 'Song A', composer: 'Comp A' },
    { id: '2', title: 'Song B', composer: 'Comp B' },
    { id: '3', title: 'Song A', composer: 'Comp A' }
  ];
  const duplicates = findDuplicates(pieces);
  assert.equal(duplicates.length, 2);
  assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '3']);
});

test('appendPieceToSetList appends to undefined or empty set list', () => {
  const piece = { id: 'p1', title: 'Hallelujah', composer: 'Handel', duration: '3:45' };
  
  // Undefined set list
  const result1 = appendPieceToSetList(undefined, piece);
  assert.equal(result1.updated, true);
  assert.equal(result1.setList.length, 1);
  assert.equal(result1.setList[0].pieceId, 'p1');
  assert.equal(result1.setList[0].title, 'Hallelujah');
  assert.equal(result1.setList[0].composer, 'Handel');
  assert.equal(result1.setList[0].duration, '3:45');
  assert.ok(result1.setList[0].id);

  // Empty set list
  const result2 = appendPieceToSetList([], piece);
  assert.equal(result2.updated, true);
  assert.equal(result2.setList.length, 1);
  assert.equal(result2.setList[0].pieceId, 'p1');
});

test('appendPieceToSetList appends to the end of a non-empty set list', () => {
  const existingSetList = [
    { id: 'item1', title: 'Ode to Joy', composer: 'Beethoven', duration: '5:00', type: 'song' as const }
  ];
  const piece = { id: 'p2', title: 'Messiah', composer: 'Handel', duration: '4:20' };

  const result = appendPieceToSetList(existingSetList, piece);
  assert.equal(result.updated, true);
  assert.equal(result.setList.length, 2);
  assert.equal(result.setList[0].id, 'item1');
  assert.equal(result.setList[1].pieceId, 'p2');
  assert.equal(result.setList[1].title, 'Messiah');
});

test('appendPieceToSetList returns updated: false and original/copied set list if pieceId already exists', () => {
  const existingSetList = [
    { id: 'item1', pieceId: 'p1', title: 'Hallelujah', composer: 'Handel', duration: '3:45', type: 'song' as const }
  ];
  const piece = { id: 'p1', title: 'Hallelujah (Updated)', composer: 'Handel', duration: '3:45' };

  const result = appendPieceToSetList(existingSetList, piece);
  assert.equal(result.updated, false);
  assert.equal(result.setList.length, 1);
  assert.equal(result.setList[0].id, 'item1');
});

