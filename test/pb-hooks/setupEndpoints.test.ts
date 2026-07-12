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

(globalThis as any).Record = MockRecord;

import {
  handleSetupStatus,
  handleSetupClaim,
  handleSetupProgress,
  handleSetupComplete,
  handleAdminRecovery,
  handleSetupHealth,
} from '../../pocketbase/pb_hooks_src/setup/setupEndpoints';

import { getSetupState } from '../../pocketbase/pb_hooks_src/setup/setupState';

// Setup environment and globals
let envMap: Record<string, string> = {};
const mockOs = {
  getenv(key: string): string {
    return envMap[key] || '';
  },
};
(globalThis as any).$os = mockOs;

let dbSettingsRecord: any = null;
let dbUsers: any[] = [];
let dbProfiles: any[] = [];
let savedRecords: any[] = [];
let deletedRecords: any[] = [];

const mockApp = {
  findCollectionByNameOrId(name: string) {
    return { name };
  },
  findFirstRecordByFilter(coll: string, filter: string, params?: any) {
    if (coll === 'appSettings' && filter.includes('setup_state')) {
      if (!dbSettingsRecord) throw new Error('not found');
      return dbSettingsRecord;
    }
    if (coll === 'appSettings' && filter.includes('module_state')) {
      return new MockRecord(
        { name: 'appSettings' },
        {
          key: 'module_state',
          value: JSON.stringify({ enabled: ['roster', 'events'] }),
        }
      );
    }
    if (coll === 'users' && filter.includes('email = {:email}')) {
      const email = params.email;
      const found = dbUsers.find((u) => u.get('email') === email);
      if (!found) throw new Error('not found');
      return found;
    }
    throw new Error('not found');
  },
  findRecordsByFilter(coll: string, filter: string, sort: string, limit: number, offset: number) {
    if (coll === 'users' && filter.includes("role = 'admin'")) {
      return dbUsers.filter((u) => u.get('role') === 'admin');
    }
    return [];
  },
  save(rec: any) {
    savedRecords.push(rec);
    if (rec.get('key') === 'setup_state') {
      dbSettingsRecord = rec;
    }
    return true;
  },
  delete(rec: any) {
    deletedRecords.push(rec);
    if (rec.get('key') === 'setup_state') {
      dbSettingsRecord = null;
    }
    dbUsers = dbUsers.filter((u) => u.id !== rec.id);
    dbProfiles = dbProfiles.filter((p) => p.id !== rec.id);
    return true;
  },
};

(globalThis as any).$app = mockApp;

function makeEvent(opts: {
  auth?: { collectionName: string; role?: string; id?: string };
  body?: any;
  query?: any;
  headers?: any;
}) {
  const requestInfoValue = {
    body: opts.body || {},
    query: opts.query || {},
    headers: opts.headers || {},
  };

  const event = {
    auth: opts.auth
      ? {
          collectionName: opts.auth.collectionName,
          id: opts.auth.id || 'usr-123',
          get: (key: string) => {
            if (key === 'role') return opts.auth?.role;
            return undefined;
          },
        }
      : null,
    requestInfo() {
      return requestInfoValue;
    },
    json(status: number, body: any) {
      return { status, body };
    },
  };
  return event;
}

