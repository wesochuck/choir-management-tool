import React, { useMemo } from 'react';
import type { AttendanceItem } from '../../hooks/useAttendance';

interface CheckInListProps {
  items: AttendanceItem[];
  onToggle: (profileId: string, current: string) => Promise<void>;
}

export const CheckInList: React.FC<CheckInListProps> = ({ items, onToggle }) => {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Sort by attendance status: Pending first, Absent second, Present last
      const order = { 'Pending': 0, 'Absent': 1, 'Present': 2 };
      const aVal = order[a.attendance] ?? 0;
      const bVal = order[b.attendance] ?? 0;

      if (aVal !== bVal) return aVal - bVal;

      // Secondary sort: Name
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sortedItems.map((item) => {
        const isPresent = item.attendance === 'Present';
        const isAbsent = item.attendance === 'Absent';
        
        return (
          <div key={item.id} style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '12px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            opacity: isPresent ? 0.7 : 1, // Dim checked-in ones slightly
            border: item.rsvp === 'Yes' ? '2px solid #e6fffa' : 'none' // Highlight RSVP'd Yes
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</div>
                {item.rsvp === 'Yes' && (
                  <span style={{ fontSize: '10px', backgroundColor: '#38a169', color: 'white', padding: '1px 6px', borderRadius: '10px' }}>RSVP</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#718096' }}>{item.voicePart}</div>
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
        );
      })}
      {items.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>No active singers found in the roster.</div>
      )}
    </div>
  );
};
