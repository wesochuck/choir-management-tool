import test from 'node:test';
import assert from 'node:assert/strict';
import { getLearningTrackContextLabel } from '../src/lib/musicPieceUtils.ts';

test('getLearningTrackContextLabel returns piece title for a standalone piece', () => {
  const label = getLearningTrackContextLabel({ title: 'America 250' });
  assert.equal(label, 'America 250');
});

test('getLearningTrackContextLabel returns "Parent – Movement" for a child piece', () => {
  const label = getLearningTrackContextLabel({ title: 'Movement 2' }, 'America 250');
  assert.equal(label, 'America 250 – Movement 2');
});

test('getLearningTrackContextLabel handles missing parentTitle gracefully', () => {
  // Child piece but parentTitle not yet loaded — should still show movement title
  const label = getLearningTrackContextLabel({ title: 'Movement 1' }, undefined);
  assert.equal(label, 'Movement 1');
});

test('getLearningTrackContextLabel trims whitespace from titles', () => {
  const label = getLearningTrackContextLabel({ title: '  Prelude  ' }, '  Big Concert  ');
  assert.equal(label, 'Big Concert – Prelude');
});
