import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSignedPlayerToken,
  getHmacSecret,
  generateSignedEventRecipientToken,
  generateSignedAuditionToken,
} from '../../pocketbase/pb_hooks_src/hmacTokens.ts';

// Mock PocketBase globals
const globalRecord = globalThis as Record<string, unknown>;

globalRecord.$security = {
  hs256: (payload: string, secret: string) => `sig_${payload}_${secret}`,
};

globalRecord.$os = { getenv: (key: string) => (key === 'HMAC_SECRET' ? 'test_secret' : '') };

test('generateSignedPlayerToken produces consistent tokens', () => {
  const eventId = 'event123';
  const token = generateSignedPlayerToken(eventId);

  // Format should be e=eventId&s=signature
  assert.strictEqual(token, `e=event123&s=sig_e=event123_test_secret`);
});

test('getHmacSecret retrieves secret from $os.getenv', () => {
  const secret = getHmacSecret();
  assert.strictEqual(secret, 'test_secret');
});

test('generateSignedEventRecipientToken produces consistent tokens', () => {
  const eventId = 'event123';
  const recipientId = 'rec456';
  const token = generateSignedEventRecipientToken(eventId, recipientId);

  // Format should be e=eventId&p=recipientId&s=signature
  assert.strictEqual(token, `e=event123&p=rec456&s=sig_e=event123&p=rec456_test_secret`);
});

test('generateSignedAuditionToken produces consistent tokens', () => {
  const auditionId = 'aud789';
  const token = generateSignedAuditionToken(auditionId);

  // Format should be a=auditionId&s=signature
  assert.strictEqual(token, `a=aud789&s=sig_a=aud789_test_secret`);
});
