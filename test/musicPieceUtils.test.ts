import test from 'node:test';
import assert from 'node:assert/strict';
import { exportMusicToCSV, findDuplicates } from '../src/lib/musicPieceUtils.ts';

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
