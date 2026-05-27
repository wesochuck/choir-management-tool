import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenUrlFactory } from '../src/lib/tokenUrlUtils';

test('generatePublicLink and extractTokenFromUrl preserve encoded composite token', () => {
  const criticalPayload = 'hash/val+segment==';
  const constructedUrl = TokenUrlFactory.generatePublicLink('https://choir.org', 'player', criticalPayload);

  assert.ok(constructedUrl.includes('token=hash%2Fval%2Bsegment%3D%3D'));

  const decodedToken = TokenUrlFactory.extractTokenFromUrl(constructedUrl);
  assert.strictEqual(decodedToken, criticalPayload);
});

test('extractTokenFromUrl rebuilds token when ampersand split occurs', () => {
  const splitUrl = 'https://choir.org/public?token=abc123&s=xyz';
  assert.strictEqual(TokenUrlFactory.extractTokenFromUrl(splitUrl), 'abc123&s=xyz');
});
