import React from 'react';
import { type Profile } from '../../services/profileService';
import { type SectionDef, type VoicePartDef } from '../../services/settingsService';
import { getUniqueDisplayNames, getLastName, getFirstName } from '../../lib/stringUtils';
import { useDialog } from '../../contexts/DialogContext';
import { removeSeatFromRow, removeRowAndShiftAssignments } from '../../lib/seatingSync';
import { isSectionMismatch } from '../../lib/voicePartUtils';
import { getContrastColor } from '../../lib/colorUtils';


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
  isVoicePartLayout?: boolean;
  sectionOrder?: string[];
}

export const SeatingGrid: React.FC<SeatingGridProps> = ({
  rowCounts, assignments, suggestions, activeProfiles, sections, voiceParts, onAssign, isReadOnly = false, onUpdateRowCounts, isVoicePartLayout = false, sectionOrder
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

  const fitsFormation = React.useCallback((p: Profile): boolean => {
    const order = sectionOrder || [];
    if (order.length === 0) {
      const activeSuggestionCodes = new Set(
        Object.values(suggestions).map(code => code.toUpperCase())
      );
      if (activeSuggestionCodes.size === 0) return true;
      if (isVoicePartLayout) {
        return activeSuggestionCodes.has(p.voicePart.toUpperCase());
      } else {
        const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
        let sectionCode = vpDef?.sectionCode;
        if (!sectionCode) {
          const part = p.voicePart ? p.voicePart.trim() : '';
          if (/^(soprano|s)(\s*\d+)?$/i.test(part)) sectionCode = 'S';
          else if (/^(alto|a)(\s*\d+)?$/i.test(part)) sectionCode = 'A';
          else if (/^(tenor|t)(\s*\d+)?$/i.test(part)) sectionCode = 'T';
          else if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(part)) sectionCode = 'B';
        }
        return sectionCode ? activeSuggestionCodes.has(sectionCode.toUpperCase()) : false;
      }
    }

    // Check exact voice part match first
    const hasExactMatch = order.some(code => code.toUpperCase() === p.voicePart.toUpperCase());
    if (hasExactMatch) return true;

    // Check parent section code match
    const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
    let sectionCode = vpDef?.sectionCode;
    if (!sectionCode) {
      const part = p.voicePart ? p.voicePart.trim() : '';
      if (/^(soprano|s)(\s*\d+)?$/i.test(part)) sectionCode = 'S';
      else if (/^(alto|a)(\s*\d+)?$/i.test(part)) sectionCode = 'A';
      else if (/^(tenor|t)(\s*\d+)?$/i.test(part)) sectionCode = 'T';
      else if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(part)) sectionCode = 'B';
    }
    return sectionCode ? order.some(code => code.toUpperCase() === sectionCode.toUpperCase()) : false;
  }, [sectionOrder, suggestions, isVoicePartLayout, voiceParts]);

  const activeSingersForFormationCount = React.useMemo(() => {
    return activeProfiles.filter(fitsFormation).length;
  }, [activeProfiles, fitsFormation]);

  const profileMap = React.useMemo(() => {
    const map: Record<string, Profile> = {};
    activeProfiles.forEach(p => map[p.id] = p);
    return map;
  }, [activeProfiles]);

  const assignedProfileIds = new Set(Object.values(assignments));
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = React.useState(0);

  // Compact Mode Detection
  const maxSeats = Math.max(...rowCounts, 0);
  const isCompact = maxSeats > 12;
  const baseSeatSize = isCompact ? 68 : 100;
  const baseGridGap = isCompact ? 6 : 12;
  const tightGridGap = isCompact ? 4 : 8;
  const labelWidth = isCompact ? 75 : 105;
  const canEditLayout = !isReadOnly && Boolean(onUpdateRowCounts);
  const editButtonCount = canEditLayout ? 2 : 0;
  const rowChildCount = 1 + maxSeats + editButtonCount;
  const editButtonWidth = editButtonCount * 28;
  const editButtonMargins = canEditLayout ? 32 : 0;
  const containerPaddingPx = isCompact ? 4 : 16;
  const availableGridWidth = gridWidth > 0 ? gridWidth : Number.POSITIVE_INFINITY;
  const getFittedSeatSize = (gap: number): number => {
    const gapWidth = Math.max(0, rowChildCount - 1) * gap;
    const fixedWidth = labelWidth + editButtonWidth + editButtonMargins + gapWidth + (containerPaddingPx * 2);
    return maxSeats > 0 ? (availableGridWidth - fixedWidth) / maxSeats : baseSeatSize;
  };
  const baseFittedSeatSize = getFittedSeatSize(baseGridGap);
  const gridGap = Number.isFinite(baseFittedSeatSize) && baseFittedSeatSize < baseSeatSize ? tightGridGap : baseGridGap;
  const fittedSeatSize = Math.floor(getFittedSeatSize(gridGap));
  const minSeatSize = isCompact ? 44 : 72;
  const seatSize = Number.isFinite(fittedSeatSize) ? Math.max(minSeatSize, Math.min(baseSeatSize, fittedSeatSize)) : baseSeatSize;
  const isTightGrid = seatSize < baseSeatSize;
  const rowGap = isCompact ? 'var(--space-xs)' : 'var(--space-sm)';
  const containerPadding = isCompact ? 'var(--space-xs)' : 'var(--space-md)';
  const seatNameFontSize = isCompact ? (isTightGrid ? '1.05rem' : '1.375rem') : '1.25rem';
  const seatVoicePartFontSize = isCompact ? (isTightGrid ? '0.625rem' : '0.75rem') : '0.875rem';
  const emptySeatFontSize = isCompact ? (isTightGrid ? '0.875rem' : '1rem') : '1.125rem';
  const hoverScale = isTightGrid ? 1.24 : 1.45;
  const neighborScale = isTightGrid ? 1.12 : 1.22;
  const hoverTranslateY = isTightGrid ? -4 : -8;
  const neighborTranslateY = isTightGrid ? -2 : -4;

  React.useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridWidth = () => setGridWidth(grid.clientWidth);
    updateGridWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateGridWidth);
      return () => window.removeEventListener('resize', updateGridWidth);
    }

    const observer = new ResizeObserver(updateGridWidth);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

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
    <div
      ref={gridRef}
      className="flex-col"
      // @allow-inline-style - dynamic gap, padding, and --max-seats computed from layout
      style={{
        gap: rowGap,
        alignItems: 'center',
        width: '100%',
        overflowX: 'auto',
        padding: containerPadding,
        ...({
          '--max-seats': maxSeats,
          '--seat-size': `${seatSize}px`,
          '--seat-font-size': isCompact ? (isTightGrid ? '0.625rem' : 'var(--font-size-xs)') : 'var(--font-size-sm)',
          '--seat-name-font-size': seatNameFontSize,
          '--seat-vp-font-size': seatVoicePartFontSize,
          '--seat-empty-font-size': emptySeatFontSize,
        } as React.CSSProperties)
      }}
    >
      {/* Warning banner if not enough seats */}
      {activeSingersForFormationCount > totalSeats && onUpdateRowCounts && (
        <div className="no-print flex w-full max-w-[800px] flex-col items-center justify-center gap-4 rounded-md border border-[#fecaca] bg-danger-bg p-4 text-center text-danger-text shadow-sm">
          <span className="text-xl">⚠️</span>
          <div className="flex flex-1 flex-col gap-0.5">
            <strong className="text-[0.9375rem] font-bold">Not enough seats configured!</strong>
            <span className="text-[0.8125rem] opacity-90">
              You have {activeSingersForFormationCount} active singers but only {totalSeats} seats. Click the <strong>+</strong> button at the end of any row to add seats.
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
          className="btn btn-sm btn-ghost no-print rounded-md border-dashed border-primary bg-primary-light text-primary-deep"
          // @allow-inline-style - static typography and margin overrides for button appearance
          style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 'var(--space-xs)' }}
          title="Add a new row with 10 seats at the back"
        >
          ➕ Add Row to Back
        </button>
      )}

      {rowCounts.map((_, index) => {
        const rowIndex = rowCounts.length - 1 - index;
        const seatCount = rowCounts[rowIndex];
        const isFront = rowIndex === 0;
        const rowLabel = `Row ${rowIndex + 1}`;
        const occupiedCount = Object.keys(assignments).filter(key =>
          key.startsWith(`${rowIndex}-`) && !!assignments[key]
        ).length;
        // Calculate suggestion-based seat numbers in this row
        const suggestedSeatNumbers: Record<number, number> = {};
        let suggestedCount = 0;
        for (let sIdx = 0; sIdx < seatCount; sIdx++) {
          if (suggestions[`${rowIndex}-${sIdx}`]) {
            suggestedCount++;
            suggestedSeatNumbers[sIdx] = suggestedCount;
          }
        }

        return (
          <div key={rowIndex} className="row-print"
            // @allow-inline-style - dynamic gap computed from grid width
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: `${gridGap}px`,
              justifyContent: 'center',
              minWidth: 'max-content'
            }}>
            <div className="text-muted text-xs flex flex-col items-end justify-center"
              // @allow-inline-style - wider label to accommodate seat count badge
              // @allow-inline-style - dynamic width based on compact mode
              style={{ width: isCompact ? '110px' : '130px', fontWeight: 700, textAlign: 'right', paddingRight: 'var(--space-md)' }}
              title={`${occupiedCount} of ${seatCount} seats occupied`}>
              <span className="leading-tight">
                {rowLabel}
                {(isFront || rowIndex === rowCounts.length - 1) && (
                  <span className="no-print">
                    {isFront ? ' (Front)' : ' (Back)'}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-normal leading-tight opacity-75 mt-0.5">
                {occupiedCount}/{seatCount}
              </span>
            </div>

            {/* "🗑️" remove row button */}
            {!isReadOnly && onUpdateRowCounts && (
              <button
                className="no-print ml-1.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-danger-bg p-0 text-[13px] font-bold text-danger-text shadow-sm transition-all duration-200 hover:bg-opacity-80 active:scale-95"
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

              const isMismatch = isVoicePartLayout
                ? Boolean(assignedProfile?.voicePart && suggestion && assignedProfile.voicePart.toUpperCase() !== suggestion.toUpperCase())
                : isSectionMismatch(assignedProfile?.voicePart, suggestion, voiceParts);

              const displaySuggestion = (() => {
                if (suggestion) return suggestion;
                if (assignedProfile) {
                  const profileVpDef = voiceParts.find(vp => vp.label === assignedProfile.voicePart);
                  if (profileVpDef) {
                    const parentSec = sections.find(s => s.code === profileVpDef.sectionCode);
                    return isVoicePartLayout ? assignedProfile.voicePart : (parentSec?.code || assignedProfile.voicePart[0]?.toUpperCase() || '');
                  }
                  return assignedProfile.voicePart[0]?.toUpperCase() || '';
                }
                return '';
              })();

              const displaySeatNumber = suggestion ? suggestedSeatNumbers[seatIndex] : (seatIndex + 1);

              let sectionDef: SectionDef | undefined;
              let vpDef: VoicePartDef | undefined;

              if (displaySuggestion) {
                if (isVoicePartLayout) {
                  vpDef = voiceParts.find(v => v.label.toUpperCase() === displaySuggestion.toUpperCase());
                  if (vpDef) {
                    sectionDef = sections.find(s => s.code === vpDef?.sectionCode);
                  }
                } else {
                  sectionDef = sections.find(s => s.code.toUpperCase() === displaySuggestion.toUpperCase());
                }
              }

              let secColor: string | undefined;
              if (suggestion) {
                if (isVoicePartLayout) {
                  if (vpDef) {
                    secColor = vpDef.color || vpDef.colorBg || sectionDef?.color || sectionDef?.colorBg;
                  }
                } else {
                  secColor = sectionDef?.color || sectionDef?.colorBg;
                }
              }

              const isAssigned = !!profileId;

              // Resolve singer's section/voice-part color for color-coding mismatches along with their section
              let singerSecColor: string | undefined;
              if (assignedProfile) {
                const vpDef = voiceParts.find(vp => vp.label === assignedProfile.voicePart);
                if (vpDef) {
                  const parentSec = sections.find(s => s.code === vpDef.sectionCode);
                  singerSecColor = vpDef.color || vpDef.colorBg || parentSec?.color || parentSec?.colorBg;
                } else if (assignedProfile.voicePart) {
                  const derivedCode = assignedProfile.voicePart.trim()[0].toUpperCase();
                  const parentSec = sections.find(s => s.code.toUpperCase() === derivedCode);
                  singerSecColor = parentSec?.color || parentSec?.colorBg;
                }
              }

              const activeColor = (isAssigned && singerSecColor) ? singerSecColor : secColor;
              const colors = activeColor
                ? { bg: activeColor, text: getContrastColor(activeColor) }
                : { bg: 'var(--surface)', text: 'var(--text-muted)' };

              const seatBg = isAssigned ? colors.bg : 'var(--surface)';
              const seatTextColor = isAssigned ? colors.text : (secColor || 'var(--text-muted)');
              const borderStyle = isAssigned ? 'solid' : 'dashed';
              const borderColor = isAssigned ? '#000000' : (secColor || 'var(--border)');

              // Wedge Outline Logic
              const leftSuggestion = seatIndex > 0 ? suggestions[`${rowIndex}-${seatIndex - 1}`] : null;
              const rightSuggestion = seatIndex < seatCount - 1 ? suggestions[`${rowIndex}-${seatIndex + 1}`] : null;

              const hasLeftBorder = suggestion !== leftSuggestion;
              const hasRightBorder = suggestion !== rightSuggestion;

              const activeHoverOrDrag = hoveredSeat || activeDragOver;
              const isHovered = seatKey === activeHoverOrDrag;
              const isNeighbor = getIsNeighbor(activeHoverOrDrag, seatKey);

              const scale = isHovered ? hoverScale : (isNeighbor ? neighborScale : 1.0);
              const translateY = isHovered ? hoverTranslateY : (isNeighbor ? neighborTranslateY : 0);
              const zIndex = activeDragOver === seatKey ? 100 : (isHovered ? 10 : (isNeighbor ? 5 : 1));
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
                  title={assignedProfile ? `${assignedProfile.name} (${assignedProfile.voicePart})` : (suggestion ? `Empty Seat ${suggestion}${suggestedSeatNumbers[seatIndex]}` : `Empty Space ${seatIndex + 1}`)}
                  className={`group relative flex size-8 cursor-pointer flex-col items-center justify-center rounded-md bg-primary-light text-xs font-medium text-primary-deep transition-colors hover:bg-primary hover:text-surface ${isMismatch ? 'bg-[linear-gradient(135deg,rgba(0,0,0,0.08)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.08)_50%,rgba(0,0,0,0.08)_75%,transparent_75%,transparent)] bg-[length:10px_10px]' : ''} ${activeDragOver === seatKey ? 'animate-drop-zone-pulse border-dashed border-2' : ''}`}
                  // @allow-inline-style - all seat dimensions, colors, borders, transform computed from props and state
                  style={{
                    width: 'var(--seat-size)',
                    height: 'var(--seat-size)',
                    backgroundColor: seatBg,
                    borderTop: `1px ${borderStyle} ${borderColor}`,
                    borderBottom: `1px ${borderStyle} ${borderColor}`,
                    borderLeft: hasLeftBorder ? `3px ${borderStyle} ${borderColor}` : `1px ${borderStyle} ${borderColor}`,
                    borderRight: hasRightBorder ? `3px ${borderStyle} ${borderColor}` : `1px ${borderStyle} ${borderColor}`,
                    borderRadius: 'var(--radius-md)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: 'var(--seat-font-size)',
                    position: 'relative',
                    cursor: isReadOnly ? 'default' : (assignedProfile ? 'grab' : 'pointer'),
                    boxShadow: boxShadow,
                    flexShrink: 0,
                    gap: 0,
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    zIndex: zIndex,
                    opacity: activeDragOver === seatKey ? 0.95 : undefined,
                    transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease-in-out, background-color 0.2s, border-color 0.2s'
                  }}
                >
                  {activeDragOver === seatKey && (
                    <div className="absolute inset-0 z-5 flex items-center justify-center rounded-[inherit] bg-blue-500/18 pointer-events-none">
                      <span className="animate-bounce-subtle inline-block leading-none"
                        // @allow-inline-style - dynamic font size based on compact mode
                        style={{ fontSize: isCompact ? '1.125rem' : '1.5rem' }}>
                        {assignedProfile ? '🔄' : '📥'}
                      </span>
                    </div>
                  )}

                  {(!isReadOnly && !assignedProfile) && (
                    <select
                      value={profileId || ''}
                      onChange={(e) => onAssign(seatKey, e.target.value)}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    >
                       <option value="">-- Assign --</option>
                      <option value="">(Empty)</option>

                      {suggestion && (isVoicePartLayout ? vpDef : sectionDef) && (
                        <optgroup label={`Recommended (${isVoicePartLayout ? vpDef?.fullName : sectionDef?.name})`}>
                          {activeProfiles
                            .filter(p => !assignedProfileIds.has(p.id) || p.id === profileId)
                            .filter(fitsFormation)
                            .filter(p => {
                              if (isVoicePartLayout) {
                                return p.voicePart.toUpperCase() === suggestion.toUpperCase();
                              } else {
                                const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
                                return vpDef?.sectionCode?.toUpperCase() === suggestion.toUpperCase();
                              }
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
                          .filter(fitsFormation)
                          .filter(p => {
                            if (isVoicePartLayout) {
                              return p.voicePart.toUpperCase() !== suggestion?.toUpperCase();
                            } else {
                              const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
                              return vpDef?.sectionCode?.toUpperCase() !== suggestion?.toUpperCase();
                            }
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
                      className="no-print"
                      data-action={assignments[seatKey] ? "unassign" : "delete"}
                      title={assignments[seatKey] ? "Unassign singer" : "Delete empty seat"}
                      // @allow-inline-style - dynamic background and color based on assignment state
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

                  <div
                    // @allow-inline-style - dynamic color and font size from computed seat styles
                    style={{ fontWeight: 700, color: seatTextColor, fontSize: 'var(--seat-font-size)' }}>
                    {displaySuggestion
                      ? (isVoicePartLayout ? `${displaySuggestion} - ${displaySeatNumber}` : `${sectionDef?.name[0] || displaySuggestion}${displaySeatNumber}`)
                      : ''
                    }
                  </div>
                  {assignedProfile ? (
                    <div className="flex-col"
                      // @allow-inline-style - dynamic gap based on compact mode
                      style={{ gap: isCompact ? '1px' : '3px', alignItems: 'center' }}>
                      <div
                        // @allow-inline-style - dynamic font size and color from computed styles
                        style={{ fontWeight: 800, fontSize: 'var(--seat-name-font-size)', color: colors.text, lineHeight: 1.1 }}>
                        {isCompact ? getInitials(assignedProfile.name) : (uniqueDisplayNames[assignedProfile.id] || assignedProfile.name.split(' ').pop())}
                      </div>
                      <div
                        // @allow-inline-style - dynamic font size and color from computed styles
                        style={{ fontWeight: 700, color: colors.text, fontSize: 'var(--seat-vp-font-size)' }}>
                        {assignedProfile.voicePart}
                      </div>
                      <div className={`no-print pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 ${isMismatch ? 'bg-red-700' : ''} ${rowIndex === rowCounts.length - 1 ? '-bottom-1 translate-y-full' : '-top-1 -translate-y-full'}`}>
                        {isMismatch ? (
                          <>
                            <span>⚠️ {assignedProfile.name}</span>
                            <span>
                              Not recommended voice type ({assignedProfile.voicePart}) for this {isVoicePartLayout ? `${vpDef?.fullName || displaySuggestion} seat ${displaySeatNumber}` : `${sectionDef?.name || displaySuggestion} seat ${displaySeatNumber}`}
                            </span>
                          </>
                        ) : (
                          `${assignedProfile.name} (${assignedProfile.voicePart})`
                        )}
                      </div>
                    </div>
                  ) : (
                    // @allow-inline-style - dynamic font size and color from computed styles
                    <div style={{ fontWeight: 600, color: seatTextColor, fontSize: 'var(--seat-empty-font-size)' }}>{isCompact ? '—' : 'Empty'}</div>
                  )}
                </div>
              );
            })}

            {/* "+" add seat button */}
            {!isReadOnly && onUpdateRowCounts && (
              <button
                className="no-print ml-3 mr-3 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-primary bg-primary-light p-0 text-[15px] font-bold text-primary-deep shadow-sm transition-all duration-200 hover:bg-opacity-80 active:scale-95"
                onClick={() => {
                  const newRowCounts = [...rowCounts];
                  newRowCounts[rowIndex] += 1;
                  onUpdateRowCounts(newRowCounts);
                }}
                title="Add seat to this row"
              >
                +
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
          className="btn btn-sm btn-ghost no-print rounded-md border-dashed border-primary bg-primary-light text-primary-deep"
          // @allow-inline-style - static typography and margin overrides for button appearance
          style={{
            fontWeight: 600,
            fontSize: '0.8125rem',
            marginTop: 'var(--space-xs)'
          }}
          title="Add a new row with 10 seats at the front"
        >
          ➕ Add Row to Front
        </button>
      )}

      {/* Director Indicator */}
      <div className="mt-4 flex w-fit items-center justify-center gap-2 rounded-full border border-primary bg-primary-light px-8 py-1 text-[0.8125rem] font-bold tracking-wider text-primary-deep uppercase shadow-xs">
        <span>🎼</span>
        <span>Director</span>
      </div>
    </div>
  );
};
