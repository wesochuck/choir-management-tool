import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';

interface RosterSummaryProps {
  profiles: Profile[];
}

const VOICE_PARTS = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as const;
const SECTIONS = ['S', 'A', 'T', 'B'] as const;

import { AppCard } from '../common/AppCard';

export const RosterSummary: React.FC<RosterSummaryProps> = ({ profiles }) => {
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
    >
      {/* Section Subtotals */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 'var(--space-md)',
        paddingBottom: 'var(--space-lg)',
        borderBottom: '1px solid var(--border)'
      }}>
        {SECTIONS.map(sec => (
          <div key={sec} className="flex-col" style={{ 
            textAlign: 'center', 
            padding: 'var(--space-md)', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--primary-light)',
            gap: 'var(--space-xs)'
          }}>
            <div className="text-xs" style={{ color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {sec === 'S' ? 'Sopranos' : sec === 'A' ? 'Altos' : sec === 'T' ? 'Tenors' : 'Basses'}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-deep)', lineHeight: 1 }}>{sectionCounts[sec]}</div>
          </div>
        ))}
      </div>

      {/* Individual Part Breakdowns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
        gap: 'var(--space-sm)' 
      }}>
        {VOICE_PARTS.map(part => (
          <div key={part} className="flex-col" style={{ 
            textAlign: 'center', 
            padding: 'var(--space-sm)', 
            borderRadius: 'var(--radius-sm)', 
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            gap: '2px'
          }}>
            <div className="text-xs text-muted" style={{ fontWeight: 700 }}>{part}</div>
            <div className="text-label" style={{ fontWeight: 700 }}>{partCounts[part]}</div>
          </div>
        ))}
      </div>
    </AppCard>
  );
};
