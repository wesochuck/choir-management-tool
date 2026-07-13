import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  removeAuthorizationHeader,
  shouldClearExpiredAuthToken,
} from '../src/lib/pocketbase';

describe('expired auth token handling', () => {
  it('clears a stored token before sending requests when it is no longer valid', () => {
    assert.strictEqual(shouldClearExpiredAuthToken('stale-token', false), true);
    assert.strictEqual(shouldClearExpiredAuthToken('fresh-token', true), false);
    assert.strictEqual(shouldClearExpiredAuthToken('', false), false);
  });

  it('removes the already-prepared authorization header from an expired-token request', () => {
    const options = removeAuthorizationHeader({
      headers: {
        authorization: 'expired-token',
        'Accept-Language': 'en-US',
      },
    });

    const headers = new Headers(options.headers);
    assert.strictEqual(headers.has('Authorization'), false);
    assert.strictEqual(headers.get('Accept-Language'), 'en-US');
  });
});
