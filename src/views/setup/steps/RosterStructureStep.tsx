import React, { useState, useEffect } from 'react';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError, pb } from '../../../lib/pocketbase';
import { settingsService } from '../../../services/settingsService';
import { setupService } from '../../../services/setupService';
import { PRESETS } from '../../../lib/setupPresets';
import { SectionBucketEditor } from '../../../components/admin/SectionBucketEditor';
import { VoicePartEditor } from '../../../components/admin/VoicePartEditor';
import type { SectionDef, VoicePartDef } from '../../../services/settingsService';

interface RosterStructureStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
  ownerIsPerformer: boolean;
}

export const RosterStructureStep: React.FC<RosterStructureStepProps> = ({
  onSuccess,
  refreshStatus,
  ownerIsPerformer,
}) => {
  const [presetKey, setPresetKey] = useState<'choir' | 'band' | 'other'>('choir');
  const [performerLabel, setPerformerLabel] = useState(() => PRESETS.choir.performerLabel);
  const [sections, setSections] = useState<SectionDef[]>(() =>
    PRESETS.choir.sections.map((s) => ({ ...s, trackOnly: false }))
  );
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>(() => PRESETS.choir.voiceParts);
  const [ownerVoicePart, setOwnerVoicePart] = useState('');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  // Load preset defaults on first render or when preset type changes
  useEffect(() => {
    const selected = PRESETS[presetKey];
    setPerformerLabel(selected.performerLabel);
    setSections(selected.sections.map((s) => ({ ...s, trackOnly: false })));
    setVoiceParts(selected.voiceParts);
    setOwnerVoicePart('');
  }, [presetKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validation checks
      if (sections.some((s) => s.code.trim() === '' || s.name.trim() === '')) {
        throw new Error('All section buckets must have a valid code and name.');
      }
      if (
        voiceParts.some(
          (vp) =>
            vp.label.trim() === '' || vp.fullName.trim() === '' || vp.sectionCode.trim() === ''
        )
      ) {
        throw new Error(
          'All voice parts/instruments must have a label, full name, and assigned section.'
        );
      }

      // Check contrasted eligibility: at least one non-track-only part is required when roster is enabled
      const activeSectionCodes = sections.filter((s) => !s.trackOnly).map((s) => s.code);
      const activeParts = voiceParts.filter(
        (vp) => activeSectionCodes.includes(vp.sectionCode) && vp.label.trim() !== ''
      );
      if (activeParts.length === 0) {
        throw new Error(
          'At least one performing (non-track-only) part is required when Roster is enabled.'
        );
      }

      if (ownerIsPerformer) {
        if (!ownerVoicePart) {
          throw new Error('Please select your performing part / instrument.');
        }
        // Verify owner's voice part is in active performing parts
        const isValidPart = activeParts.some((p) => p.label === ownerVoicePart);
        if (!isValidPart) {
          throw new Error('Selected part must be a valid, performing (non-track-only) part.');
        }
      }

      // 2. Save configurations
      await settingsService.saveVoicePartsAndSections(voiceParts, sections);
      await settingsService.savePerformerLabel(performerLabel);

      // 3. If owner is performer, find profile and save voicePart
      if (ownerIsPerformer) {
        const ownerUserId = pb.authStore.model?.id;
        if (!ownerUserId) {
          throw new Error('The owner account is not available. Please sign in again.');
        }
        const profileList = await pb.collection('profiles').getList(1, 1, {
          filter: pb.filter('user = {:userId}', { userId: ownerUserId }),
        });
        const ownerProfile = profileList.items[0];
        if (!ownerProfile) {
          throw new Error('The owner profile could not be found. Please sign in again.');
        }
        await pb.collection('profiles').update(ownerProfile.id, {
          voicePart: ownerVoicePart,
        });
      }

      // 4. Save progress
      await setupService.saveProgress(
        ['admin-account', 'organization-basics', 'module-selection', 'roster-structure'],
        ownerIsPerformer,
        ownerIsPerformer
      );

      await refreshStatus();
      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Validation Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Preset Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Choose Preset Type
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => {
            const preset = PRESETS[key];
            const isSelected = presetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPresetKey(key)}
                className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/5'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <span
                  className={`text-sm font-semibold ${isSelected ? 'text-teal-400' : 'text-slate-200'}`}
                >
                  {preset.label}
                </span>
                <span className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Performer Label */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Performer Role Label
        </label>
        <p className="text-xs text-slate-400">
          How should performing members be labeled in the interface (e.g. Singer, Musician,
          Performer)?
        </p>
        <div className="mt-2 max-w-xs">
          <input
            type="text"
            value={performerLabel}
            onChange={(e) => setPerformerLabel(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            placeholder="Role Label"
          />
        </div>
      </div>

      {/* 3. Section Buckets Editor */}
      <SectionBucketEditor
        configSections={sections}
        setConfigSections={setSections}
        configVoiceParts={voiceParts}
      />

      {/* 4. Voice Parts / Instruments Editor */}
      <VoicePartEditor
        configSections={sections}
        configVoiceParts={voiceParts}
        setConfigVoiceParts={setVoiceParts}
        allProfiles={[]}
        setActiveTab={() => {}}
        setFilter={
          (() => {}) as unknown as {
            (key: 'status', value: string): void;
            (key: 'name', value: string): void;
            (key: 'voiceParts', value: string[]): void;
          }
        }
      />

      {/* 5. Owner Performing Assignment */}
      {ownerIsPerformer && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Your Voice Part / Instrument
          </label>
          <p className="text-xs text-slate-400">
            As you indicated you are a performing member, please select your primary part:
          </p>
          <div className="mt-2 max-w-xs">
            <select
              value={ownerVoicePart}
              onChange={(e) => setOwnerVoicePart(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- Select a Part --</option>
              {voiceParts
                .filter((vp) => vp.label.trim() !== '')
                .map((vp, idx) => (
                  <option key={idx} value={vp.label}>
                    {vp.fullName || vp.label} ({vp.sectionCode})
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      <SetupNavigation nextLabel="Save & Continue" loading={loading} />
    </form>
  );
};