describe('setupEndpoints', () => {
  beforeEach(() => {
    envMap = {};
    dbSettingsRecord = null;
    dbUsers = [];
    dbProfiles = [];
    savedRecords = [];
    deletedRecords = [];
    mockRecordInstances = [];
  });

  describe('handleSetupStatus', () => {
    it('returns public status fields', () => {
      const e = makeEvent({});
      const result = handleSetupStatus(e);
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.body, {
        state: 'unclaimed',
        initialized: false,
        completedSections: [],
        ownerIsPerformer: undefined,
        ownerVoicePartSet: undefined,
      });
    });
  });

  describe('handleSetupClaim', () => {
    it('rejects non-superusers', () => {
      const e = makeEvent({ auth: { collectionName: 'users' } });
      const result = handleSetupClaim(e);
      assert.strictEqual(result.status, 403);
    });

    it('creates admin user and profile on successful claim', () => {
      const e = makeEvent({
        auth: { collectionName: '_superusers' },
        body: {
          email: 'owner@example.com',
          password: 'password123',
          passwordConfirm: 'password123',
          name: 'Owner Name',
          isPerformer: true,
        },
      });

      // Mock save to push newly created Record to dbUsers/dbProfiles
      mock.method(mockApp, 'save', (rec: any) => {
        savedRecords.push(rec);
        if (rec.get('email')) {
          dbUsers.push(rec);
        } else if (rec.get('user')) {
          dbProfiles.push(rec);
        } else if (rec.get('key') === 'setup_state') {
          dbSettingsRecord = rec;
        }
        return true;
      });

      const result = handleSetupClaim(e);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(dbUsers.length, 1);
      assert.strictEqual(dbProfiles.length, 1);
      assert.strictEqual(dbUsers[0].get('email'), 'owner@example.com');
      assert.strictEqual(dbProfiles[0].get('name'), 'Owner Name');
      assert.strictEqual(dbProfiles[0].get('user'), dbUsers[0].id);

      const state = getSetupState(mockApp);
      assert.strictEqual(state.ownerIsPerformer, true);
      assert.ok(state.completedSections.includes('admin-account'));
    });

    it('is idempotent on duplicate claims', () => {
      // Seed existing admin
      const coll = { name: 'users' };
      const existingUser = new MockRecord(coll, {
        email: 'owner@example.com',
        role: 'admin',
      });
      dbUsers.push(existingUser);

      const e = makeEvent({
        auth: { collectionName: '_superusers' },
        body: {
          email: 'owner@example.com',
          password: 'password123',
          passwordConfirm: 'password123',
          name: 'Owner Name',
          isPerformer: true,
        },
      });

      const result = handleSetupClaim(e);
      assert.strictEqual(result.status, 200);
    });
  });

  describe('handleSetupProgress', () => {
    it('requires application admin', () => {
      const e = makeEvent({ auth: { collectionName: 'users', role: 'singer' } });
      const result = handleSetupProgress(e);
      assert.strictEqual(result.status, 403);
    });

    it('saves completed sections', () => {
      dbSettingsRecord = new MockRecord(
        { name: 'appSettings' },
        {
          key: 'setup_state',
          value: JSON.stringify({
            version: 1,
            initialized: false,
            completedSections: ['admin-account'],
          }),
        }
      );

      const e = makeEvent({
        auth: { collectionName: 'users', role: 'admin' },
        body: {
          completedSections: ['admin-account', 'organization-basics'],
          ownerIsPerformer: true,
        },
      });

      const result = handleSetupProgress(e);
      assert.strictEqual(result.status, 200);
      const state = getSetupState(mockApp);
      assert.deepStrictEqual(state.completedSections, ['admin-account', 'organization-basics']);
      assert.strictEqual(state.ownerIsPerformer, true);
    });
  });

  describe('handleSetupComplete', () => {
    it('rejects if required sections are missing', () => {
      dbSettingsRecord = new MockRecord(
        { name: 'appSettings' },
        {
          key: 'setup_state',
          value: JSON.stringify({
            version: 1,
            initialized: false,
            completedSections: ['admin-account'],
          }),
        }
      );

      const e = makeEvent({ auth: { collectionName: 'users', role: 'admin' } });
      const result = handleSetupComplete(e);
      assert.strictEqual(result.status, 400);
      assert.match(result.body.error, /Missing required setup sections/);
    });

    it('marks setup initialized if all required sections completed', () => {
      dbSettingsRecord = new MockRecord(
        { name: 'appSettings' },
        {
          key: 'setup_state',
          value: JSON.stringify({
            version: 1,
            initialized: false,
            completedSections: [
              'admin-account',
              'organization-basics',
              'module-selection',
              'roster-structure',
            ],
          }),
        }
      );

      const e = makeEvent({ auth: { collectionName: 'users', role: 'admin' } });
      const result = handleSetupComplete(e);
      assert.strictEqual(result.status, 200);
      const state = getSetupState(mockApp);
      assert.strictEqual(state.initialized, true);
    });
  });

  describe('handleAdminRecovery', () => {
    it('works only when recovery is required', () => {
      // status initialized but has users (not recovery_required)
      dbSettingsRecord = new MockRecord(
        { name: 'appSettings' },
        {
          key: 'setup_state',
          value: JSON.stringify({ version: 1, initialized: true, completedSections: [] }),
        }
      );
      const coll = { name: 'users' };
      dbUsers.push(new MockRecord(coll, { role: 'admin' }));

      const e = makeEvent({
        auth: { collectionName: '_superusers' },
        body: {
          email: 'newowner@example.com',
          password: 'password123',
          passwordConfirm: 'password123',
          name: 'New Owner',
        },
      });

      const result = handleAdminRecovery(e);
      assert.strictEqual(result.status, 400);
      assert.strictEqual(result.body.error, 'Admin recovery is not required');
    });

    it('creates admin user on valid recovery request', () => {
      // initialized but no admins (recovery_required)
      dbSettingsRecord = new MockRecord(
        { name: 'appSettings' },
        {
          key: 'setup_state',
          value: JSON.stringify({ version: 1, initialized: true, completedSections: [] }),
        }
      );
      dbUsers = [];

      mock.method(mockApp, 'save', (rec: any) => {
        savedRecords.push(rec);
        if (rec.get('email')) {
          dbUsers.push(rec);
        } else if (rec.get('user')) {
          dbProfiles.push(rec);
        }
        return true;
      });

      const e = makeEvent({
        auth: { collectionName: '_superusers' },
        body: {
          email: 'newowner@example.com',
          password: 'password123',
          passwordConfirm: 'password123',
          name: 'New Owner',
        },
      });

      const result = handleAdminRecovery(e);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(dbUsers.length, 1);
      assert.strictEqual(dbUsers[0].get('email'), 'newowner@example.com');
    });
  });

  describe('handleSetupHealth', () => {
    it('returns environment presence and Stripe mode without secrets', () => {
      envMap = {
        APP_URL: 'http://localhost:5173',
        HMAC_SECRET: 'super-secret-hmac-key',
        STRIPE_SECRET_KEY: 'sk_test_123',
      };

      const e = makeEvent({});
      const result = handleSetupHealth(e);
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.body.environment, {
        appUrl: true,
        hmacSecret: true,
        maintenanceSecret: false,
        stripeSecretKey: true,
        stripeWebhookSecret: false,
      });
      assert.strictEqual(result.body.stripeMode, 'test');
      assert.ok(!JSON.stringify(result.body).includes('super-secret-hmac-key'));
    });

    it('returns stripeValid true and appUrlMismatch false if credentials are valid and URL matches', () => {
      envMap = {
        APP_URL: 'http://localhost:5173',
        STRIPE_SECRET_KEY: 'sk_test_123',
      };

      const originalHttp = (globalThis as any).$http;
      (globalThis as any).$http = {
        send: () => ({ statusCode: 200, headers: {}, raw: '{}' }),
      };

      try {
        const e = makeEvent({
          headers: { host: 'localhost:5173' },
        });

        const result = handleSetupHealth(e);
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body.stripeValid, true);
        assert.strictEqual(result.body.appUrlMismatch, false);
      } finally {
        (globalThis as any).$http = originalHttp;
      }
    });

    it('returns appUrlMismatch true if APP_URL host does not match request host', () => {
      envMap = {
        APP_URL: 'https://prod.choir.management',
        STRIPE_SECRET_KEY: 'sk_test_123',
      };

      const originalHttp = (globalThis as any).$http;
      (globalThis as any).$http = {
        send: () => ({ statusCode: 401, headers: {}, raw: '{}' }),
      };

      try {
        const e = makeEvent({
          headers: { host: 'localhost:5173' },
        });

        const result = handleSetupHealth(e);
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body.stripeValid, false);
        assert.strictEqual(result.body.appUrlMismatch, true);
      } finally {
        (globalThis as any).$http = originalHttp;
      }
    });
  });
});
