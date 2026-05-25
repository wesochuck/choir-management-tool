import React from 'react';
import { type Profile } from '../../services/profileService';
import { type SectionDef, type VoicePartDef } from '../../services/settingsService';
import { getUniqueDisplayNames, getLastName, getFirstName } from '../../lib/stringUtils';
import { useDialog } from '../../contexts/DialogContext';
import { removeSeatFromRow, removeRowAndShiftAssignments } from '../../lib/seatingSync';
import { isSectionMismatch } from '../../lib/voicePartUtils';

function getContrastColor(hex: string): string {
  if (!hex || hex.length < 6) return '#000000';
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

interface SeatingGridProps {
  rowCounts: number[];
  assignments: Record<string, string>;
  suggestions: Record<string, string>;
  activeProfiles: Profile[];
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  onAssign: (seatKey: string, profileId: string, fromSeatKey?: string) => Promise<void>;
  isReadOnly?: boolean;
  onUpdateRowCounts?: (newRowCounts: number[], newAssignments?: Record<string, string>) => Promise<void>;
}

export const SeatingGrid: React.FC<SeatingGridProps> = ({
  rowCounts, assignments, suggestions, activeProfiles, sections, voiceParts, onAssign, isReadOnly = false, onUpdateRowCounts
}) => {
  const dialog = useDialog();
  const formatNameLastFirst = React.useCallback((fullName: string): string => {
    const last = getLastName(fullName);
    const first = getFirstName(fullName);
    return first ? `${last}, ${first}` : last;
  }, []);
  const uniqueDisplayNames = React.useMemo(() => {
    return getUniqueDisplayNames(activeProfiles);
  }, [activeProfiles]);
  const totalSeats = React.useMemo(() => rowCounts.reduce((sum, count) => sum + count, 0), [rowCounts]);

  const profileMap = React.useMemo(() => {
    const map: Record<string, Profile> = {};
    activeProfiles.forEach(p => map[p.id] = p);
    return map;
  }, [activeProfiles]);

  const assignedProfileIds = new Set(Object.values(assignments));

  // Compact Mode Detection
  const maxSeats = Math.max(...rowCounts, 0);
  const isCompact = maxSeats > 12;
  const seatSize = isCompact ? 68 : 100;
  const gridGap = isCompact ? 6 : 12;
  const rowGap = isCompact ? 'var(--space-xs)' : 'var(--space-sm)';
  const containerPadding = isCompact ? 'var(--space-xs)' : 'var(--space-md)';
  const fontSize = isCompact ? 'var(--font-size-xs)' : 'var(--font-size-sm)';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const [activeDragOver, setActiveDragOver] = React.useState<string | null>(null);
  const [hoveredSeat, setHoveredSeat] = React.useState<string | null>(null);

  const getIsNeighbor = (hoveredKey: string | null, targetKey: string) => {
    if (!hoveredKey) return false;
    const [r1, s1] = hoveredKey.split('-').map(Number);
    const [r2, s2] = targetKey.split('-').map(Number);
    return r1 === r2 && Math.abs(s1 - s2) === 1;
  };

  const handleDragStart = (e: React.DragEvent, profileId: string, sourceSeatKey?: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ profileId, fromSeatKey: sourceSeatKey }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetSeatKey: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (!data.profileId) return;
      await onAssign(targetSeatKey, data.profileId, data.fromSeatKey);
    } catch {
      const profileId = e.dataTransfer.getData('profileId');
      if (profileId) {
        const sourceSeatKey = e.dataTransfer.getData('sourceSeatKey');
        await onAssign(targetSeatKey, profileId, sourceSeatKey || undefined);
      }
    }
  };

  return (
    <div className="grid-print" style={{ width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-col" style={{ gap: rowGap, alignItems: 'center', minWidth: 'max-content', padding: containerPadding }}>
        {/* Warning banner if not enough seats */}
        {activeProfiles.length > totalSeats && onUpdateRowCounts && (
          <div className="no-print" style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            width: '100%',
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--color-danger-text)',
            boxSizing: 'border-box'
          }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <strong style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Not enough seats configured!</strong>
            <span style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
              You have {activeProfiles.length} active singers but only {totalSeats} seats. Click the <strong style={{ color: 'var(--color-danger-text)' }}>+</strong> button at the end of any row to add seats.
            </span>
          </div>
        </div>
      )}

      {/* Add Row to Back Button */}
      {!isReadOnly && onUpdateRowCounts && (
        <button
          onClick={() => {
            const defaultSeats = 10;
            const newRowCounts = [...rowCounts, defaultSeats];
            onUpdateRowCounts(newRowCounts);
          }}
          className="btn btn-sm btn-ghost no-print"
          style={{
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-deep)',
            border: '1px dashed var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xs) var(--space-md)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: 'var(--space-xs)'
          }}
          title="Add a new row with 10 seats at the back"
        >
          ➕ Add Row to Back
        </button>
      )}

      {rowCounts.map((_, index) => {
        const rowIndex = rowCounts.length - 1 - index;
        const seatCount = rowCounts[rowIndex];
        const isFront = rowIndex === 0;
        const isBack = rowIndex === rowCounts.length - 1;
        const rowLabel = `Row ${rowIndex + 1}${isFront ? ' (Front)' : isBack ? ' (Back)' : ''}`;

        return (
          <div key={rowIndex} className="row-print" style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: `${gridGap}px`,
            justifyContent: 'center',
            minWidth: 'max-content'
          }}>
            <div className="text-xs text-muted" style={{ width: isCompact ? '75px' : '105px', fontWeight: 700, textAlign: 'right', paddingRight: 'var(--space-md)' }}>
              {rowLabel}
            </div>

            {/* "🗑️" remove row button */}
            {!isReadOnly && onUpdateRowCounts && (
              <button
                className="no-print btn btn-ghost"
                onClick={async () => {
                  const rowHasAssignments = Object.keys(assignments).some(key => key.startsWith(`${rowIndex}-`));
                  let shouldRemove = true;
                  if (rowHasAssignments) {
                    shouldRemove = await dialog.confirm({
                      title: 'Remove Row?',
                      message: `Row ${rowIndex + 1} has singer assignments. Removing the row will clear these assignments. Proceed?`,
                      confirmLabel: 'Remove Row',
                      cancelLabel: 'Cancel',
                      variant: 'danger'
                    });
                  }

                  if (shouldRemove) {
                    const result = removeRowAndShiftAssignments(rowCounts, rowIndex, assignments);
                    onUpdateRowCounts(result.rowCounts, result.assignments);
                  }
                }}
                style={{
                  minHeight: '28px',
                  height: '28px',
                  width: '28px',
                  minWidth: '28px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px dashed var(--color-danger-text)',
                  color: 'var(--color-danger-text)',
                  marginRight: '6px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Remove this row"
              >
                🗑️
              </button>
            )}
            {Array.from({ length: seatCount }).map((_, seatIndex) => {
              const seatKey = `${rowIndex}-${seatIndex}`;
              const suggestion = suggestions[seatKey];
              const profileId = assignments[seatKey];
              const assignedProfile = profileId ? profileMap[profileId] : null;

              const isMismatch = isSectionMismatch(assignedProfile?.voicePart, suggestion, voiceParts);

              const sectionDef = suggestion ? sections.find(s => s.code.toUpperCase() === suggestion.toUpperCase()) : null;
              const secColor = sectionDef?.color || sectionDef?.colorBg;

              const isAssigned = !!profileId;

              // Resolve singer's section color for color-coding mismatches along with their section
              let singerSecColor: string | undefined;
              if (assignedProfile) {
                const vpDef = voiceParts.find(vp => vp.label === assignedProfile.voicePart);
                const singerSectionCode = vpDef?.sectionCode || (assignedProfile.voicePart ? assignedProfile.voicePart.trim()[0].toUpperCase() : '');
                const singerSectionDef = singerSectionCode ? sections.find(s => s.code.toUpperCase() === singerSectionCode.toUpperCase()) : null;
                singerSecColor = singerSectionDef?.color || singerSectionDef?.colorBg;
              }

              const activeColor = (isAssigned && singerSecColor) ? singerSecColor : secColor;
              const colors = activeColor
                ? { bg: activeColor, text: getContrastColor(activeColor) }
                : { bg: 'var(--surface)', text: 'var(--text-muted)' };

              const seatBg = isAssigned ? colors.bg : 'var(--surface)';
              const seatTextColor = isAssigned ? colors.text : (secColor || 'var(--text-muted)');
              const borderStyle = isAssigned ? 'solid' : 'dashed';
              const borderColor = isAssigned ? colors.text : (secColor || 'var(--border)');

              // Wedge Outline Logic
              const leftSuggestion = seatIndex > 0 ? suggestions[`${rowIndex}-${seatIndex - 1}`] : null;
              const rightSuggestion = seatIndex < seatCount - 1 ? suggestions[`${rowIndex}-${seatIndex + 1}`] : null;

              const hasLeftBorder = suggestion !== leftSuggestion;
              const hasRightBorder = suggestion !== rightSuggestion;

              const activeHoverOrDrag = hoveredSeat || activeDragOver;
              const isHovered = seatKey === activeHoverOrDrag;
              const isNeighbor = getIsNeighbor(activeHoverOrDrag, seatKey);

              const scale = isHovered ? 1.45 : (isNeighbor ? 1.22 : 1.0);
              const translateY = isHovered ? -8 : (isNeighbor ? -4 : 0);
              const zIndex = isHovered ? 10 : (isNeighbor ? 5 : 1);
              const boxShadow = isHovered ? 'var(--shadow-lg)' : (isNeighbor ? 'var(--shadow-sm)' : 'none');

              return (
                <div
                  key={seatKey}
                  onDragOver={(e) => {
                    if (!isReadOnly) {
                      e.preventDefault();
                      if (activeDragOver !== seatKey) {
                        setActiveDragOver(seatKey);
                      }
                    }
                  }}
                  onDragLeave={() => !isReadOnly && setActiveDragOver(null)}
                  onMouseEnter={() => !isReadOnly && setHoveredSeat(seatKey)}
                  onMouseLeave={() => !isReadOnly && setHoveredSeat(null)}
                  onDrop={(e) => {
                    if (!isReadOnly) {
                      e.preventDefault();
                      setActiveDragOver(null);
                      setHoveredSeat(null);
                      handleDrop(e, seatKey);
                    }
                  }}
                  draggable={!isReadOnly && !!assignedProfile}
                  onDragStart={(e) => !isReadOnly && assignedProfile && handleDragStart(e, assignedProfile.id, seatKey)}
                  title={assignedProfile ? `${assignedProfile.name} (${assignedProfile.voicePart})` : `Empty Seat ${suggestion}${seatIndex + 1}`}
                  className={`flex-col seat-cell ${assignedProfile ? 'seat-assigned' : 'seat-empty'} ${isMismatch ? 'section-mismatch' : ''} ${activeDragOver === seatKey ? 'drag-target' : ''}`}
                  style={{
                    width: `${seatSize}px`,
                    height: `${seatSize}px`,
                    backgroundColor: seatBg,
                    borderTop: `1px ${borderStyle} ${borderColor}`,
                    borderBottom: `1px ${borderStyle} ${borderColor}`,
                    borderLeft: hasLeftBorder ? `3px ${borderStyle} ${borderColor}` : `1px ${borderStyle} ${borderColor}`,
                    borderRight: hasRightBorder ? `3px ${borderStyle} ${borderColor}` : `1px ${borderStyle} ${borderColor}`,
                    borderRadius: 'var(--radius-md)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: fontSize,
                    position: 'relative',
                    cursor: isReadOnly ? 'default' : (assignedProfile ? 'grab' : 'pointer'),
                    boxShadow: boxShadow,
                    flexShrink: 0,
                    gap: 0,
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    zIndex: zIndex,
                    transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease-in-out, background-color 0.2s, border-color 0.2s'
                  }}
                >
                  {(!isReadOnly && assignedProfile) && (
                    <div
                      className="no-print seat-grab-handle"
                      title="Drag to move or swap"
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '5px',
                        opacity: 0.35,
                        color: colors.text,
                        fontSize: '9px',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px'
                      }}
                    >
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
                        <circle cx="1.5" cy="1.5" r="1"/>
                        <circle cx="1.5" cy="5" r="1"/>
                        <circle cx="1.5" cy="8.5" r="1"/>
                        <circle cx="4.5" cy="1.5" r="1"/>
                        <circle cx="4.5" cy="5" r="1"/>
                        <circle cx="4.5" cy="8.5" r="1"/>
                      </svg>
                    </div>
                  )}

                  {activeDragOver === seatKey && (
                    <div className="drag-overlay">
                      <span className="drag-overlay-icon" style={{ fontSize: isCompact ? '1.125rem' : '1.5rem' }}>
                        {assignedProfile ? '🔄' : '📥'}
                      </span>
                    </div>
                  )}

                  {(!isReadOnly && !assignedProfile) && (
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

                      {suggestion && sectionDef && (
                        <optgroup label={`Recommended (${sectionDef.name})`}>
                          {activeProfiles
                            .filter(p => !assignedProfileIds.has(p.id) || p.id === profileId)
                            .filter(p => {
                              const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
                              return vpDef?.sectionCode?.toUpperCase() === suggestion.toUpperCase();
                            })
                            .sort((a, b) => formatNameLastFirst(a.name).localeCompare(formatNameLastFirst(b.name)))
                            .map(p => (
                              <option key={p.id} value={p.id}>{formatNameLastFirst(p.name)} ({p.voicePart})</option>
                            ))
                          }
                        </optgroup>
                      )}
                      <optgroup label="Other Sections">
                        {activeProfiles
                          .filter(p => !assignedProfileIds.has(p.id) || p.id === profileId)
                          .filter(p => {
                            const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
                            return vpDef?.sectionCode?.toUpperCase() !== suggestion?.toUpperCase();
                          })
                          .sort((a, b) => {
                            const vpCompare = a.voicePart.localeCompare(b.voicePart);
                            if (vpCompare !== 0) return vpCompare;
                            return formatNameLastFirst(a.name).localeCompare(formatNameLastFirst(b.name));
                          })
                          .map(p => (
                            <option key={p.id} value={p.id}>{formatNameLastFirst(p.name)} ({p.voicePart})</option>
                          ))
                        }
                      </optgroup>
                    </select>
                  )}

                  {!isReadOnly && onUpdateRowCounts && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        const seatHasAssignment = !!assignments[seatKey];
                        if (seatHasAssignment) {
                          await onAssign(seatKey, '');
                        } else {
                          const result = removeSeatFromRow(rowCounts, rowIndex, seatIndex, assignments);
                          onUpdateRowCounts(result.rowCounts, result.assignments);
                        }
                      }}
                      className="no-print seat-remove-btn"
                      data-action={assignments[seatKey] ? "unassign" : "delete"}
                      title={assignments[seatKey] ? "Unassign singer" : "Delete empty seat"}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: assignments[seatKey] ? 'var(--bg-muted, #e2e8f0)' : 'var(--color-danger-bg)',
                        color: assignments[seatKey] ? 'var(--text-muted, #475569)' : 'var(--color-danger-text)',
                        border: 'none',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 12,
                        padding: 0,
                        lineHeight: 1,
                        fontWeight: 'bold',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      ×
                    </button>
                  )}

                  <div style={{ fontWeight: 700, color: seatTextColor, fontSize: isCompact ? '0.75rem' : '0.875rem' }}>
                    {sectionDef?.name[0] || suggestion}{seatIndex + 1}
                  </div>
                  {assignedProfile ? (
                    <div className="flex-col" style={{ gap: isCompact ? '1px' : '3px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: isCompact ? '1.375rem' : '1.25rem', color: colors.text, lineHeight: 1.1 }}>
                        {isCompact ? getInitials(assignedProfile.name) : (uniqueDisplayNames[assignedProfile.id] || assignedProfile.name.split(' ').pop())}
                      </div>
                      <div style={{ fontWeight: 700, color: colors.text, fontSize: isCompact ? '0.75rem' : '0.875rem' }}>
                        {assignedProfile.voicePart}
                      </div>
                      <div className={`no-print ${rowIndex === rowCounts.length - 1 ? 'seat-tooltip-bottom' : 'seat-tooltip'} ${isMismatch ? 'seat-tooltip-mismatch' : ''}`}>
                        {isMismatch ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800 }}>⚠️ {assignedProfile.name}</span>
                            <span style={{ fontSize: '0.6875rem', opacity: 0.95, fontWeight: 600, letterSpacing: '0.01em' }}>
                              Not recommended voice type ({assignedProfile.voicePart}) for this {sectionDef?.name || suggestion} seat
                            </span>
                          </div>
                        ) : (
                          `${assignedProfile.name} (${assignedProfile.voicePart})`
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, color: seatTextColor, fontSize: isCompact ? '1rem' : '1.125rem' }}>{isCompact ? '—' : 'Empty'}</div>
                  )}
                </div>
              );
            })}

            {/* "+" add seat button */}
            {!isReadOnly && onUpdateRowCounts && (
              <button
                className="no-print btn btn-ghost"
                onClick={() => {
                  const newRowCounts = [...rowCounts];
                  newRowCounts[rowIndex] += 1;
                  onUpdateRowCounts(newRowCounts);
                }}
                style={{
                  minHeight: '28px',
                  height: '28px',
                  width: '28px',
                  minWidth: '28px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--primary-light)',
                  border: '1px dashed var(--primary)',
                  color: 'var(--primary-deep)',
                  marginLeft: '12px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Add seat to this row"
              >
                +
              </button>
            )}

            {/* "-" remove seat button */}
            {!isReadOnly && onUpdateRowCounts && seatCount > 0 && (
              <button
                className="no-print btn btn-ghost"
                onClick={async () => {
                  const seatIndex = seatCount - 1;
                  const seatKey = `${rowIndex}-${seatIndex}`;
                  const seatHasAssignment = !!assignments[seatKey];
                  let shouldRemove = true;
                  if (seatHasAssignment) {
                    const profile = profileMap[assignments[seatKey]];
                    const singerName = profile ? profile.name : 'A singer';
                    shouldRemove = await dialog.confirm({
                      title: 'Remove Seat?',
                      message: `The last seat of Row ${rowIndex + 1} is assigned to ${singerName}. Removing this seat will unassign them. Proceed?`,
                      confirmLabel: 'Remove Seat',
                      cancelLabel: 'Cancel',
                      variant: 'danger'
                    });
                  }

                  if (shouldRemove) {
                    const result = removeSeatFromRow(rowCounts, rowIndex, seatIndex, assignments);
                    onUpdateRowCounts(result.rowCounts, result.assignments);
                  }
                }}
                style={{
                  minHeight: '28px',
                  height: '28px',
                  width: '28px',
                  minWidth: '28px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px dashed var(--color-danger-text)',
                  color: 'var(--color-danger-text)',
                  marginLeft: '6px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Remove last seat from this row"
              >
                -
              </button>
            )}
          </div>
        );
      })}

      {/* Add Row to Front Button */}
      {!isReadOnly && onUpdateRowCounts && (
        <button
          onClick={() => {
            const defaultSeats = 10;
            const newRowCounts = [defaultSeats, ...rowCounts];
            const shiftedAssignments: Record<string, string> = {};
            Object.entries(assignments).forEach(([key, profileId]) => {
              const [rStr, sStr] = key.split('-');
              const r = parseInt(rStr, 10);
              shiftedAssignments[`${r + 1}-${sStr}`] = profileId;
            });
            onUpdateRowCounts(newRowCounts, shiftedAssignments);
          }}
          className="btn btn-sm btn-ghost no-print"
          style={{
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-deep)',
            border: '1px dashed var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xs) var(--space-md)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: 'var(--space-xs)'
          }}
          title="Add a new row with 10 seats at the front"
        >
          ➕ Add Row to Front
        </button>
      )}

      {/* Director Indicator */}
      <div className="no-print director-indicator" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: 'var(--space-md)',
        padding: 'var(--space-xs) var(--space-xl)',
        backgroundColor: 'var(--primary-light, #e2e8f0)',
        color: 'var(--primary-deep, #1e293b)',
        border: '1px solid var(--primary, #cbd5e1)',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: '0.8125rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        boxShadow: 'var(--shadow-xs)',
        width: 'fit-content'
      }}>
        <span>🎼</span>
        <span>Director</span>
      </div>
      </div>
    </div>
  );
};
