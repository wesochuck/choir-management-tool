import type { UserPreferences } from '../types/auth';

export function mergePreferences(current: UserPreferences | undefined | null, updates: Partial<UserPreferences>): UserPreferences {
  return { ...(current || {}), ...updates };
}
