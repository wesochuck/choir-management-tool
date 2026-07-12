export type SetupStatusName = 'unclaimed' | 'in_progress' | 'initialized' | 'recovery_required';

export interface PersistedSetupState {
  version: 1;
  initialized: boolean;
  completedSections: string[];
  ownerIsPerformer?: boolean;
  ownerVoicePartSet?: boolean;
}

export interface PublicSetupStatus {
  state: SetupStatusName;
  initialized: boolean;
  completedSections: string[];
  ownerIsPerformer?: boolean;
  ownerVoicePartSet?: boolean;
}
