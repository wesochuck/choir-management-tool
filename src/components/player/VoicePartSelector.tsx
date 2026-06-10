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
  onSelect 
}) => {
  // Always include Tutti as the first option
  const options = [
    { label: 'Tutti', value: 'tutti' },
    ...voiceParts.map(vp => ({ label: vp.label, value: vp.label.toLowerCase() }))
  ];

  return (
    <div className="flex gap-2 flex-wrap mb-6 justify-center">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer transition-all ${
            selectedPart === opt.value
              ? 'bg-primary text-surface border-primary shadow-md'
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
