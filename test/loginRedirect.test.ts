import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPostLoginPath } from '../src/lib/loginRedirect';

describe('login redirect', () => {
  it('sends authenticated users to the protected dashboard', () => {
    assert.strictEqual(getPostLoginPath(), '/dashboard');
  });
});
