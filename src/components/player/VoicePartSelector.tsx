import React from 'react';
import type { VoicePartDef } from '../../services/settingsService';

interface VoicePartSelectorProps {
  voiceParts: VoicePartDef[];
  selectedPart: string;
  onSelect: (part: string) => void;
}

export const VoicePartSelector: React.FC<VoicePartSelectorProps> = ({
  voiceParts,
  selectedPart,
  onSelect,
}) => {
  // Always include Tutti as the first option
  const options = [
    { label: 'Tutti', value: 'tutti' },
    ...voiceParts.map((vp) => ({ label: vp.label, value: vp.label.toLowerCase() })),
  ];

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
            selectedPart === opt.value
              ? 'border-primary bg-primary text-surface shadow-md'
              : 'border-border bg-primary-light text-text-muted hover:bg-border hover:text-text'
          }`}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
