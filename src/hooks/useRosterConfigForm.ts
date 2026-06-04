import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  settingsService, 
  getVoicePartsAndSections, 
  saveVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef
} from '../services/settingsService';
import { calculateSettingsDirty } from '../lib/settings/dirtyCheck';

export interface RosterConfigState {
  defaultStatus: string;
  currentSeason: string;
  statusAutomationEnabled: boolean;
  statusAutomationMissThreshold: number;
  statusAutomationRecoveryEnabled: boolean;
  maxRehearsalMisses: number;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
}

export function validateRosterConfig(config: { sections: SectionDef[]; voiceParts: VoicePartDef[] }): string | null {
  const { sections, voiceParts } = config;

  // Validate Sections
  const seenSectionCodes = new Set<string>();
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const code = sec.code.trim().toUpperCase();
    const name = sec.name.trim();
    
    if (!code) {
      return 'Error: Section bucket code cannot be empty.';
    }
    if (seenSectionCodes.has(code)) {
      return `Error: Duplicate section bucket code "${code}".`;
    }
    seenSectionCodes.add(code);
    if (!name) {
      return `Error: Section bucket "${code}" name cannot be empty.`;
    }
  }

  // Validate Voice Parts
  const seenPartLabels = new Set<string>();
  for (let i = 0; i < voiceParts.length; i++) {
    const vp = voiceParts[i];
    const label = vp.label.trim();
    const fullName = vp.fullName.trim();
    const secCode = vp.sectionCode.trim().toUpperCase();

    if (!label) {
      return 'Error: Voice part label cannot be empty.';
    }
    if (seenPartLabels.has(label)) {
      return `Error: Duplicate voice part label "${label}".`;
    }
    seenPartLabels.add(label);
    if (!fullName) {
      return `Error: Voice part "${label}" full name cannot be empty.`;
    }
    if (secCode && !seenSectionCodes.has(secCode)) {
      return `Error: Voice part "${label}" belongs to unknown section bucket "${secCode}".`;
    }
  }

  return null;
}

export interface UseRosterConfigFormOptions {
  setFilter: {
    (key: 'status', value: string): void;
    (key: 'name', value: string): void;
    (key: 'voiceParts', value: string[]): void;
  };
  refreshRoster: () => Promise<void>;
  refreshVoiceParts: () => Promise<void>;
}

