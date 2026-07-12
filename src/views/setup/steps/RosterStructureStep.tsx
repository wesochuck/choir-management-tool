import React, { useState } from 'react';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import { settingsService } from '../../../services/settingsService';
import { setupService } from '../../../services/setupService';
import type { VoicePartSettings } from '../../../services/settings/seatingSettings';

const PRESETS: Record<string, { label: string; description: string; config: VoicePartSettings }> = {
  satb: {
    label: 'SATB (Soprano, Alto, Tenor, Bass)',
    description:
      'Standard mixed choir structure with four main sections, each split into two parts.',
    config: {
      sections: [
        { code: 'S', name: 'Sopranos', color: '#1b4d3e', colorBg: '#d1fae5', colorText: '#065f46' },
        { code: 'A', name: 'Altos', color: '#4a7c59', colorBg: '#ecfdf5', colorText: '#047857' },
        { code: 'T', name: 'Tenors', color: '#92400e', colorBg: '#fef3c7', colorText: '#92400e' },
        { code: 'B', name: 'Basses', color: '#075985', colorBg: '#e0f2fe', colorText: '#075985' },
      ],
      voiceParts: [
        { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
        { label: 'S2', fullName: 'Soprano 2', sectionCode: 'S' },
        { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
        { label: 'A2', fullName: 'Alto 2', sectionCode: 'A' },
        { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' },
        { label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' },
        { label: 'B1', fullName: 'Bass 1', sectionCode: 'B' },
        { label: 'B2', fullName: 'Bass 2', sectionCode: 'B' },
      ],
    },
  },
  ssaa: {
    label: 'SSAA (Soprano 1, Soprano 2, Alto 1, Alto 2)',
    description: 'Treble choir structure focusing on upper voice ranges.',
    config: {
      sections: [
        { code: 'S', name: 'Sopranos', color: '#1b4d3e', colorBg: '#d1fae5', colorText: '#065f46' },
        { code: 'A', name: 'Altos', color: '#4a7c59', colorBg: '#ecfdf5', colorText: '#047857' },
      ],
      voiceParts: [
        { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
        { label: 'S2', fullName: 'Soprano 2', sectionCode: 'S' },
        { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
        { label: 'A2', fullName: 'Alto 2', sectionCode: 'A' },
      ],
    },
  },
  ttbb: {
    label: 'TTBB (Tenor 1, Tenor 2, Baritone, Bass)',
    description: 'Tenor-bass choir structure focusing on lower voice ranges.',
    config: {
      sections: [
        { code: 'T', name: 'Tenors', color: '#92400e', colorBg: '#fef3c7', colorText: '#92400e' },
        { code: 'B', name: 'Basses', color: '#075985', colorBg: '#e0f2fe', colorText: '#075985' },
      ],
      voiceParts: [
        { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' },
        { label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' },
        { label: 'Bar', fullName: 'Baritone', sectionCode: 'B' },
        { label: 'B1', fullName: 'Bass 1', sectionCode: 'B' },
      ],
    },
  },
  custom: {
    label: 'Simple / Custom Layout',
    description: 'A single generic section without voice part subdivisions.',
    config: {
      sections: [
        {
          code: 'ALL',
          name: 'Singers',
          color: '#475569',
          colorBg: '#f1f5f9',
          colorText: '#475569',
        },
      ],
      voiceParts: [{ label: 'Singer', fullName: 'Singer', sectionCode: 'ALL' }],
    },
  },
};

interface RosterStructureStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
}

export const RosterStructureStep: React.FC<RosterStructureStepProps> = ({
  onSuccess,
  refreshStatus,
}) => {
  const [selected, setSelected] = useState<string>('satb');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const preset = PRESETS[selected];
      await settingsService.saveVoicePartsAndSections(
        preset.config.voiceParts,
        preset.config.sections
      );

      // Save progress
      await setupService.saveProgress([
        'admin-account',
        'organization-basics',
        'module-selection',
        'roster-structure',
      ]);

      await refreshStatus();
      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Preset Save Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Choose a preset roster structure that matches your choir's voice sections. This
          initializes voice parts for member management.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(PRESETS).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 text-left transition-all ${
                selected === key
                  ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/5'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <span
                className={`text-sm font-semibold ${selected === key ? 'text-teal-400' : 'text-slate-200'}`}
              >
                {value.label}
              </span>
              <span className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {value.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <SetupNavigation nextLabel="Save & Continue" loading={loading} />
    </form>
  );
};
