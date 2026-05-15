import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';

interface RosterSummaryProps {
  profiles: Profile[];
}

const VOICE_PARTS = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as const;
const SECTIONS = ['S', 'A', 'T', 'B'] as const;

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
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      borderRadius: '12px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#2d3748' }}>Voice Part Balance</h3>
        <span style={{ 
          backgroundColor: '#3182ce', 
          color: 'white', 
          padding: '6px 14px', 
          borderRadius: '20px', 
          fontSize: '14px', 
          fontWeight: 'bold' 
        }}>
          Total: {total} Singers
        </span>
      </div>
      
      {/* Section Subtotals */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid #edf2f7'
      }}>
        {SECTIONS.map(sec => (
          <div key={sec} style={{ 
            textAlign: 'center', 
            padding: '12px', 
            borderRadius: '10px', 
            backgroundColor: '#ebf8ff',
            border: '1px solid #bee3f8'
          }}>
            <div style={{ fontSize: '14px', color: '#2c5282', fontWeight: 'bold', marginBottom: '4px' }}>
              {sec === 'S' ? 'Sopranos' : sec === 'A' ? 'Altos' : sec === 'T' ? 'Tenors' : 'Basses'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2a4365' }}>{sectionCounts[sec]}</div>
          </div>
        ))}
      </div>

      {/* Individual Part Breakdowns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
        gap: '12px' 
      }}>
        {VOICE_PARTS.map(part => (
          <div key={part} style={{ 
            textAlign: 'center', 
            padding: '10px 8px', 
            borderRadius: '8px', 
            backgroundColor: '#f7fafc',
            border: '1px solid #edf2f7'
          }}>
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', marginBottom: '2px' }}>{part}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>{partCounts[part]}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
