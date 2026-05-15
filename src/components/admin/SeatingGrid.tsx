import React from 'react';
import { type Profile } from '../../services/profileService';
import { type VoicePart } from '../../services/seatingService';

interface SeatingGridProps {
  rowCounts: number[];
  assignments: Record<string, string>;
  suggestions: Record<string, VoicePart>;
  activeProfiles: Profile[];
  onAssign: (seatKey: string, profileId: string) => Promise<void>;
  isReadOnly?: boolean;
}

const SECTION_COLORS: Record<string, { bg: string, text: string }> = {
  'S': { bg: '#fed7d7', text: '#9b2c2c' }, // Red-ish
  'A': { bg: '#ebf8ff', text: '#2c5282' }, // Blue-ish
  'T': { bg: '#feebc8', text: '#9c4221' }, // Orange-ish
  'B': { bg: '#e6fffa', text: '#2c7a7b' }, // Green-ish
};

export const SeatingGrid: React.FC<SeatingGridProps> = ({ 
  rowCounts, assignments, suggestions, activeProfiles, onAssign, isReadOnly = false 
}) => {
  const profileMap = React.useMemo(() => {
    const map: Record<string, Profile> = {};
    activeProfiles.forEach(p => map[p.id] = p);
    return map;
  }, [activeProfiles]);

  const assignedProfileIds = new Set(Object.values(assignments));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', padding: '20px' }}>
      {rowCounts.map((seatCount, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <div style={{ width: '60px', display: 'flex', alignItems: 'center', color: '#718096', fontWeight: 'bold' }}>
            Row {rowIndex + 1}
          </div>
          {Array.from({ length: seatCount }).map((_, seatIndex) => {
            const seatKey = `${rowIndex}-${seatIndex}`;
            const suggestion = suggestions[seatKey];
            const profileId = assignments[seatKey];
            const assignedProfile = profileId ? profileMap[profileId] : null;
            const colors = suggestion ? SECTION_COLORS[suggestion] : { bg: '#edf2f7', text: '#4a5568' };

            return (
              <div 
                key={seatKey} 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: colors.bg,
                  border: `2px solid ${profileId ? colors.text : 'transparent'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '11px',
                  position: 'relative',
                  cursor: isReadOnly ? 'default' : 'pointer',
                  boxShadow: profileId ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {!isReadOnly && (
                  <select 
                    value={profileId || ''} 
                    onChange={(e) => onAssign(seatKey, e.target.value)}
                    style={{ 
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                      opacity: 0, cursor: 'pointer' 
                    }}
                  >
                    <option value="">-- Assign --</option>
                    <option value="">(Empty)</option>
                    
                    {/* Suggested Section first */}
                    {suggestion && (
                      <optgroup label={`Recommended (${suggestion})`}>
                        {activeProfiles
                          .filter(p => !assignedProfileIds.has(p.id) || p.id === profileId)
                          .filter(p => p.voicePart[0] === suggestion)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        }
                      </optgroup>
                    )}

                    {/* Other Sections */}
                    <optgroup label="Other Sections">
                      {activeProfiles
                        .filter(p => !assignedProfileIds.has(p.id) || p.id === profileId)
                        .filter(p => p.voicePart[0] !== suggestion)
                        .sort((a, b) => a.voicePart.localeCompare(b.voicePart))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.voicePart})</option>
                        ))
                      }
                    </optgroup>
                  </select>
                )}
                
                <div style={{ fontWeight: 'bold', color: colors.text }}>{suggestion} {seatIndex + 1}</div>
                {assignedProfile ? (
                  <div style={{ marginTop: '4px', fontWeight: '800', lineHeight: '1.1' }}>
                    {assignedProfile.name.split(' ').pop()}
                  </div>
                ) : (
                  <div style={{ color: '#a0aec0', fontSize: '10px' }}>Empty</div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* High-Legibility Print Version (Hidden on screen) */}
      <div className="print-only" style={{ display: 'none', width: '100%' }}>
         {rowCounts.map((seatCount, rowIndex) => (
             <div key={rowIndex} style={{ marginBottom: '10px', fontSize: '16px' }}>
                <strong>Row {rowIndex + 1}:</strong> {' '}
                {Array.from({ length: seatCount }).map((_, seatIndex) => {
                    const profileId = assignments[`${rowIndex}-${seatIndex}`];
                    const profile = profileId ? profileMap[profileId] : null;
                    return profile ? `${profile.name}${seatIndex < seatCount - 1 ? ', ' : ''}` : `[Empty]${seatIndex < seatCount - 1 ? ', ' : ''}`;
                })}
             </div>
         ))}
      </div>

      <style>{`
        @media print {
            @page { size: landscape; }
            body * { visibility: hidden; }
            .print-only, .print-only * { visibility: visible; }
            .print-only { 
                display: block !important; 
                position: absolute; 
                left: 0; 
                top: 0; 
                padding: 40px;
                color: black;
            }
        }
      `}</style>
    </div>
  );
};
