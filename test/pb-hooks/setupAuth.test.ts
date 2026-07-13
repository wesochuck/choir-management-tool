import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBackendModuleEnabled,
  isSetupAdmin,
  isSetupSuperuser,
} from '../../pocketbase/pb_hooks_src/setup/setupAuth.ts';

describe('setup request authentication', () => {
  it('recognizes a PocketBase 0.36 admin auth record by collection()', () => {
    const event = {
      auth: {
        collection: () => ({ name: 'users' }),
        get: (key: string) => (key === 'role' ? 'admin' : undefined),
      },
    };

    assert.strictEqual(isSetupAdmin(event), true);
  });

  it('recognizes a PocketBase 0.36 superuser auth record by collection()', () => {
    const event = {
      auth: {
        collection: () => ({ name: '_superusers' }),
        get: () => undefined,
      },
    };

    assert.strictEqual(isSetupSuperuser(event), true);
  });
});

describe('isBackendModuleEnabled', () => {
  it('fails closed when persisted module state cannot be read', () => {
    const app = {
      findFirstRecordByFilter() {
        throw new Error('database unavailable');
      },
    };

    assert.strictEqual(isBackendModuleEnabled(app, 'roster'), false);
  });

  it('fails closed when persisted module state is malformed', () => {
    const app = {
      findFirstRecordByFilter() {
        return { get: () => '{not-json' };
      },
    };

    assert.strictEqual(isBackendModuleEnabled(app, 'roster'), false);
  });
});
