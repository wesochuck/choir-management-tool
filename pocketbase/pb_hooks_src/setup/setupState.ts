import { parseJsonField } from '../email/hookJson';
import type { PersistedSetupState, PublicSetupStatus } from './setupTypes';

interface PocketBaseRecord {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface PocketBaseApp {
  findFirstRecordByFilter(collection: string, filter: string): PocketBaseRecord;
  findCollectionByNameOrId(name: string): unknown;
  findRecordsByFilter(
    collection: string,
    filter: string,
    sort: string,
    limit: number,
    offset: number
  ): unknown[];
  save(record: unknown): void;
}

declare const Record: new (collection: unknown, data: Record<string, unknown>) => PocketBaseRecord;

export function getSetupState(app: PocketBaseApp): PersistedSetupState {
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'setup_state'");
    const value = parseJsonField<PersistedSetupState>(record.get('value'));
    if (value) return value;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const lowerMsg = msg.toLowerCase();
    // Only swallow record not found or table not found errors
    const isExpectedNotFound =
      lowerMsg.indexOf('no such table') !== -1 ||
      lowerMsg.indexOf('no rows') !== -1 ||
      lowerMsg.indexOf('not found') !== -1;
    if (!isExpectedNotFound) {
      throw err;
    }
  }
  return {
    version: 1,
    initialized: false,
    completedSections: [],
  };
}

export function saveSetupState(app: PocketBaseApp, state: PersistedSetupState): void {
  const collection = app.findCollectionByNameOrId('appSettings');
  let record: PocketBaseRecord;
  try {
    record = app.findFirstRecordByFilter('appSettings', "key = 'setup_state'");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const lowerMsg = msg.toLowerCase();
    const isExpectedNotFound =
      lowerMsg.indexOf('no such table') !== -1 ||
      lowerMsg.indexOf('no rows') !== -1 ||
      lowerMsg.indexOf('not found') !== -1;
    if (isExpectedNotFound) {
      record = new Record(collection, {
        key: 'setup_state',
        isPublic: false,
      });
    } else {
      throw err;
    }
  }
  record.set('value', JSON.stringify(state));
  app.save(record);
}

export function resolveSetupStatus(app: PocketBaseApp): PublicSetupStatus {
  let adminCount = 0;
  try {
    const admins = app.findRecordsByFilter('users', "role = 'admin'", '', 100, 0);
    adminCount = admins ? admins.length : 0;
  } catch (err: unknown) {
    // Fail-closed: Propagate database error rather than defaulting to 0 admins
    throw err;
  }

  const state = getSetupState(app);

  if (state.initialized) {
    if (adminCount === 0) {
      return {
        state: 'recovery_required',
        initialized: true,
        completedSections: state.completedSections,
        ownerIsPerformer: state.ownerIsPerformer,
        ownerVoicePartSet: state.ownerVoicePartSet,
      };
    }
    return {
      state: 'initialized',
      initialized: true,
      completedSections: state.completedSections,
      ownerIsPerformer: state.ownerIsPerformer,
      ownerVoicePartSet: state.ownerVoicePartSet,
    };
  }

  if (adminCount === 0) {
    return {
      state: 'unclaimed',
      initialized: false,
      completedSections: state.completedSections,
      ownerIsPerformer: state.ownerIsPerformer,
      ownerVoicePartSet: state.ownerVoicePartSet,
    };
  }

  return {
    state: 'in_progress',
    initialized: false,
    completedSections: state.completedSections,
    ownerIsPerformer: state.ownerIsPerformer,
    ownerVoicePartSet: state.ownerVoicePartSet,
  };
}
