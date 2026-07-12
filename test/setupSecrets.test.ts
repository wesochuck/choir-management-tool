import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateSecret } from '../src/lib/setupSecrets';

describe('setupSecrets', () => {
  it('generates cryptographically secure secrets with at least 32 bytes of entropy', () => {
    const bytesMock = mock.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i;
      }
      return array;
    });

    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: bytesMock as any,
      },
      writable: true,
      configurable: true,
    });

    try {
      const secret = generateSecret();
      assert.strictEqual(bytesMock.mock.callCount(), 1);

      // Check the returned secret is base64url encoded representation of 0..31
      // 32 bytes should produce a string of length 43 in base64url without padding
      assert.strictEqual(secret.length, 43);

      // Let's verify character set
      assert.match(secret, /^[A-Za-z0-9\-_]+$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });
});
