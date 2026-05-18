import test from 'node:test';
import assert from 'node:assert/strict';
import { exportMusicToCSV } from '../src/lib/musicPieceUtils.ts';

test('exportMusicToCSV maps music pieces to CSV format correctly', () => {
  const pieces = [{ id: '1', title: 'Hallelujah', composer: 'Handel', voicing: 'SATB' }];
  const csv = exportMusicToCSV(pieces);
  assert.ok(csv.includes('Title,Composer,Voicing'));
  assert.ok(csv.includes('"Hallelujah","Handel","SATB"'));
});
