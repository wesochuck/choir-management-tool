// @vitest-environment jsdom
import { describe, it, before } from 'node:test';
import assert from 'node:assert';

describe('Public route recognition', () => {
  let isPublicRoute: (path: string) => boolean;

  before(async () => {
    const mod = await import('../../src/lib/authRedirect');
    isPublicRoute = mod.isPublicRoute;
  });

  it('recognizes / as a public route', () => {
    assert.strictEqual(isPublicRoute('/'), true);
  });

  it('recognizes /history as a public route', () => {
    assert.strictEqual(isPublicRoute('/history'), true);
  });

  it('recognizes /login as a public route', () => {
    assert.strictEqual(isPublicRoute('/login'), true);
  });

  it('does not recognize /dashboard as public', () => {
    assert.strictEqual(isPublicRoute('/dashboard'), false);
  });

  it('does not recognize /admin/roster as public', () => {
    assert.strictEqual(isPublicRoute('/admin/roster'), false);
  });
});
