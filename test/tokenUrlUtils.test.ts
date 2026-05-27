import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenUrlFactory } from '../src/lib/tokenUrlUtils';

test('generatePublicLink and extractTokenFromUrl preserve encoded composite token', () => {
  const criticalPayload = 'hash/val+segment==';
  const constructedUrl = TokenUrlFactory.generatePublicLink('https://choir.org', 'player', criticalPayload);

  assert.ok(constructedUrl.includes('/player?token=hash%2Fval%2Bsegment%3D%3D'));

  const decodedToken = TokenUrlFactory.extractTokenFromUrl(constructedUrl);
  assert.strictEqual(decodedToken, criticalPayload);
});

test('extractTokenFromUrl rebuilds token with s fragment', () => {
  const splitUrl = 'https://choir.org/player?token=abc123&s=xyz';
  assert.strictEqual(TokenUrlFactory.extractTokenFromUrl(splitUrl), 'abc123&s=xyz');
});

test('extractTokenFromUrl rebuilds token with p fragment', () => {
  const splitUrl = 'https://choir.org/rsvp?token=abc123&p=profile1';
  assert.strictEqual(TokenUrlFactory.extractTokenFromUrl(splitUrl), 'abc123&p=profile1');
});

test('extractTokenFromUrl rebuilds token with p and s fragments in deterministic order', () => {
  const splitUrl = 'https://choir.org/rsvp?token=abc123&p=profile1&s=sig1';
  assert.strictEqual(TokenUrlFactory.extractTokenFromUrl(splitUrl), 'abc123&p=profile1&s=sig1');
});


test('extractTokenFromUrl rebuilds poll token with l, p and s fragments', () => {
  const splitUrl = 'https://choir.org/poll?token=l=poll1&p=profile1&s=sig1';
  assert.strictEqual(TokenUrlFactory.extractTokenFromUrl(splitUrl), 'l=poll1&p=profile1&s=sig1');
});
