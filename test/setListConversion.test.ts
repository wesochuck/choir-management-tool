import test from 'node:test';
import assert from 'node:assert/strict';
import { linkSetListItemToPiece, validatePieceForLibrary, parseDurationToSeconds, formatSecondsToDuration } from '../src/lib/musicPieceUtils.ts';
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

test('parseDurationToSeconds parses various format strings correctly', () => {
  assert.equal(parseDurationToSeconds(undefined), 0);
  assert.equal(parseDurationToSeconds(''), 0);
  assert.equal(parseDurationToSeconds('   '), 0);
  assert.equal(parseDurationToSeconds('3:30'), 210);
  assert.equal(parseDurationToSeconds('03:30'), 210);
  assert.equal(parseDurationToSeconds('1:15:30'), 4530);
  assert.equal(parseDurationToSeconds('15'), 900);
  assert.equal(parseDurationToSeconds('15m'), 900);
  assert.equal(parseDurationToSeconds('15 min'), 900);
  assert.equal(parseDurationToSeconds('15 mins'), 900);
  assert.equal(parseDurationToSeconds('1h 30m'), 5400);
  assert.equal(parseDurationToSeconds('45s'), 45);
  assert.equal(parseDurationToSeconds('invalid'), 0);
});

test('formatSecondsToDuration formats seconds to human-readable strings correctly', () => {
  assert.equal(formatSecondsToDuration(0), '0:00');
  assert.equal(formatSecondsToDuration(-10), '0:00');
  assert.equal(formatSecondsToDuration(210), '3:30');
  assert.equal(formatSecondsToDuration(900), '15:00');
  assert.equal(formatSecondsToDuration(4530), '1:15:30');
  assert.equal(formatSecondsToDuration(5400), '1:30:00');
});

test('auto-linking rule: only auto-links if event type is Performance', () => {
  assert.equal(getPerformanceIdForSetListLibraryLink({ type: 'Performance', id: 'evt_1' }), 'evt_1');
  assert.equal(getPerformanceIdForSetListLibraryLink({ type: 'Rehearsal', id: 'evt_2' }), undefined);
  assert.equal(getPerformanceIdForSetListLibraryLink(null), undefined);
});
