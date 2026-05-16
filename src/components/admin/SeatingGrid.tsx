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
  'S': { bg: 'var(--color-performance-bg)', text: 'var(--color-performance-text)' },
  'A': { bg: 'var(--primary-light)', text: 'var(--primary-deep)' }, 
  'T': { bg: '#fef3c7', text: '#92400e' }, 
  'B': { bg: '#e0f2fe', text: '#075985' }, 
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

  // Compact Mode Detection
  const maxSeats = Math.max(...rowCounts, 0);
  const isCompact = maxSeats > 12;
  const seatSize = isCompact ? 50 : 84;
  const gridGap = isCompact ? 4 : 12;
  const fontSize = isCompact ? 'var(--font-size-xs)' : 'var(--font-size-sm)';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleDragStart = (e: React.DragEvent, profileId: string, sourceSeatKey?: string) => {
    e.dataTransfer.setData('profileId', profileId);
    if (sourceSeatKey) {
      e.dataTransfer.setData('sourceSeatKey', sourceSeatKey);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetSeatKey: string) => {
    e.preventDefault();
    const profileId = e.dataTransfer.getData('profileId');
    if (!profileId) return;
    await onAssign(targetSeatKey, profileId);
  };

  return (
    <div className="flex-col grid-print" style={{ gap: 'var(--space-lg)', alignItems: 'center', width: '100%', overflowX: 'auto', padding: 'var(--space-md)' }}>
      {rowCounts.map((seatCount, rowIndex) => (
        <div key={rowIndex} className="row-print" style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center',
          gap: `${gridGap}px`, 
          justifyContent: 'center', 
          minWidth: 'max-content' 
        }}>
          <div className="text-xs text-muted" style={{ width: isCompact ? '50px' : '72px', fontWeight: 700, textAlign: 'right', paddingRight: 'var(--space-md)' }}>
            Row {rowIndex + 1}
          </div>
          {Array.from({ length: seatCount }).map((_, seatIndex) => {
            const seatKey = `${rowIndex}-${seatIndex}`;
            const suggestion = suggestions[seatKey];
            const profileId = assignments[seatKey];
            const assignedProfile = profileId ? profileMap[profileId] : null;
            const colors = suggestion ? SECTION_COLORS[suggestion] : { bg: 'var(--bg)', text: 'var(--text-muted)' };

            // Wedge Outline Logic
            const leftSuggestion = seatIndex > 0 ? suggestions[`${rowIndex}-${seatIndex - 1}`] : null;
            const rightSuggestion = seatIndex < seatCount - 1 ? suggestions[`${rowIndex}-${seatIndex + 1}`] : null;
            
            const hasLeftBorder = suggestion !== leftSuggestion;
            const hasRightBorder = suggestion !== rightSuggestion;

            return (
              <div 
                key={seatKey} 
                onDragOver={(e) => !isReadOnly && e.preventDefault()}
                onDrop={(e) => !isReadOnly && handleDrop(e, seatKey)}
                draggable={!isReadOnly && !!assignedProfile}
                onDragStart={(e) => !isReadOnly && assignedProfile && handleDragStart(e, assignedProfile.id, seatKey)}
                title={assignedProfile ? `${assignedProfile.name} (${assignedProfile.voicePart})` : `Empty Seat ${suggestion}${seatIndex + 1}`}
                className="flex-col"
                style={{ 
                  width: `${seatSize}px`, 
                  height: `${seatSize}px`, 
                  backgroundColor: colors.bg,
                  borderTop: `1px solid ${profileId ? colors.text : 'var(--border)'}`,
                  borderBottom: `1px solid ${profileId ? colors.text : 'var(--border)'}`,
                  borderLeft: hasLeftBorder ? `3px solid ${colors.text}` : `1px solid ${profileId ? colors.text : 'var(--border)'}`,
                  borderRight: hasRightBorder ? `3px solid ${colors.text}` : `1px solid ${profileId ? colors.text : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: fontSize,
                  position: 'relative',
                  cursor: isReadOnly ? 'default' : (assignedProfile ? 'grab' : 'pointer'),
                  boxShadow: profileId ? 'var(--shadow-sm)' : 'none',
                  flexShrink: 0,
                  gap: 0
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
                    
                    {suggestion && (
                      <optgroup label={`Recommended (${suggestion})`}>
                        {activeProfiles
                          .filter(p => !assignedProfileIds.has(p.id) || p.id === profileId)
                          .filter(p => p.voicePart[0] === suggestion)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.voicePart})</option>
                          ))
                        }
                      </optgroup>
                    )}

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
                
                <div className="text-xs" style={{ fontWeight: 700, color: colors.text, opacity: 0.6 }}>
                  {suggestion}{seatIndex + 1}
                </div>
                {assignedProfile ? (
                  <div className="flex-col" style={{ gap: 0, alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: isCompact ? 'var(--font-size-xs)' : 'var(--font-size-label)', color: colors.text, lineHeight: 1.1 }}>
                      {isCompact ? getInitials(assignedProfile.name) : assignedProfile.name.split(' ').pop()}
                    </div>
                    <div className="text-xs" style={{ fontWeight: 600, color: colors.text, opacity: 0.8 }}>
                      {assignedProfile.voicePart}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted text-xs" style={{ opacity: 0.5 }}>{isCompact ? '—' : 'Empty'}</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
