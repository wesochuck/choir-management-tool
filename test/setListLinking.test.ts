import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appendPieceToSetList, appendPiecesToSetList } from '../src/lib/music/setListLinking';
import type { SetListItem } from '../src/services/eventService';

function makeSetList(items: Partial<SetListItem>[] = []): SetListItem[] {
  return items.map((item, i) => ({
    id: `item-${i}`,
    title: item.title || 'Untitled',
    composer: item.composer || '',
    duration: item.duration || '',
    notes: item.notes || '',
    type: item.type || 'song',
    pieceId: item.pieceId,
  }));
}

describe('appendPieceToSetList', () => {
  it('appends a new piece to an empty set list', () => {
    const { updated, setList } = appendPieceToSetList(undefined, {
      id: 'p1',
      title: 'Ave Maria',
      composer: 'Gounod',
    });
    assert.ok(updated);
    assert.equal(setList.length, 1);
    assert.equal(setList[0].pieceId, 'p1');
    assert.equal(setList[0].title, 'Ave Maria');
    assert.equal(setList[0].composer, 'Gounod');
  });

  it('appends a new piece to an existing set list', () => {
    const existing = makeSetList([{ title: 'Existing Song', pieceId: 'p0' }]);
    const { updated, setList } = appendPieceToSetList(existing, {
      id: 'p1',
      title: 'New Song',
    });
    assert.ok(updated);
    assert.equal(setList.length, 2);
    assert.equal(setList[1].pieceId, 'p1');
  });

  it('skips duplicate pieceId', () => {
    const existing = makeSetList([{ title: 'Ave Maria', pieceId: 'p1' }]);
    const { updated, setList } = appendPieceToSetList(existing, {
      id: 'p1',
      title: 'Ave Maria',
    });
    assert.equal(updated, false);
    assert.equal(setList.length, 1);
  });

  it('existing set list order is preserved', () => {
    const existing = makeSetList([
      { title: 'First', pieceId: 'p1' },
      { title: 'Second', pieceId: 'p2' },
    ]);
    const { updated, setList } = appendPieceToSetList(existing, {
      id: 'p3',
      title: 'Third',
    });
    assert.ok(updated);
    assert.equal(setList.length, 3);
    assert.equal(setList[0].pieceId, 'p1');
    assert.equal(setList[1].pieceId, 'p2');
    assert.equal(setList[2].pieceId, 'p3');
    assert.equal(setList[0].title, 'First');
    assert.equal(setList[1].title, 'Second');
    assert.equal(setList[2].title, 'Third');
  });
});

describe('appendPiecesToSetList', () => {
  it('appends multiple pieces', () => {
    const { addedCount, skippedCount, setList } = appendPiecesToSetList(undefined, [
      { id: 'p1', title: 'One' },
      { id: 'p2', title: 'Two' },
      { id: 'p3', title: 'Three' },
    ]);
    assert.equal(addedCount, 3);
    assert.equal(skippedCount, 0);
    assert.equal(setList.length, 3);
  });

  it('reports added and skipped counts correctly', () => {
    const existing = makeSetList([{ title: 'Duplicated', pieceId: 'p1' }]);
    const { addedCount, skippedCount, setList } = appendPiecesToSetList(existing, [
      { id: 'p1', title: 'Duplicated' }, // duplicate
      { id: 'p2', title: 'New' }, // new
      { id: 'p3', title: 'Also New' }, // new
    ]);
    assert.equal(addedCount, 2);
    assert.equal(skippedCount, 1);
    assert.equal(setList.length, 3);
  });

  it('all duplicates returns no changes', () => {
    const existing = makeSetList([{ title: 'A', pieceId: 'p1' }]);
    const { addedCount, skippedCount, setList } = appendPiecesToSetList(existing, [
      { id: 'p1', title: 'A' },
    ]);
    assert.equal(addedCount, 0);
    assert.equal(skippedCount, 1);
    assert.equal(setList.length, 1);
  });

  it('new items are appended at the end', () => {
    const existing = makeSetList([
      { title: 'First', pieceId: 'p1' },
      { title: 'Second', pieceId: 'p2' },
    ]);
    const { addedCount, setList } = appendPiecesToSetList(existing, [
      { id: 'p3', title: 'Third' },
      { id: 'p4', title: 'Fourth' },
    ]);
    assert.equal(addedCount, 2);
    assert.equal(setList.length, 4);
    assert.equal(setList[2].pieceId, 'p3');
    assert.equal(setList[3].pieceId, 'p4');
  });
});
