import React from 'react';
import type { Profile } from '../../services/profileService';
import { pb } from '../../lib/pocketbase';

interface RosterTableProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
}

import { AppCard } from '../common/AppCard';

export const RosterTable: React.FC<RosterTableProps> = ({ profiles, onEdit }) => {
  return (
    <AppCard noPadding style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Name</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Login</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Voice</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Status</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Phone</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr 
              key={p.id} 
              className="relative-row" 
              onClick={() => onEdit(p)}
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <td style={{ padding: 'var(--space-md)', fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {p.photo ? (
                    <img 
                      src={pb.files.getUrl(p, p.photo)} 
                      alt={p.name} 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--primary-light)', 
                        color: 'var(--primary-deep)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{p.name}</span>
                </div>
              </td>
              <td className="text-muted text-sm" style={{ padding: 'var(--space-md)' }}>
                {p.expand?.user?.email || 'No login'}
              </td>
              <td style={{ padding: 'var(--space-md)' }}>
                <span className="text-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.voicePart}</span>
              </td>
              <td style={{ padding: 'var(--space-md)' }}>
                <span className={`badge ${p.globalStatus.includes('Active') ? 'badge-rehearsal' : 'badge-performance'}`}>
                  {p.globalStatus}
                </span>
              </td>
              <td className="text-muted text-sm" style={{ padding: 'var(--space-md)' }}>{p.phone}</td>
              <td style={{ padding: 'var(--space-md)' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(p);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p className="text-muted text-sm">No singers found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AppCard>
  );
};
