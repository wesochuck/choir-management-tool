import React from 'react';
import type { Profile } from '../../services/profileService';

interface RosterTableProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({ profiles, onEdit }) => {
  return (
    <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f4f8' }}>
            <th style={{ padding: '12px' }}>Name</th>
            <th style={{ padding: '12px' }}>Voice</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Phone</th>
            <th style={{ padding: '12px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
              <td style={{ padding: '12px' }}>{p.name}</td>
              <td style={{ padding: '12px' }}><strong>{p.voicePart}</strong></td>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  backgroundColor: p.globalStatus.includes('Active') ? '#e6fffa' : '#fff5f5',
                  color: p.globalStatus.includes('Active') ? '#2c7a7b' : '#c53030'
                }}>
                  {p.globalStatus}
                </span>
              </td>
              <td style={{ padding: '12px' }}>{p.phone}</td>
              <td style={{ padding: '12px' }}>
                <button 
                  onClick={() => onEdit(p)}
                  style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No singers found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
