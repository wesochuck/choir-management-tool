import { describe, it, mock, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import type { PocketBaseRequestEvent } from '../../pocketbase/pb_hooks_src/email/emailTypes';

type IsMaintenanceRequestAuthorizedFn = (e: PocketBaseRequestEvent, app: unknown) => boolean;

let isMaintenanceRequestAuthorized: IsMaintenanceRequestAuthorizedFn;

function makeEvent(overrides?: {
  auth?: { get: (field: string) => unknown } | null;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}): PocketBaseRequestEvent {
  const auth = overrides?.auth !== undefined ? overrides.auth : null;
  return {
    auth: auth ?? undefined,
    requestInfo: () => ({
      query: overrides?.query ?? {},
      body: {},
      headers: overrides?.headers ?? {},
    }),
    response: {} as never,
    json: () => undefined as never,
    string: () => undefined as never,
  };
}

before(async () => {
  globalThis.$os = {
    getenv: () => '',
  };
  globalThis.$security = {
    equal: (a: string, b: string) => a === b,
  };
  const mod = await import('../../pocketbase/pb_hooks_src/maintenance/maintenanceAuth');
  isMaintenanceRequestAuthorized = mod.isMaintenanceRequestAuthorized;
});

beforeEach(() => {
  globalThis.$os = {
    getenv: (key: string) => {
      if (key === 'MAINTENANCE_SECRET') return 'test-secret-123';
      return '';
    },
  };
  globalThis.$security = {
    equal: (a: string, b: string) => a === b,
  };
});

afterEach(() => {
  mock.restoreAll();
});

describe('isMaintenanceRequestAuthorized', () => {
  it('returns true for admin user', () => {
    const event = makeEvent({
      auth: { get: (field) => (field === 'role' ? 'admin' : undefined) },
    });
    assert.strictEqual(isMaintenanceRequestAuthorized(event, {}), true);
  });

  it('returns false for non-admin with no token', () => {
    const event = makeEvent({
      auth: { get: (field) => (field === 'role' ? 'singer' : undefined) },
    });
    assert.strictEqual(isMaintenanceRequestAuthorized(event, {}), false);
  });

  it('returns true with valid query token', () => {
    const event = makeEvent({
      auth: null,
      query: { token: 'test-secret-123' },
    });
    assert.strictEqual(isMaintenanceRequestAuthorized(event, {}), true);
  });

  it('returns true with valid Authorization Bearer header', () => {
    const event = makeEvent({
      auth: null,
      headers: { authorization: 'Bearer test-secret-123' },
    });
    assert.strictEqual(isMaintenanceRequestAuthorized(event, {}), true);
  });

  it('returns false with invalid token', () => {
    const event = makeEvent({
      auth: null,
      query: { token: 'wrong-secret' },
    });
    assert.strictEqual(isMaintenanceRequestAuthorized(event, {}), false);
  });

  it('returns false when MAINTENANCE_SECRET is not set even with token; admin still works', () => {
    globalThis.$os = {
      getenv: () => '',
    };

    const eventWithToken = makeEvent({
      auth: null,
      query: { token: 'any-secret' },
    });
    assert.strictEqual(
      isMaintenanceRequestAuthorized(eventWithToken, {}),
      false,
      'token check should fail when env var is missing'
    );

    const adminEvent = makeEvent({
      auth: { get: (field) => (field === 'role' ? 'admin' : undefined) },
    });
    assert.strictEqual(
      isMaintenanceRequestAuthorized(adminEvent, {}),
      true,
      'admin should still be authorized even without env var'
    );
  });

  it('never leaks token or secret in console.log across all six scenarios', () => {
    const logSpy = mock.method(console, 'log');

    isMaintenanceRequestAuthorized(
      makeEvent({
        auth: { get: (field) => (field === 'role' ? 'admin' : undefined) },
      }),
      {}
    );

    isMaintenanceRequestAuthorized(
      makeEvent({
        auth: { get: (field) => (field === 'role' ? 'singer' : undefined) },
      }),
      {}
    );

    isMaintenanceRequestAuthorized(
      makeEvent({ auth: null, query: { token: 'test-secret-123' } }),
      {}
    );

    isMaintenanceRequestAuthorized(
      makeEvent({
        auth: null,
        headers: { authorization: 'Bearer test-secret-123' },
      }),
      {}
    );

    isMaintenanceRequestAuthorized(makeEvent({ auth: null, query: { token: 'wrong-secret' } }), {});

    globalThis.$os = {
      getenv: () => '',
    };
    isMaintenanceRequestAuthorized(
      makeEvent({
        auth: null,
        query: { token: 'test-secret-123' },
      }),
      {}
    );

    for (const call of logSpy.mock.calls) {
      for (const arg of call.arguments) {
        if (typeof arg === 'string') {
          assert.ok(
            !arg.includes('test-secret-123'),
            `console.log must not contain the secret/token, but got: ${JSON.stringify(arg)}`
          );
        }
      }
    }
  });
});
