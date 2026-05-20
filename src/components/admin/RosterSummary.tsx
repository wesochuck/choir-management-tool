import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';

interface RosterSummaryProps {
  profiles: Profile[];
  selectedVoiceParts?: string[];
  onVoicePartToggle?: (part: string) => void;
}

const VOICE_PARTS = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as const;
const SECTIONS = ['S', 'A', 'T', 'B'] as const;

import { AppCard } from '../common/AppCard';

export const RosterSummary: React.FC<RosterSummaryProps> = ({ 
  profiles, 
  selectedVoiceParts = [], 
  onVoicePartToggle 
}) => {
  const { partCounts, sectionCounts } = useMemo(() => {
    const pc: Record<string, number> = {};
    const sc: Record<string, number> = {};
    
    VOICE_PARTS.forEach(part => pc[part] = 0);
    SECTIONS.forEach(sec => sc[sec] = 0);

    profiles.forEach(p => {
      if (p.voicePart && pc[p.voicePart] !== undefined) {
        pc[p.voicePart]++;
        const section = p.voicePart[0]; // 'S', 'A', 'T', or 'B'
        if (sc[section] !== undefined) {
          sc[section]++;
        }
      }
    });
    
    return { partCounts: pc, sectionCounts: sc };
  }, [profiles]);

  const total = profiles.length;

  return (
    <AppCard 
      title="Voice Part Balance"
      actions={
        <span className="badge badge-rehearsal" style={{ fontSize: 'var(--font-size-label)', padding: '6px 16px', borderRadius: '20px' }}>
          Total: {total} Singers
        </span>
      }
      style={{ gap: 'var(--space-md)' }}
    >
      <style>{`
        .voice-section-card {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          border: 2px solid transparent;
        }
        .voice-section-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          opacity: 0.9;
        }
        .voice-section-card.selected {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 1px var(--primary);
        }
        .voice-part-card {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          border: 1px solid var(--border);
        }
        .voice-part-card:hover {
          border-color: var(--primary-deep);
          background-color: var(--primary-light) !important;
          transform: translateY(-1px);
        }
        .voice-part-card.selected {
          border-color: var(--primary) !important;
          background-color: var(--primary-light) !important;
        }
      `}</style>

      {/* Section Subtotals */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 'var(--space-md)',
        paddingBottom: 'var(--space-md)',
        borderBottom: '1px solid var(--border)'
      }}>
        {SECTIONS.map(sec => {
          const isSelected = selectedVoiceParts.includes(sec);
          return (
            <div 
              key={sec} 
              className={`flex-col voice-section-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onVoicePartToggle?.(sec)}
              style={{ 
                textAlign: 'center', 
                padding: 'calc(var(--space-md) - 2px)', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--primary-light)',
                gap: 'var(--space-xs)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: isSelected ? 'var(--primary)' : 'transparent'
              }}
            >
              <div className="text-xs" style={{ color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sec === 'S' ? 'Sopranos' : sec === 'A' ? 'Altos' : sec === 'T' ? 'Tenors' : 'Basses'}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-deep)', lineHeight: 1 }}>{sectionCounts[sec]}</div>
            </div>
          );
        })}
      </div>

      {/* Individual Part Breakdowns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
        gap: 'var(--space-sm)',
        marginTop: 0
      }}>
        {VOICE_PARTS.map(part => {
          const isSelected = selectedVoiceParts.includes(part);
          return (
            <div 
              key={part} 
              className={`flex-col voice-part-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onVoicePartToggle?.(part)}
              style={{ 
                textAlign: 'center', 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: 'var(--bg)',
                gap: '2px',
                borderStyle: 'solid',
                borderWidth: isSelected ? '2px' : '1px',
                padding: isSelected ? 'calc(var(--space-sm) - 1px)' : 'var(--space-sm)'
              }}
            >
              <div className="text-xs text-muted" style={{ fontWeight: 700 }}>{part}</div>
              <div className="text-label" style={{ fontWeight: 700 }}>{partCounts[part]}</div>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
};
