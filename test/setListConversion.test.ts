import test from 'node:test';
import assert from 'node:assert/strict';
import { linkSetListItemToPiece, validatePieceForLibrary } from '../src/lib/musicPieceUtils.ts';
import { getPerformanceIdForSetListLibraryLink } from '../src/lib/setList/setListItems.ts';
import type { SetListItem } from '../src/services/eventService.ts';

test('linkSetListItemToPiece links the correct set list item to the given pieceId', () => {
  const items: SetListItem[] = [
    { id: 'item_1', title: 'fdsfsdafdf' },
    { id: 'item_2', title: 'ddfdsfad' }
  ];

  const updated = linkSetListItemToPiece(items, 'item_1', 'piece_xyz');

  assert.equal(updated.length, 2);
  assert.equal(updated[0].pieceId, 'piece_xyz');
  assert.equal(updated[1].pieceId, undefined);
  assert.equal(updated[0].title, 'fdsfsdafdf');
});

test('validatePieceForLibrary requires a non-empty trimmed title', () => {
  assert.equal(validatePieceForLibrary(''), false);
  assert.equal(validatePieceForLibrary('   '), false);
  assert.equal(validatePieceForLibrary('Messiah'), true);
});

test('auto-linking rule: only auto-links if event type is Performance', () => {
  assert.equal(getPerformanceIdForSetListLibraryLink({ type: 'Performance', id: 'evt_1' }), 'evt_1');
  assert.equal(getPerformanceIdForSetListLibraryLink({ type: 'Rehearsal', id: 'evt_2' }), undefined);
  assert.equal(getPerformanceIdForSetListLibraryLink(null), undefined);
});
