import React from 'react';
import type { Profile } from '../../services/profileService';
import type { SeasonalDue } from '../../services/duesService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';

interface RosterTableProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onPhotoChange?: () => void;
  currentSeason?: string;
  duesMap?: Record<string, SeasonalDue>;
  onToggleDues?: (profileId: string, paid: boolean) => void;
}

import { AppCard } from '../common/AppCard';

export const RosterTable: React.FC<RosterTableProps> = ({ profiles, onEdit, onPhotoChange, currentSeason, duesMap, onToggleDues }) => {
  return (
    <AppCard noPadding style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Name</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Login</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Voice</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Status</th>
            {currentSeason && (
              <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Dues Paid</th>
            )}
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
                  <PhotoUploader
                    profileId={p.id}
                    profileName={p.name}
                    currentPhotoUrl={p.photo ? pb.files.getURL(p, p.photo) : undefined}
                    size="sm"
                    onSuccess={onPhotoChange}
                    readOnlyOnDesktop={true}
                  />
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
              {currentSeason && (
                <td style={{ padding: 'var(--space-md)' }} onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={duesMap?.[p.id]?.paid || false}
                    onChange={(e) => onToggleDues?.(p.id, e.target.checked)}
                    style={{
                      cursor: 'pointer',
                      accentColor: 'var(--primary)',
                      width: '18px',
                      height: '18px'
                    }}
                  />
                </td>
              )}
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
              <td colSpan={currentSeason ? 7 : 6} style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p className="text-muted text-sm">No singers found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AppCard>
  );
};
