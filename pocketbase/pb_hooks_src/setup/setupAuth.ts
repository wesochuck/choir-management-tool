import { parseJsonField } from '../email/hookJson';

declare const $app: any;

export function isSetupSuperuser(e: any): boolean {
  return !!(e.auth && e.auth.collectionName === '_superusers');
}

export function isSetupAdmin(e: any): boolean {
  return !!(e.auth && e.auth.collectionName === 'users' && e.auth.get('role') === 'admin');
}

export function isBackendModuleEnabled(app: any, moduleId: string): boolean {
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'module_state'");
    const val = record.get('value');
    const parsed = parseJsonField<any>(val);
    if (parsed && Array.isArray(parsed.enabled)) {
      return parsed.enabled.indexOf(moduleId) !== -1;
    }
  } catch {
    // Default to true if settings don't exist yet (during first run or migration)
    return true;
  }
  return false;
}

export function guardBackendModule(e: any, moduleId: string): any {
  if (!isBackendModuleEnabled($app, moduleId)) {
    return e.json(400, { error: 'Forbidden: Module ' + moduleId + ' is disabled' });
  }
  return null;
}