export function useRosterConfigForm({
  setFilter,
  refreshRoster,
  refreshVoiceParts,
}: UseRosterConfigFormOptions) {
  const [configDefaultStatus, setConfigDefaultStatus] = useState('');
  const [configSeason, setConfigSeason] = useState('');
  const [configSections, setConfigSections] = useState<SectionDef[]>([]);
  const [configVoiceParts, setConfigVoiceParts] = useState<VoicePartDef[]>([]);
  const [configAutomationEnabled, setConfigAutomationEnabled] = useState(true);
  const [configAutomationMissThreshold, setConfigAutomationMissThreshold] = useState(3);
  const [configAutomationRecoveryEnabled, setConfigAutomationRecoveryEnabled] = useState(true);
  const [configMaxRehearsalMisses, setConfigMaxRehearsalMisses] = useState(3);
  const [initialConfigState, setInitialConfigState] = useState<RosterConfigState | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [activeColorPickerIndex, setActiveColorPickerIndex] = useState<number | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const rosterSettings = await settingsService.getRosterSettings();
      const voiceSettings = await getVoicePartsAndSections();
      
      const loadedDefaultStatus = rosterSettings?.defaultStatus || '';
      const loadedSeason = rosterSettings?.currentSeason || '';
      const loadedSections = voiceSettings.sections || [];
      const loadedVoiceParts = voiceSettings.voiceParts || [];
      const loadedAutomationEnabled = rosterSettings?.statusAutomationEnabled ?? true;
      const loadedAutomationMissThreshold = rosterSettings?.statusAutomationMissThreshold ?? 3;
      const loadedAutomationRecoveryEnabled = rosterSettings?.statusAutomationRecoveryEnabled ?? true;
      const loadedMaxRehearsalMisses = rosterSettings?.maxRehearsalMisses ?? 3;

      setConfigDefaultStatus(loadedDefaultStatus);
      setConfigSeason(loadedSeason);
      setConfigSections(loadedSections);
      setConfigVoiceParts(loadedVoiceParts);
      setConfigAutomationEnabled(loadedAutomationEnabled);
      setConfigAutomationMissThreshold(loadedAutomationMissThreshold);
      setConfigAutomationRecoveryEnabled(loadedAutomationRecoveryEnabled);
      setConfigMaxRehearsalMisses(loadedMaxRehearsalMisses);

      setInitialConfigState({
        defaultStatus: loadedDefaultStatus,
        currentSeason: loadedSeason,
        statusAutomationEnabled: loadedAutomationEnabled,
        statusAutomationMissThreshold: loadedAutomationMissThreshold,
        statusAutomationRecoveryEnabled: loadedAutomationRecoveryEnabled,
        maxRehearsalMisses: loadedMaxRehearsalMisses,
        sections: JSON.parse(JSON.stringify(loadedSections)),
        voiceParts: JSON.parse(JSON.stringify(loadedVoiceParts))
      });
    } catch (err) {
      console.error('Failed to load configuration:', err);
    }
  }, []);

  useEffect(() => {
    settingsService.getRosterSettings().then(settings => {
      if (settings && settings.defaultStatus !== undefined) {
        setFilter('status', settings.defaultStatus);
      }
    }).catch(err => {
      console.error('Failed to load roster settings:', err);
    });

    loadConfig();
  }, [setFilter, loadConfig]);

  const isConfigDirty = useMemo(() => {
    if (!initialConfigState) return false;
    return calculateSettingsDirty(initialConfigState, {
      defaultStatus: configDefaultStatus,
      currentSeason: configSeason,
      statusAutomationEnabled: configAutomationEnabled,
      statusAutomationMissThreshold: configAutomationMissThreshold,
      statusAutomationRecoveryEnabled: configAutomationRecoveryEnabled,
      maxRehearsalMisses: configMaxRehearsalMisses,
      sections: configSections,
      voiceParts: configVoiceParts
    });
  }, [
    initialConfigState,
    configDefaultStatus,
    configSeason,
    configAutomationEnabled,
    configAutomationMissThreshold,
    configAutomationRecoveryEnabled,
    configMaxRehearsalMisses,
    configSections,
    configVoiceParts
  ]);

  const handleConfigSave = async () => {
    setIsSavingConfig(true);
    setConfigMessage('');

    const validationError = validateRosterConfig({
      sections: configSections,
      voiceParts: configVoiceParts
    });

    if (validationError) {
      setConfigMessage(validationError);
      setIsSavingConfig(false);
      return;
    }

    try {
      const rosterSettings = await settingsService.getRosterSettings();
      await settingsService.saveRosterSettings({
        ...rosterSettings,
        defaultStatus: configDefaultStatus,
        currentSeason: configSeason,
        statusAutomationEnabled: configAutomationEnabled,
        statusAutomationMissThreshold: configAutomationMissThreshold,
        statusAutomationRecoveryEnabled: configAutomationRecoveryEnabled,
        maxRehearsalMisses: configMaxRehearsalMisses
      });
      await saveVoicePartsAndSections(configVoiceParts, configSections);

      // Refresh roster data & sections
      await refreshRoster();
      await refreshVoiceParts();

      // Reload config state
      await loadConfig();

      setConfigMessage('Configuration saved successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConfigMessage(`Error saving configuration: ${errMsg}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigDiscard = () => {
    if (!initialConfigState) return;
    setConfigDefaultStatus(initialConfigState.defaultStatus);
    setConfigSeason(initialConfigState.currentSeason);
    setConfigAutomationEnabled(initialConfigState.statusAutomationEnabled);
    setConfigAutomationMissThreshold(initialConfigState.statusAutomationMissThreshold);
    setConfigAutomationRecoveryEnabled(initialConfigState.statusAutomationRecoveryEnabled);
    setConfigMaxRehearsalMisses(initialConfigState.maxRehearsalMisses ?? 3);
    setConfigSections(JSON.parse(JSON.stringify(initialConfigState.sections)));
    setConfigVoiceParts(JSON.parse(JSON.stringify(initialConfigState.voiceParts)));
    setConfigMessage('');
  };

  return {
    configDefaultStatus,
    setConfigDefaultStatus,
    configSeason,
    setConfigSeason,
    configSections,
    setConfigSections,
    configVoiceParts,
    setConfigVoiceParts,
    configAutomationEnabled,
    setConfigAutomationEnabled,
    configAutomationMissThreshold,
    setConfigAutomationMissThreshold,
    configAutomationRecoveryEnabled,
    setConfigAutomationRecoveryEnabled,
    configMaxRehearsalMisses,
    setConfigMaxRehearsalMisses,
    initialConfigState,
    isSavingConfig,
    configMessage,
    setConfigMessage,
    isConfigDirty,
    activeColorPickerIndex,
    setActiveColorPickerIndex,
    loadConfig,
    handleConfigSave,
    handleConfigDiscard,
  };
}
