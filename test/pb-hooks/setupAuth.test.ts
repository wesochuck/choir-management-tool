import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isBackendModuleEnabled } from '../../pocketbase/pb_hooks_src/setup/setupAuth.ts';

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
