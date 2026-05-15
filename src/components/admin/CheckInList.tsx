import React, { useMemo } from 'react';
import type { AttendanceItem } from '../../hooks/useAttendance';

interface CheckInListProps {
  items: AttendanceItem[];
  onToggle: (profileId: string, current: string) => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
}

export const CheckInList: React.FC<CheckInListProps> = ({ items, onToggle, onUpdateFolder }) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sortedItems.map((item) => {
        const isPresent = item.attendance === 'Present';
        const isAbsent = item.attendance === 'Absent';
        
        return (
          <div key={item.id} style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '12px', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            opacity: isPresent ? 0.7 : 1,
            border: item.rsvp === 'Yes' ? '2px solid #e6fffa' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.name}</div>
                  {item.rsvp === 'Yes' && (
                    <span style={{ fontSize: '10px', backgroundColor: '#38a169', color: 'white', padding: '1px 6px', borderRadius: '10px' }}>RSVP</span>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: '#718096' }}>{item.voicePart}</div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => onToggle(item.profileId, isPresent ? 'Present' : 'Pending')}
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    border: 'none',
                    backgroundColor: isPresent ? '#48bb78' : '#edf2f7',
                    color: isPresent ? 'white' : '#4a5568',
                    fontWeight: 'bold',
                    minWidth: '90px'
                  }}
                >
                  {isPresent ? 'Present' : 'Mark'}
                </button>
                <button 
                  onClick={() => onToggle(item.profileId, isAbsent ? 'Absent' : 'Pending')}
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    border: 'none',
                    backgroundColor: isAbsent ? '#e53e3e' : '#edf2f7',
                    color: isAbsent ? 'white' : '#4a5568',
                    fontWeight: 'bold'
                  }}
                >
                  {isAbsent ? 'Absent' : '✗'}
                </button>
              </div>
            </div>

            {/* Folder Tracking UI */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid #f7fafc' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#718096' }}>FOLDER #</span>
                <input 
                  type="text"
                  value={item.folderNumber}
                  onChange={(e) => onUpdateFolder(item.profileId, e.target.value, item.folderReturned)}
                  placeholder="--"
                  style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}
                />
              </div>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginLeft: 'auto' }}>
                <input 
                  type="checkbox"
                  checked={item.folderReturned}
                  onChange={(e) => onUpdateFolder(item.profileId, item.folderNumber, e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: item.folderReturned ? '#38a169' : '#718096' }}>
                  {item.folderReturned ? 'RETURNED' : 'NOT RETURNED'}
                </span>
              </label>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>No active singers found in the roster.</div>
      )}
    </div>
  );
};
