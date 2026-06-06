import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AttendanceItem } from '../../hooks/useAttendance';
import './CheckInList.css';
import './RosterUtils.css';

interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
  sortBy: 'lastName' | 'voicePart' | 'section';
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}

// Local sub-component to manage Folder number input state cleanly without lag
const FolderInput: React.FC<{
  initialValue: string;
  onSave: (val: string) => void;
}> = ({ initialValue, onSave }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (value !== initialValue) {
      onSave(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onClick={(event) => event.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="--"
      className="card roster-ut-folder-input"
    />
  );
};

// Extracted CheckInRow sub-component to keep code DRY and maintainable
const CheckInRow: React.FC<{
  item: AttendanceItem;
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}> = ({ item, onSetAttendance, onUpdateFolder, onEdit, missCounts, maxRehearsalMisses }) => {
  const navigate = useNavigate();
  const isPresent = item.attendance === 'Present';
  const isAbsent = item.attendance === 'Absent';
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const secondaryPanelId = `checkin-secondary-${item.profileId}`;

  return (
    <div
      className={`card admin-checkin-row checkin-row ${isSecondaryOpen ? 'secondary-open' : ''}`}
      onClick={() => onSetAttendance(item.profileId, isPresent ? 'Pending' : 'Present')}
      style={{ /* @allow-inline-style */
        // @allow-inline-style - Dynamic row styling based on attendance state
        opacity: isPresent ? 0.85 : 1,
        border: isPresent
          ? '1px solid var(--primary)'
          : isAbsent
            ? '1px solid #fca5a5'
            : '1px solid var(--border)',
        backgroundColor: isPresent
          ? 'rgba(74, 117, 89, 0.06)' // soft, premium mint green tint
          : isAbsent
            ? 'rgba(153, 27, 27, 0.04)' // soft, premium crimson/red tint
            : 'var(--surface)',
      }}
    >
      {/* Row Segment 1: Singer name, badges, and primary Present/Absent toggles */}
      <div className="admin-checkin-top-row">
        {/* Left Section: Singer name and details */}
        <div className="admin-checkin-singer">
          <div className="admin-checkin-singer-header">
            <span
              onClick={(event) => {
                event.stopPropagation();
                const query = new URLSearchParams({
                  singerId: item.profileId,
                  openModal: 'true',
                });
                navigate(`/admin/roster?${query.toString()}`);
              }}
              className="admin-checkin-name roster-ut-clickable-name"
              style={{ /* @allow-inline-style */
                // @allow-inline-style - Dynamic name color based on attendance state
                color: isPresent 
                  ? 'var(--primary-deep)' 
                  : isAbsent 
                    ? '#991b1b' 
                    : 'var(--text-main)',
              }}
              title="Click to view full roster profile"
            >
              {item.name}
            </span>
            
            <div className="admin-checkin-badges">
              {item.rsvp === 'Yes' && (
                <span 
                  className="badge badge-rehearsal roster-ut-badge-rsvp"
                >
                  RSVP
                </span>
              )}
              <span
                className="badge roster-ut-badge-voicepart"
              >
                {item.voicePart}
              </span>
              {missCounts && missCounts[item.profileId] !== undefined && missCounts[item.profileId] > 0 && (
                <span
                  className="badge roster-ut-badge-misses"
                  style={{ /* @allow-inline-style */
                    // @allow-inline-style - Dynamic colors based on miss threshold
                    backgroundColor: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#fee2e2' : '#fef3c7',
                    color: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#991b1b' : '#92400e',
                    border: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '1px solid #fca5a5' : '1px solid #fde68a',
                  }}
                >
                  ⚠️ {missCounts[item.profileId]} missed
                </span>
              )}
            </div>
          </div>
          <div className="admin-checkin-status-summary">
            <span>{item.voicePart}</span>
            {item.rsvp === 'Yes' && <span>RSVP</span>}
            <span>Folder {item.folderNumber || '--'}</span>
            <span>{item.folderReturned ? 'Returned' : 'Not returned'}</span>
            {item.rsvpNote && <span className="roster-ut-rsvp-note">📝 {item.rsvpNote}</span>}
          </div>
          <div className="admin-checkin-primary-hint">
            {isPresent ? 'Checked in' : isAbsent ? 'Marked absent' : 'Tap card to mark present'}
          </div>
        </div>

        {/* Right Section: Attendance separated action buttons (Absent on left, Present on right) */}
        <div className="admin-checkin-actions">
          <button
            type="button"
            aria-pressed={isAbsent}
            onClick={(event) => {
              event.stopPropagation();
              onSetAttendance(item.profileId, isAbsent ? 'Pending' : 'Absent');
            }}
            className="btn admin-checkin-absent-btn"
            style={{ /* @allow-inline-style */
              // @allow-inline-style - Dynamic styling based on absence state
              backgroundColor: isAbsent ? '#ef4444' : 'var(--surface)',
              color: isAbsent ? 'var(--surface)' : '#64748b',
              borderColor: isAbsent ? '#ef4444' : 'var(--border)',
              fontWeight: isAbsent ? '700' : '500',
              boxShadow: isAbsent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Absent
          </button>
          <button
            type="button"
            aria-pressed={isPresent}
            onClick={(event) => {
              event.stopPropagation();
              onSetAttendance(item.profileId, isPresent ? 'Pending' : 'Present');
            }}
            className="btn admin-checkin-present-btn"
            style={{ /* @allow-inline-style */
              // @allow-inline-style - Dynamic styling based on presence state
              backgroundColor: isPresent ? 'var(--primary)' : 'var(--surface)',
              color: isPresent ? 'var(--surface)' : 'var(--primary-deep)',
              borderColor: isPresent ? 'var(--primary)' : 'var(--border)',
              fontWeight: isPresent ? '700' : '600',
              boxShadow: isPresent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Present
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm admin-checkin-mobile-more"
            aria-expanded={isSecondaryOpen}
            aria-controls={secondaryPanelId}
            onClick={(event) => {
              event.stopPropagation();
              setIsSecondaryOpen((previous) => !previous);
            }}
          >
            {isSecondaryOpen ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {/* Row Segment 2: Folder tracking & Edit Singer details */}
      <div className="admin-checkin-bottom-row admin-checkin-secondary-panel" id={secondaryPanelId}>
        <div className="admin-checkin-meta">
          {/* Folder Number */}
          <div className="admin-checkin-folder-group">
            <span className="admin-checkin-folder-label">
              Folder
            </span>
            <FolderInput
              initialValue={item.folderNumber}
              onSave={(val) => onUpdateFolder(item.profileId, val, item.folderReturned)}
            />
          </div>

          {/* Folder Returned Checkbox */}
          <label className="admin-checkin-returned-label" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={item.folderReturned}
              onChange={(e) => onUpdateFolder(item.profileId, item.folderNumber, e.target.checked)}
              className="admin-checkin-returned-checkbox"
            />
            <span
              className="admin-checkin-returned-text"
              style={{ /* @allow-inline-style */
                // @allow-inline-style - Dynamic text color based on returned state
                color: item.folderReturned ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              {item.folderReturned ? 'RETURNED' : 'NOT RETURNED'}
            </span>
          </label>
        </div>

        {/* Edit Profile */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(item.profileId);
          }}
          className="admin-checkin-edit-btn"
        >
          ✏️ Edit
        </button>
      </div>
    </div>
  );
};

// Extract last name from a full name string
const getLastName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
};

// Compare two full name strings by last name first
const compareLastNames = (a: string, b: string): number => {
  const lastA = getLastName(a);
  const lastB = getLastName(b);
  const cmp = lastA.localeCompare(lastB);
  if (cmp !== 0) return cmp;
  return a.localeCompare(b);
};

import { useVoiceParts } from '../../hooks/useVoiceParts';

export const CheckInList: React.FC<CheckInListProps> = ({ items, onSetAttendance, onUpdateFolder, onEdit, sortBy, missCounts, maxRehearsalMisses }) => {
  const { voiceParts, sections } = useVoiceParts();

  const voicePartOrder = useMemo(() => {
    const order: Record<string, number> = {};
    voiceParts.forEach((p, index) => {
      order[p.label] = index + 1;
    });
    return order;
  }, [voiceParts]);

  const sectionOrderMap = useMemo(() => {
    const order: Record<string, number> = {};
    sections.forEach((s, index) => {
      order[s.code] = index + 1;
    });
    return order;
  }, [sections]);

  const voicePartToSectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    voiceParts.forEach(vp => {
      map[vp.label] = vp.sectionCode;
    });
    return map;
  }, [voiceParts]);

  const sectionNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => {
      map[s.code] = s.name;
    });
    return map;
  }, [sections]);

  // Partition items into checked-in and not-checked-in subsets
  const notCheckedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance !== 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        } else if (sortBy === 'section') {
          const secA = sectionOrderMap[voicePartToSectionMap[a.voicePart] || ''] ?? 99;
          const secB = sectionOrderMap[voicePartToSectionMap[b.voicePart] || ''] ?? 99;
          if (secA !== secB) return secA - secB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy, voicePartOrder, sectionOrderMap, voicePartToSectionMap]);

  const checkedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        } else if (sortBy === 'section') {
          const secA = sectionOrderMap[voicePartToSectionMap[a.voicePart] || ''] ?? 99;
          const secB = sectionOrderMap[voicePartToSectionMap[b.voicePart] || ''] ?? 99;
          if (secA !== secB) return secA - secB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy, voicePartOrder, sectionOrderMap, voicePartToSectionMap]);

  // Render rows, adding dividers between voice parts or sections
  const renderListWithHeaders = (listItems: AttendanceItem[]) => {
    let lastHeaderValue = '';

    return listItems.map((item) => {
      let showHeader = false;
      let headerText = '';

      if (sortBy === 'voicePart') {
        showHeader = item.voicePart !== lastHeaderValue;
        if (showHeader) {
          lastHeaderValue = item.voicePart;
          headerText = item.voicePart;
        }
      } else if (sortBy === 'section') {
        const sectionCode = voicePartToSectionMap[item.voicePart] || 'Other';
        showHeader = sectionCode !== lastHeaderValue;
        if (showHeader) {
          lastHeaderValue = sectionCode;
          headerText = sectionNameMap[sectionCode] || sectionCode;
        }
      }

      return (
        <React.Fragment key={item.id}>
          {showHeader && (
            <div 
              className="roster-ut-list-header-container"
            >
              <span 
                className="roster-ut-list-header-text"
              >
                {headerText}
              </span>
              <div className="roster-ut-list-header-line"></div>
            </div>
          )}
          <CheckInRow 
            item={item} 
            onSetAttendance={onSetAttendance}
            onUpdateFolder={onUpdateFolder}
            onEdit={onEdit}
            missCounts={missCounts}
            maxRehearsalMisses={maxRehearsalMisses}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex-col roster-ut-checkin-wrapper">
      {/* 1. Unchecked / Absent Singers */}
      {renderListWithHeaders(notCheckedIn)}

      {/* 2. Beautiful Checked-In Divider */}
      {checkedIn.length > 0 && (
        <div 
          className="flex-row roster-ut-checked-in-divider-container"
        >
          <div className="roster-ut-checked-in-divider-line-left"></div>
          <span 
            className="roster-ut-checked-in-divider-text"
          >
            ✓ Checked In ({checkedIn.length})
          </span>
          <div className="roster-ut-checked-in-divider-line-right"></div>
        </div>
      )}

      {/* 3. Checked-In Singers */}
      {renderListWithHeaders(checkedIn)}

      {/* 4. Empty State */}
      {items.length === 0 && (
        <div className="card roster-ut-empty-state-card">
          <p className="text-muted text-sm">No active singers found in the roster.</p>
        </div>
      )}
    </div>
  );
};
