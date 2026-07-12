// @vitest-environment node
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock Record global
interface MockRecordInfo {
  id: string;
  data: Record<string, unknown>;
  set(field: string, value: unknown): void;
  get(field: string): unknown;
}

let mockRecordInstances: MockRecordInfo[] = [];

class MockRecord {
  id: string;
  data: Record<string, unknown>;

  constructor(collection: unknown, data?: Record<string, unknown>) {
    this.id = `rec-${mockRecordInstances.length + 1}`;
    this.data = { ...(data ?? {}) };
    mockRecordInstances.push(this);
  }

  set(field: string, value: unknown): void {
    this.data[field] = value;
  }

  get(field: string): unknown {
    return this.data[field];
  }
}

(globalThis as unknown as { Record: typeof MockRecord }).Record = MockRecord;

import {
  handleSetupStatus,
  handleSetupClaim,
  handleSetupProgress,
  handleSetupComplete,
} from '../pocketbase/pb_hooks_src/setup/setupEndpoints';

// Mock PocketBase globals
let envMap: Record<string, string> = {};
const mockOs = {
  getenv(key: string): string {
    return envMap[key] || '';
  },
};
(globalThis as unknown as { $os: typeof mockOs }).$os = mockOs;

let dbSettingsRecord: MockRecord | null = null;
let dbChoirNameRecord: MockRecord | null = null;
let dbUsers: MockRecord[] = [];

const mockApp = {
  findFirstRecordByFilter(collection: string, filter: string): MockRecord {
    if (collection === 'appSettings') {
      if (filter.includes("key = 'setup_state'") && dbSettingsRecord) {
        return dbSettingsRecord;
      }
      if (filter.includes("key = 'choir_name'") && dbChoirNameRecord) {
        return dbChoirNameRecord;
      }
      if (filter.includes("key = 'module_state'")) {
        return new MockRecord({ name: 'appSettings' }, {
          key: 'module_state',
          value: JSON.stringify({ enabled: [] }),
        });
      }
    }
    throw new Error('Not found');
  },

  findCollectionByNameOrId(name: string): { name: string } {
    return { name };
  },

  findRecordsByFilter(collection: string, filter: string): MockRecord[] {
    if (collection === 'users') {
      return dbUsers.filter((u) => u.data.role === 'admin');
    }
    return [];
  },

  save(record: MockRecord): void {
    if (record.data && record.data.key === 'setup_state') {
      dbSettingsRecord = record;
    } else {
      dbUsers.push(record);
    }
  },

  runInTransaction(callback: () => void): void {
    callback();
  },
};

(globalThis as unknown as { $app: typeof mockApp }).$app = mockApp;

interface TestResponse {
  status: number;
  data: Record<string, unknown>;
}

describe('Setup Fresh Install Smoke Test', () => {
  beforeEach(() => {
    mockRecordInstances = [];
    envMap = {
      HMAC_SECRET: 'test-hmac-secret-12345678901234567890123456789012',
      MAINTENANCE_SECRET: 'test-maintenance-secret-12345678901234567890',
    };
    dbSettingsRecord = null;
    dbChoirNameRecord = null;
    dbUsers = [];
  });

  it('runs through setup fresh install lifecycle', () => {
    const mockRequestInfo = (body?: Record<string, unknown>) => ({
      host: 'localhost:8080',
      body: body || {},
    });

    const superuserAuth = {
      collectionName: '_superusers',
    };

    const adminAuth = {
      collectionName: 'users',
      get: (key: string) => {
        if (key === 'role') return 'admin';
        return '';
      },
    };

    const mockEvent = (auth: Record<string, unknown> | null, body?: Record<string, unknown>) => ({
      json: (status: number, data: Record<string, unknown>) => ({ status, data }),
      requestInfo: () => mockRequestInfo(body),
      auth,
    });

    // 1. Initial status check (should be unclaimed)
    const statusRes1 = handleSetupStatus(mockEvent(null)) as TestResponse;
    assert.strictEqual(statusRes1.status, 200);
    assert.strictEqual(statusRes1.data.state, 'unclaimed');
    assert.strictEqual(statusRes1.data.initialized, false);
    assert.strictEqual(statusRes1.data.completedSections, undefined);

    // 2. Claim setup
    const claimRes = handleSetupClaim(
      mockEvent(superuserAuth, {
        email: 'admin@choir.org',
        password: 'SuperSecurePassword123!',
        passwordConfirm: 'SuperSecurePassword123!',
        name: 'Admin Owner',
        orgName: 'Community Choir',
      })
    ) as TestResponse;

    assert.strictEqual(claimRes.status, 200);
    assert.strictEqual(claimRes.data.success, true);
    // dbUsers should have the user record and profile record (length 2)
    assert.strictEqual(dbUsers.length, 2);
    assert.strictEqual(dbUsers[0].data.email, 'admin@choir.org');

    // 3. Status check should now show in_progress and completedSections=['admin-account']
    const statusRes2 = handleSetupStatus(mockEvent(adminAuth)) as TestResponse;
    assert.strictEqual(statusRes2.status, 200);
    assert.strictEqual(statusRes2.data.state, 'in_progress');
    assert.deepStrictEqual(statusRes2.data.completedSections, ['admin-account']);

    // 4. Save progress
    const progressRes = handleSetupProgress(
      mockEvent(adminAuth, {
        completedSections: [
          'admin-account',
          'organization-basics',
          'module-selection',
          'roster-structure',
        ],
      })
    ) as TestResponse;
    assert.strictEqual(progressRes.status, 200);
    assert.strictEqual(progressRes.data.success, true);

    // Verify status has updated
    const statusRes3 = handleSetupStatus(mockEvent(adminAuth)) as TestResponse;
    assert.deepStrictEqual(statusRes3.data.completedSections, [
      'admin-account',
      'organization-basics',
      'module-selection',
      'roster-structure',
    ]);

    dbChoirNameRecord = new MockRecord({ name: 'appSettings' }, {
      key: 'choir_name',
      value: JSON.stringify('Community Choir'),
    });

    // 5. Complete setup
    const completeRes = handleSetupComplete(mockEvent(adminAuth)) as TestResponse;
    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.data.success, true);

    // 6. Verify status is initialized
    const statusRes4 = handleSetupStatus(mockEvent(null)) as TestResponse;
    assert.strictEqual(statusRes4.status, 200);
    assert.strictEqual(statusRes4.data.state, 'initialized');
    assert.strictEqual(statusRes4.data.initialized, true);
  });
});
