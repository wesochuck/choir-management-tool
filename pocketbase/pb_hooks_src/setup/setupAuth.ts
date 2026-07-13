import { parseJsonField } from '../email/hookJson';

interface PocketBaseAuth {
  collectionName?: string;
  collection?: () => { name: string };
  get(key: string): unknown;
}

interface PocketBaseRequestEvent {
  auth?: PocketBaseAuth;
  json(status: number, data: unknown): unknown;
}

interface PocketBaseApp {
  findFirstRecordByFilter(collection: string, filter: string): { get(key: string): unknown };
}

declare const $app: PocketBaseApp;

function getAuthCollectionName(auth: PocketBaseAuth): string {
  if (typeof auth.collection === 'function') {
    try {
      const collection = auth.collection();
      if (collection && typeof collection.name === 'string') {
        return collection.name;
      }
    } catch {
      // Fall back to the SDK-style collectionName property below.
    }
  }
  return typeof auth.collectionName === 'string' ? auth.collectionName : '';
}

export function isSetupSuperuser(e: PocketBaseRequestEvent): boolean {
  return !!(e.auth && getAuthCollectionName(e.auth) === '_superusers');
}

export function isSetupAdmin(e: PocketBaseRequestEvent): boolean {
  return !!(
    e.auth &&
    getAuthCollectionName(e.auth) === 'users' &&
    e.auth.get('role') === 'admin'
  );
}

export function isBackendModuleEnabled(app: PocketBaseApp, moduleId: string): boolean {
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'module_state'");
    const val = record.get('value');
    const parsed = parseJsonField<{ enabled?: string[] }>(val);
    if (parsed && Array.isArray(parsed.enabled)) {
      return parsed.enabled.indexOf(moduleId) !== -1;
    }
  } catch {
    return false;
  }
  return false;
}

export function guardBackendModule(e: PocketBaseRequestEvent, moduleId: string): unknown {
  if (!isBackendModuleEnabled($app, moduleId)) {
    return e.json(404, { error: 'Not Found: Module ' + moduleId + ' is disabled' });
  }
  return null;
}
