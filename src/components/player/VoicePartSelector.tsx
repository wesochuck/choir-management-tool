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
    <div className="voice-part-selector">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`vp-btn ${selectedPart === opt.value ? 'active' : ''}`}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
