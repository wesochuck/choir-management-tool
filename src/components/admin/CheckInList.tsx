import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AttendanceItem } from '../../hooks/useAttendance';
import './CheckInList.css';

interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
  sortBy: 'lastName' | 'voicePart';
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
      className="card"
      style={{
        width: '55px',
        padding: '0 6px',
        textAlign: 'center',
        height: '32px',
        fontSize: '0.85rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        boxShadow: 'none',
        backgroundColor: 'var(--surface)'
      }}
    />
  );
};

// Extracted CheckInRow sub-component to keep code DRY and maintainable
const CheckInRow: React.FC<{
  item: AttendanceItem;
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
}> = ({ item, onSetAttendance, onUpdateFolder, onEdit }) => {
  const navigate = useNavigate();
  const isPresent = item.attendance === 'Present';
  const isAbsent = item.attendance === 'Absent';
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const secondaryPanelId = `checkin-secondary-${item.profileId}`;

  return (
    <div
      className={`card admin-checkin-row checkin-row ${isSecondaryOpen ? 'secondary-open' : ''}`}
      onClick={() => onSetAttendance(item.profileId, isPresent ? 'Pending' : 'Present')}
      style={{
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
              className="admin-checkin-name"
              onClick={(event) => {
                event.stopPropagation();
                const query = new URLSearchParams({
                  singerId: item.profileId,
                  openModal: 'true',
                });
                navigate(`/admin/roster?${query.toString()}`);
              }}
              style={{
                color: isPresent 
                  ? 'var(--primary-deep)' 
                  : isAbsent 
                    ? '#991b1b' 
                    : 'var(--text-main)',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              title="Click to view full roster profile"
            >
              {item.name}
            </span>
            
            <div className="admin-checkin-badges">
              {item.rsvp === 'Yes' && (
                <span 
                  className="badge badge-rehearsal" 
                  style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  RSVP
                </span>
              )}
              <span
                className="badge"
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-deep)',
                  border: '1px solid rgba(74, 117, 89, 0.2)'
                }}
              >
                {item.voicePart}
              </span>
            </div>
          </div>
          <div className="admin-checkin-status-summary">
            <span>{item.voicePart}</span>
            {item.rsvp === 'Yes' && <span>RSVP</span>}
            <span>Folder {item.folderNumber || '--'}</span>
            <span>{item.folderReturned ? 'Returned' : 'Not returned'}</span>
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
            style={{
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
            style={{
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
              style={{
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

export const CheckInList: React.FC<CheckInListProps> = ({ items, onSetAttendance, onUpdateFolder, onEdit, sortBy }) => {
  const { voiceParts } = useVoiceParts();

  const voicePartOrder = useMemo(() => {
    const order: Record<string, number> = {};
    voiceParts.forEach((p, index) => {
      order[p.label] = index + 1;
    });
    return order;
  }, [voiceParts]);

  // Partition items into checked-in and not-checked-in subsets
  const notCheckedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance !== 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy, voicePartOrder]);

  const checkedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy, voicePartOrder]);

  // Render rows, adding dividers between voice parts if sortBy === 'voicePart'
  const renderListWithHeaders = (listItems: AttendanceItem[]) => {
    let lastVoicePart = '';

    return listItems.map((item) => {
      const showHeader = sortBy === 'voicePart' && item.voicePart !== lastVoicePart;
      if (showHeader) {
        lastVoicePart = item.voicePart;
      }

      return (
        <React.Fragment key={item.id}>
          {showHeader && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                margin: '18px 0 8px 0', 
                gap: '12px',
                width: '100%' 
              }}
            >
              <span 
                style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 800, 
                  color: 'var(--primary-deep)', 
                  letterSpacing: '0.05em',
                  width: '32px'
                }}
              >
                {item.voicePart}
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(74, 117, 89, 0.15)' }}></div>
            </div>
          )}
          <CheckInRow 
            item={item} 
            onSetAttendance={onSetAttendance}
            onUpdateFolder={onUpdateFolder}
            onEdit={onEdit}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex-col" style={{ gap: '12px', width: '100%' }}>
      {/* 1. Unchecked / Absent Singers */}
      {renderListWithHeaders(notCheckedIn)}

      {/* 2. Beautiful Checked-In Divider */}
      {checkedIn.length > 0 && (
        <div 
          className="flex-row"
          style={{ 
            alignItems: 'center', 
            margin: '24px 0 12px 0', 
            gap: '16px',
            width: '100%'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--border))' }}></div>
          <span 
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              color: 'var(--primary-deep)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em',
              backgroundColor: 'var(--surface)',
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1px solid rgba(74, 117, 89, 0.25)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ✓ Checked In ({checkedIn.length})
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--border))' }}></div>
        </div>
      )}

      {/* 3. Checked-In Singers */}
      {renderListWithHeaders(checkedIn)}

      {/* 4. Empty State */}
      {items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p className="text-muted text-sm">No active singers found in the roster.</p>
        </div>
      )}
    </div>
  );
};
