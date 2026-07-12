import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock Record globally as Goja PocketBase runtime does
interface MockRecordInfo {
  id: string;
  data: Record<string, unknown>;
  set(field: string, value: unknown): void;
  get(field: string): unknown;
}

const mockRecordInstances: MockRecordInfo[] = [];

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

globalThis.Record = MockRecord as any;

import {
  resolveSetupStatus,
  getSetupState,
  saveSetupState,
} from '../../pocketbase/pb_hooks_src/setup/setupState';

function fakeSetupApp(opts: {
  initialized: boolean;
  adminCount: number;
  hasSettingRecord?: boolean;
}) {
  const collection = { name: 'appSettings' };

  let settingRecord: any = null;
  if (opts.hasSettingRecord !== false) {
    settingRecord = new MockRecord(collection, {
      key: 'setup_state',
      value: JSON.stringify({
        version: 1,
        initialized: opts.initialized,
        completedSections: opts.initialized ? ['legacy-install'] : [],
      }),
    });
  }

  const savedRecords: any[] = [];

  const app = {
    findFirstRecordByFilter: mock.fn((coll: string, filter: string) => {
      if (coll === 'appSettings' && filter.includes('setup_state')) {
        if (!settingRecord) throw new Error('not found');
        return settingRecord;
      }
      throw new Error('not found');
    }),
    findRecordsByFilter: mock.fn((coll: string, filter: string) => {
      if (coll === 'users' && filter.includes("role = 'admin'")) {
        const admins = [];
        for (let i = 0; i < opts.adminCount; i++) {
          admins.push({ id: `admin-${i}`, role: 'admin' });
        }
        return admins;
      }
      return [];
    }),
    findCollectionByNameOrId: mock.fn(() => collection),
    save: mock.fn((rec: any) => {
      savedRecords.push(rec);
      settingRecord = rec;
      return true;
    }),
    savedRecords,
  };
  return app;
}

describe('setupState', () => {
  it('detects unclaimed status when no setup_state and no admins exist', () => {
    const app = fakeSetupApp({ initialized: false, adminCount: 0, hasSettingRecord: false });
    assert.deepStrictEqual(resolveSetupStatus(app), {
      state: 'unclaimed',
      initialized: false,
    });
  });

  it('detects in_progress status when not initialized and admin exists', () => {
    const app = fakeSetupApp({ initialized: false, adminCount: 1 });
    assert.deepStrictEqual(resolveSetupStatus(app), {
      state: 'in_progress',
      initialized: false,
    });
  });

  it('detects initialized status when initialized is true and admin exists', () => {
    const app = fakeSetupApp({ initialized: true, adminCount: 1 });
    assert.deepStrictEqual(resolveSetupStatus(app), {
      state: 'initialized',
      initialized: true,
    });
  });

  it('requires recovery instead of reopening claim after the last admin is deleted', () => {
    const app = fakeSetupApp({ initialized: true, adminCount: 0 });
    assert.deepStrictEqual(resolveSetupStatus(app), {
      state: 'recovery_required',
      initialized: true,
    });
  });

  it('loads default state when no record exists', () => {
    const app = fakeSetupApp({ initialized: false, adminCount: 0, hasSettingRecord: false });
    assert.deepStrictEqual(getSetupState(app), {
      version: 1,
      initialized: false,
      completedSections: [],
    });
  });

  it('saves and loads setup state correctly', () => {
    const app = fakeSetupApp({ initialized: false, adminCount: 0, hasSettingRecord: false });
    const newState = {
      version: 1 as const,
      initialized: true,
      completedSections: ['section-1'],
    };
    saveSetupState(app, newState);
    assert.deepStrictEqual(getSetupState(app), newState);
  });
});
