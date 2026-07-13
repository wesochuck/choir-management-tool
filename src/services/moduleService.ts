import { getSetting, upsertSetting } from './settings/core';
import { pb } from '../lib/pocketbase';
import type { ModuleId } from '../lib/modules';
import { RECOMMENDED_MODULES } from '../lib/modules';

export interface ModuleState {
  version: number;
  enabled: ModuleId[];
}

export async function getPublicModuleState(): Promise<ModuleState> {
  return pb.send<ModuleState>('/api/modules/state', { method: 'GET' });
}

export async function getModuleState(): Promise<ModuleState> {
  const setting = await getSetting<ModuleState>('module_state');
  if (setting && setting.value) {
    return setting.value;
  }
  // Return default recommended modules when none exist (fresh installs)
  return {
    version: 1,
    enabled: [...RECOMMENDED_MODULES],
  };
}

export async function saveModuleState(enabled: ModuleId[]): Promise<unknown> {
  const value: ModuleState = {
    version: 1,
    enabled,
  };
  return await upsertSetting<ModuleState>('module_state', value, false);
}
