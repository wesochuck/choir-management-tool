import { parseJsonField } from '../email/hookJson';
import type { PersistedSetupState, PublicSetupStatus } from './setupTypes';

export function getSetupState(app: any): PersistedSetupState {
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'setup_state'");
    const value = parseJsonField<PersistedSetupState>(record.get('value'));
    if (value) return value;
  } catch {
    // ignore
  }
  return {
    version: 1,
    initialized: false,
    completedSections: [],
  };
}

export function saveSetupState(app: any, state: PersistedSetupState): void {
  const collection = app.findCollectionByNameOrId('appSettings');
  let record;
  try {
    record = app.findFirstRecordByFilter('appSettings', "key = 'setup_state'");
  } catch {
    record = new Record(collection, {
      key: 'setup_state',
      isPublic: false,
    });
  }
  record.set('value', JSON.stringify(state));
  app.save(record);
}

export function resolveSetupStatus(app: any): PublicSetupStatus {
  let adminCount = 0;
  try {
    const admins = app.findRecordsByFilter('users', "role = 'admin'", '', 100, 0);
    adminCount = admins ? admins.length : 0;
  } catch {
    adminCount = 0;
  }

  const state = getSetupState(app);

  if (state.initialized) {
    if (adminCount === 0) {
      return {
        state: 'recovery_required',
        initialized: true,
      };
    }
    return {
      state: 'initialized',
      initialized: true,
    };
  }

  if (adminCount === 0) {
    return {
      state: 'unclaimed',
      initialized: false,
    };
  }

  return {
    state: 'in_progress',
    initialized: false,
  };
}
