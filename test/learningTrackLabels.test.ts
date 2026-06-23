import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLearningTrackContextLabel } from '../src/lib/music/learningTrackLabels';

describe('getLearningTrackContextLabel', () => {
  it('returns piece title for a standalone piece', () => {
    const label = getLearningTrackContextLabel({ title: 'America 250' });
    assert.equal(label, 'America 250');
  });

  it('returns "Parent – Movement" for a child piece', () => {
    const label = getLearningTrackContextLabel({ title: 'Movement 2' }, 'America 250');
    assert.equal(label, 'America 250 – Movement 2');
  });

  it('handles missing parentTitle gracefully', () => {
    // Child piece but parentTitle not yet loaded — should still show movement title
    const label = getLearningTrackContextLabel({ title: 'Movement 1' }, undefined);
    assert.equal(label, 'Movement 1');
  });

  it('handles empty parentTitle gracefully', () => {
    const label = getLearningTrackContextLabel({ title: 'Movement 1' }, '');
    assert.equal(label, 'Movement 1');
  });

  it('trims whitespace from titles', () => {
    const label = getLearningTrackContextLabel({ title: '  Prelude  ' }, '  Big Concert  ');
    assert.equal(label, 'Big Concert – Prelude');
  });
});
