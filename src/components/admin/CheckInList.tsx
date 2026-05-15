import React from 'react';
import type { EventRoster } from '../../services/rosterService';

interface CheckInListProps {
  rosters: EventRoster[];
  onToggle: (rosterId: string, current: string) => Promise<void>;
}

export const CheckInList: React.FC<CheckInListProps> = ({ rosters, onToggle }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rosters.map((r) => {
        const profile = (r.expand as any)?.profile;
        const isPresent = r.attendance === 'Present';
        const isAbsent = r.attendance === 'Absent';
        
        return (
          <div key={r.id} style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '12px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{profile?.name || 'Unknown Singer'}</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>{profile?.voicePart}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
               <button 
                onClick={() => onToggle(r.id, isPresent ? 'Present' : 'Pending')}
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
                onClick={() => onToggle(r.id, isAbsent ? 'Absent' : 'Pending')}
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
      {rosters.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>No singers RSVP'd "Yes" for this event.</div>
      )}
    </div>
  );
};
