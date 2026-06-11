import { RosterDisplayOptionsSettings } from './RosterDisplayOptionsSettings';
import { StatusAutomationSettings } from './StatusAutomationSettings';
import { SeasonManagementSettings } from './SeasonManagementSettings';
import { SectionBucketEditor } from './SectionBucketEditor';
import { VoicePartEditor } from './VoicePartEditor';
import { FloatingSaveBar } from './FloatingSaveBar';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import type { Profile } from '../../services/profileService';

interface RosterSettingsTabProps {
  configMessage: string;
  configDefaultStatus: string;
  setConfigDefaultStatus: (value: string) => void;
  configSeason: string;
  setConfigSeason: (value: string) => void;
  configAutomationEnabled: boolean;
  setConfigAutomationEnabled: (value: boolean) => void;
  configAutomationMissThreshold: number;
  setConfigAutomationMissThreshold: (value: number) => void;
  configAutomationRecoveryEnabled: boolean;
  setConfigAutomationRecoveryEnabled: (value: boolean) => void;
  configMaxRehearsalMisses: number;
  setConfigMaxRehearsalMisses: (value: number) => void;
  configSections: SectionDef[];
  setConfigSections: (sections: SectionDef[]) => void;
  configVoiceParts: VoicePartDef[];
  setConfigVoiceParts: (voiceParts: VoicePartDef[]) => void;
  isSavingConfig: boolean;
  isConfigDirty: boolean;
  activeColorPickerIndex: number | null;
  setActiveColorPickerIndex: (index: number | null) => void;
  handleConfigSave: () => Promise<void>;
  handleConfigDiscard: () => void;
  allProfiles: Profile[];
  setActiveTab: (tab: 'roster' | 'config') => void;
  setFilter: {
    (key: 'status', value: string): void;
    (key: 'name', value: string): void;
    (key: 'voiceParts', value: string[]): void;
  };
}

export function RosterSettingsTab({
  configMessage,
  configDefaultStatus,
  setConfigDefaultStatus,
  configSeason,
  setConfigSeason,
  configAutomationEnabled,
  setConfigAutomationEnabled,
  configAutomationMissThreshold,
  setConfigAutomationMissThreshold,
  configAutomationRecoveryEnabled,
  setConfigAutomationRecoveryEnabled,
  configMaxRehearsalMisses,
  setConfigMaxRehearsalMisses,
  configSections,
  setConfigSections,
  configVoiceParts,
  setConfigVoiceParts,
  isSavingConfig,
  isConfigDirty,
  activeColorPickerIndex,
  setActiveColorPickerIndex,
  handleConfigSave,
  handleConfigDiscard,
  allProfiles,
  setActiveTab,
  setFilter,
}: RosterSettingsTabProps) {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {configMessage && (
        <div 
          className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-300 self-start ${
            configMessage.startsWith('Error') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {configMessage}
        </div>
      )}

      <RosterDisplayOptionsSettings
        configDefaultStatus={configDefaultStatus}
        setConfigDefaultStatus={setConfigDefaultStatus}
      />

      <StatusAutomationSettings
        configAutomationEnabled={configAutomationEnabled}
        setConfigAutomationEnabled={setConfigAutomationEnabled}
        configAutomationMissThreshold={configAutomationMissThreshold}
        setConfigAutomationMissThreshold={setConfigAutomationMissThreshold}
        configAutomationRecoveryEnabled={configAutomationRecoveryEnabled}
        setConfigAutomationRecoveryEnabled={setConfigAutomationRecoveryEnabled}
        configMaxRehearsalMisses={configMaxRehearsalMisses}
        setConfigMaxRehearsalMisses={setConfigMaxRehearsalMisses}
      />

      <SeasonManagementSettings
        configSeason={configSeason}
        setConfigSeason={setConfigSeason}
      />

      <SectionBucketEditor
        configSections={configSections}
        setConfigSections={setConfigSections}
        configVoiceParts={configVoiceParts}
        activeColorPickerIndex={activeColorPickerIndex}
        setActiveColorPickerIndex={setActiveColorPickerIndex}
      />

      <VoicePartEditor
        configVoiceParts={configVoiceParts}
        setConfigVoiceParts={setConfigVoiceParts}
        configSections={configSections}
        allProfiles={allProfiles}
        setActiveTab={setActiveTab}
        setFilter={setFilter}
      />

      <FloatingSaveBar 
        isDirty={isConfigDirty} 
        isSaving={isSavingConfig} 
        onSave={handleConfigSave} 
        onDiscard={handleConfigDiscard} 
      />
    </div>
  );
}
