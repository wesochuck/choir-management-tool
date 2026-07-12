export type SetupStatusName = 'unclaimed' | 'in_progress' | 'initialized' | 'recovery_required';

export interface PersistedSetupState {
  version: 1;
  initialized: boolean;
  completedSections: string[];
}

export interface PublicSetupStatus {
  state: SetupStatusName;
  initialized: boolean;
}
