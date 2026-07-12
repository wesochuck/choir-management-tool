import { parseJsonField } from '../email/hookJson';

interface PocketBaseAuth {
  collectionName: string;
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

export function isSetupSuperuser(e: PocketBaseRequestEvent): boolean {
  return !!(e.auth && e.auth.collectionName === '_superusers');
}

export function isSetupAdmin(e: PocketBaseRequestEvent): boolean {
  return !!(e.auth && e.auth.collectionName === 'users' && e.auth.get('role') === 'admin');
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
    // Default to true if settings don't exist yet (during first run or migration)
    return true;
  }
  return false;
}

export function guardBackendModule(e: PocketBaseRequestEvent, moduleId: string): unknown {
  if (!isBackendModuleEnabled($app, moduleId)) {
    return e.json(404, { error: 'Not Found: Module ' + moduleId + ' is disabled' });
  }
  return null;
}
