// @vitest-environment jsdom
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNextMovementNumber } from '../src/lib/musicLibraryUtils';

describe('getNextMovementNumber', () => {
  it('returns 1 for empty list', () => {
    assert.strictEqual(getNextMovementNumber([]), 1);
  });

  it('returns next sequential number', () => {
    assert.strictEqual(
      getNextMovementNumber([{ title: 'Movement 1' }, { title: 'Movement 2' }]),
      3
    );
  });

  it('parses combined movement titles (1 & 2)', () => {
    assert.strictEqual(
      getNextMovementNumber([
        { title: 'Movement 1 & 2' },
        { title: 'Movement 3' },
        { title: 'Movement 4' },
        { title: 'Movement 5' },
        { title: 'Movement 6' },
      ]),
      7
    );
  });

  it('parses hyphenated ranges (1-2)', () => {
    assert.strictEqual(
      getNextMovementNumber([{ title: 'Movement 1-2' }, { title: 'Movement 3' }]),
      4
    );
  });

  it('parses abbreviated Mvt. prefix', () => {
    assert.strictEqual(getNextMovementNumber([{ title: 'Mvt. 1' }, { title: 'Mvt. 2' }]), 3);
  });
});
