import React, { useMemo, useState, useEffect } from 'react';
import type { AttendanceItem } from '../../hooks/useAttendance';

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
  const isPresent = item.attendance === 'Present';
  const isAbsent = item.attendance === 'Absent';

  return (
    <div
      className="card"
      style={{
        padding: '12px 20px',
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
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
        transition: 'all 0.15s ease-in-out'
      }}
    >
      {/* Left Section: Singer name and details */}
      <div className="flex-col" style={{ gap: '2px', minWidth: '220px', flex: '1 1 auto' }}>
        <div className="flex-row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: isPresent 
                ? 'var(--primary-deep)' 
                : isAbsent 
                  ? '#991b1b' 
                  : 'var(--text-main)',
              letterSpacing: '-0.02em',
              lineHeight: '1.2'
            }}
          >
            {item.name}
          </span>
          
          <div className="flex-row" style={{ gap: '6px' }}>
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
      </div>

      {/* Middle Section: Folder tracking & Edit */}
      <div 
        className="flex-row" 
        style={{ 
          gap: '20px', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          flex: '0 1 auto'
        }}
      >
        {/* Folder Number */}
        <div className="flex-row" style={{ gap: '6px', alignItems: 'center' }}>
          <span 
            className="text-xs" 
            style={{ 
              fontWeight: 700, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}
          >
            Folder
          </span>
          <FolderInput
            initialValue={item.folderNumber}
            onSave={(val) => onUpdateFolder(item.profileId, val, item.folderReturned)}
          />
        </div>

        {/* Folder Returned Checkbox */}
        <label
          className="flex-row"
          onClick={(event) => event.stopPropagation()}
          style={{ gap: '8px', cursor: 'pointer', userSelect: 'none', alignItems: 'center' }}
        >
          <input
            type="checkbox"
            checked={item.folderReturned}
            onChange={(e) => onUpdateFolder(item.profileId, item.folderNumber, e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              accentColor: 'var(--primary)',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          />
          <span
            className="text-xs"
            style={{
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.02em',
              color: item.folderReturned ? 'var(--primary)' : 'var(--text-muted)'
            }}
          >
            {item.folderReturned ? 'RETURNED' : 'NOT RETURNED'}
          </span>
        </label>

        {/* Edit Profile */}
        <button
          type="button"
          onClick={() => onEdit(item.profileId)}
          className="btn btn-ghost btn-sm"
          style={{
            height: '32px',
            padding: '0 10px',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)'
          }}
        >
          ✏️ Edit
        </button>
      </div>

      {/* Right Section: Attendance segmented control buttons */}
      <div
        className="flex-row"
        style={{
          gap: '2px',
          backgroundColor: '#f1f5f9', // iOS style background segment container
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          flex: '0 0 auto'
        }}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSetAttendance(item.profileId, 'Present');
          }}
          className="btn"
          style={{
            height: '30px',
            padding: '0 14px',
            fontSize: '0.75rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isPresent ? 'var(--primary)' : 'transparent',
            color: isPresent ? 'var(--surface)' : '#475569',
            fontWeight: isPresent ? '700' : '600',
            boxShadow: isPresent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Present
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSetAttendance(item.profileId, 'Absent');
          }}
          className="btn"
          style={{
            height: '30px',
            padding: '0 14px',
            fontSize: '0.75rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isAbsent ? '#ef4444' : 'transparent',
            color: isAbsent ? 'var(--surface)' : '#475569',
            fontWeight: isAbsent ? '700' : '600',
            boxShadow: isAbsent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Absent
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

const voicePartOrder: Record<string, number> = {
  'S1': 1, 'S2': 2, 'A1': 3, 'A2': 4,
  'T1': 5, 'T2': 6, 'B1': 7, 'B2': 8
};

export const CheckInList: React.FC<CheckInListProps> = ({ items, onSetAttendance, onUpdateFolder, onEdit, sortBy }) => {
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
  }, [items, sortBy]);

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
  }, [items, sortBy]);

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
