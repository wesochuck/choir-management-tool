import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPublicRoute,
  shouldRedirectAuthErrorToLogin,
} from '../src/lib/authRedirect.ts';

test('auth redirect: public routes are recognized', () => {
  assert.equal(isPublicRoute('/login'), true);
  assert.equal(isPublicRoute('/reset-password'), true);
  assert.equal(isPublicRoute('/auditions'), true);
  assert.equal(isPublicRoute('/auditions/some-extra-path'), true);
  assert.equal(isPublicRoute('/rsvp'), true);
  assert.equal(isPublicRoute('/rsvp/anything'), true);
  assert.equal(isPublicRoute('/poll'), true);
  assert.equal(isPublicRoute('/unsubscribe'), true);
  assert.equal(isPublicRoute('/player'), true);
});

test('auth redirect: protected routes are not public', () => {
  assert.equal(isPublicRoute('/'), false);
  assert.equal(isPublicRoute('/admin/roster'), false);
  assert.equal(isPublicRoute('/admin/settings'), false);
  assert.equal(isPublicRoute('/profile'), false);
  assert.equal(isPublicRoute('/seating/event123'), false);
});

test('auth redirect: avoids loose substring matches', () => {
  assert.equal(isPublicRoute('/admin/player-settings'), false);
  assert.equal(isPublicRoute('/not-login'), false);
  assert.equal(isPublicRoute('/polling-admin'), false);
  assert.equal(isPublicRoute('/admin/rsvp-settings'), false);
});

test('auth redirect: redirects only protected routes to login', () => {
  assert.equal(shouldRedirectAuthErrorToLogin('/rsvp'), false);
  assert.equal(shouldRedirectAuthErrorToLogin('/player'), false);
  assert.equal(shouldRedirectAuthErrorToLogin('/login'), false);
  assert.equal(shouldRedirectAuthErrorToLogin('/admin/roster'), true);
  assert.equal(shouldRedirectAuthErrorToLogin('/profile'), true);
});
