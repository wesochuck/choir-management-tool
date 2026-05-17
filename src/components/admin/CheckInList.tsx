import React, { useMemo, useState, useEffect } from 'react';
import type { AttendanceItem } from '../../hooks/useAttendance';

interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
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

export const CheckInList: React.FC<CheckInListProps> = ({ items, onSetAttendance, onUpdateFolder, onEdit }) => {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const order = { 'Pending': 0, 'Absent': 1, 'Present': 2 };
      const aVal = order[a.attendance] ?? 0;
      const bVal = order[b.attendance] ?? 0;
      if (aVal !== bVal) return aVal - bVal;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  return (
    <div className="flex-col" style={{ gap: '10px' }}>
      {sortedItems.map((item) => {
        const isPresent = item.attendance === 'Present';
        const isAbsent = item.attendance === 'Absent';
        const isPending = item.attendance === 'Pending';

        return (
          <div
            key={item.id}
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
                ? 'rgba(74, 117, 89, 0.06)' // extremely soft, premium mint green tint
                : isAbsent
                  ? 'rgba(153, 27, 27, 0.04)' // extremely soft, premium crimson/red tint
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
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onSetAttendance(item.profileId, 'Pending');
                }}
                className="btn"
                style={{
                  height: '30px',
                  padding: '0 14px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isPending ? '#cbd5e1' : 'transparent',
                  color: isPending ? '#1e293b' : '#94a3b8',
                  fontWeight: isPending ? '700' : '500',
                  boxShadow: isPending ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Reset
              </button>
            </div>

          </div>
        );
      })}
      {items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <p className="text-muted text-sm">No active singers found in the roster.</p>
        </div>
      )}
    </div>
  );
};
