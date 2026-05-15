import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';

interface RosterSummaryProps {
  profiles: Profile[];
}

const VOICE_PARTS = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as const;

export const RosterSummary: React.FC<RosterSummaryProps> = ({ profiles }) => {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    VOICE_PARTS.forEach(part => map[part] = 0);
    profiles.forEach(p => {
      if (p.voicePart && map[p.voicePart] !== undefined) {
        map[p.voicePart]++;
      }
    });
    return map;
  }, [profiles]);

  const total = profiles.length;

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      borderRadius: '12px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#2d3748' }}>Voice Part Balance</h3>
        <span style={{ fontSize: '14px', color: '#718096', fontWeight: 'bold' }}>Total: {total} Singers</span>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
        gap: '12px' 
      }}>
        {VOICE_PARTS.map(part => (
          <div key={part} style={{ 
            textAlign: 'center', 
            padding: '12px 8px', 
            borderRadius: '8px', 
            backgroundColor: '#f7fafc',
            border: '1px solid #edf2f7'
          }}>
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>{part}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>{counts[part]}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
