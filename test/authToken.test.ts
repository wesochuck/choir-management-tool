import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldClearExpiredAuthToken } from '../src/lib/pocketbase';

describe('expired auth token handling', () => {
  it('clears a stored token before sending requests when it is no longer valid', () => {
    assert.strictEqual(shouldClearExpiredAuthToken('stale-token', false), true);
    assert.strictEqual(shouldClearExpiredAuthToken('fresh-token', true), false);
    assert.strictEqual(shouldClearExpiredAuthToken('', false), false);
  });
});
