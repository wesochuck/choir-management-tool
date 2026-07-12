// @vitest-environment node
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock Record global
class MockRecord {
  data: Record<string, unknown>;
  constructor(collection: any, data?: Record<string, unknown>) {
    this.data = data || {};
  }
  get(key: string) {
    return this.data[key];
  }
  set(key: string, val: any) {
    this.data[key] = val;
  }
}
(globalThis as any).Record = MockRecord;

import { resolveSetupStatus } from '../pocketbase/pb_hooks_src/setup/setupState';

let dbUsers: any[] = [];
let dbSettingsRecord: any = null;

const mockApp = {
  findFirstRecordByFilter(collection: string, filter: string): any {
    if (
      collection === 'appSettings' &&
      filter.includes("key = 'setup_state'") &&
      dbSettingsRecord
    ) {
      return dbSettingsRecord;
    }
    throw new Error('Not found');
  },

  findRecordsByFilter(collection: string, filter: string): any[] {
    if (collection === 'users') {
      return dbUsers;
    }
    return [];
  },
};

(globalThis as any).$app = mockApp;

describe('Setup Upgrade Compatibility Test', () => {
  beforeEach(() => {
    dbUsers = [];
    dbSettingsRecord = null;
  });

  it('reports initialized setup if migration initialized the setup_state record', () => {
    // 1. Simulate existing admin users in users table
    dbUsers = [
      {
        id: 'usr-1',
        data: { email: 'existing@admin.org', role: 'admin' },
        get: (k: string) => (k === 'role' ? 'admin' : ''),
      },
    ];

    // 2. Simulate migration running: it sees the admin user, so it inserts setup_state with initialized: true
    const hasAdmin = dbUsers.length > 0;
    dbSettingsRecord = new MockRecord(null, {
      key: 'setup_state',
      value: JSON.stringify({
        version: 1,
        initialized: hasAdmin,
        completedSections: hasAdmin ? ['legacy-install'] : [],
      }),
    });

    const status = resolveSetupStatus(mockApp);

    // Assert setup is initialized and active for upgraded users
    assert.strictEqual(status.initialized, true);
    assert.strictEqual(status.state, 'initialized');
    assert.deepStrictEqual(status.completedSections, ['legacy-install']);
  });
});
