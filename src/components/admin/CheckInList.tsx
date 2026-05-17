import React, { useMemo } from 'react';
import type { AttendanceItem } from '../../hooks/useAttendance';

interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
}

import { AppCard } from '../common/AppCard';

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
    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
      {sortedItems.map((item) => {
        const isPresent = item.attendance === 'Present';
        const isAbsent = item.attendance === 'Absent';
        
        return (
          <AppCard 
            key={item.id} 
            className="flex-col" 
            style={{ 
              opacity: isPresent ? 0.7 : 1,
              border: item.rsvp === 'Yes' ? '2px solid var(--primary-light)' : '1px solid var(--border)'
            }}
          >
            <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)', flex: 1 }}>
                <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                  <div className="text-headline" style={{ fontSize: '1.25rem' }}>{item.name}</div>
                  {item.rsvp === 'Yes' && (
                    <span className="badge badge-rehearsal">RSVP</span>
                  )}
                </div>
                <div className="text-muted text-label">{item.voicePart}</div>
              </div>
              
              <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetAttendance(item.profileId, 'Present');
                  }}
                  className={`btn ${isPresent ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ minWidth: '100px' }}
                >
                  Present
                </button>
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetAttendance(item.profileId, 'Absent');
                  }}
                  className={`btn ${isAbsent ? 'btn-danger' : 'btn-ghost'}`}
                >
                  Absent
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetAttendance(item.profileId, 'Pending');
                  }}
                  className="btn btn-ghost"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Folder Tracking UI */}
            <div className="flex-responsive" style={{ 
              justifyContent: 'space-between',
              paddingTop: 'var(--space-md)', 
              borderTop: '1px solid var(--border)',
              gap: 'var(--space-md)'
            }}>
              <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Folder #</span>
                <input 
                  type="text"
                  value={item.folderNumber}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(e) => onUpdateFolder(item.profileId, e.target.value, item.folderReturned)}
                  placeholder="--"
                  className="card"
                  style={{ width: '60px', padding: '0 6px', textAlign: 'center', height: '36px' }}
                />
              </div>
              
              <label
                className="flex-row"
                onClick={(event) => event.stopPropagation()}
                style={{ gap: 'var(--space-sm)', cursor: 'pointer' }}
              >
                <input 
                  type="checkbox"
                  checked={item.folderReturned}
                  onChange={(e) => onUpdateFolder(item.profileId, item.folderNumber, e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                />
                <span className="text-xs" style={{ fontWeight: 700, color: item.folderReturned ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {item.folderReturned ? 'RETURNED' : 'NOT RETURNED'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => onEdit(item.profileId)}
                className="btn btn-ghost btn-sm expanded-hit-area"
              >
                Edit Profile
              </button>
            </div>
          </AppCard>
        );
      })}
      {items.length === 0 && (
        <AppCard style={{ textAlign: 'center' }}>
          <p className="text-muted text-sm">No active singers found in the roster.</p>
        </AppCard>
      )}
    </div>
  );
};
