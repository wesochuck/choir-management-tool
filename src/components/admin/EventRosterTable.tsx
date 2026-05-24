import React from 'react';
import type { Profile } from '../../services/profileService';
import type { EventRoster } from '../../services/rosterService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { AppCard } from '../common/AppCard';

interface EventRosterTableProps {
  singers: Array<{
    profile: Profile;
    rsvp: 'Yes' | 'No' | 'Pending';
    roster?: EventRoster;
  }>;
  isUpdating: boolean;
  onUpdateRSVP: (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => Promise<void>;
  onPhotoChange?: () => void;
}

export const EventRosterTable: React.FC<EventRosterTableProps> = ({
  singers,
  isUpdating,
  onUpdateRSVP,
  onPhotoChange,
}) => {
  return (
    <AppCard noPadding>
      <div className="admin-table-wrapper">
        <table className="admin-responsive-table">
          <thead>
            <tr>
              <th className="text-label">Name</th>
              <th className="text-label">Voice</th>
              <th className="text-label" style={{ textAlign: 'center' }}>RSVP Status</th>
              <th className="text-label" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {singers.map((s) => {
              const p = s.profile;
              return (
                <tr 
                  key={p.id} 
                  className="relative-row"
                >
                  <td data-label="Name" style={{ fontWeight: 500 }}>
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
                  <td data-label="Voice">
                    <span className="text-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.voicePart || '--'}</span>
                  </td>
                  <td data-label="RSVP Status" style={{ textAlign: 'center' }}>
                    <span 
                      className={`badge ${
                        s.rsvp === 'Yes' 
                          ? 'badge-rehearsal' 
                          : s.rsvp === 'No' 
                            ? 'badge-performance' 
                            : ''
                      }`}
                      style={{
                        backgroundColor: s.rsvp === 'Pending' ? 'var(--border)' : undefined,
                        color: s.rsvp === 'Pending' ? 'var(--text-muted)' : undefined,
                        fontWeight: 600
                      }}
                    >
                      {s.rsvp === 'Yes' ? '🟢 Attending' : s.rsvp === 'No' ? '🔴 Declined' : '⏳ No Response'}
                    </span>
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <div className="flex-row" style={{ gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onUpdateRSVP(p.id, 'Yes')}
                        className="btn btn-sm"
                        style={{
                          height: '32px',
                          padding: '0 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: s.rsvp === 'Yes' ? 'var(--primary-deep)' : 'transparent',
                          color: s.rsvp === 'Yes' ? '#ffffff' : 'var(--text-muted)',
                          border: `1px solid ${s.rsvp === 'Yes' ? 'var(--primary-deep)' : 'var(--border)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Attending
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onUpdateRSVP(p.id, 'No')}
                        className="btn btn-sm"
                        style={{
                          height: '32px',
                          padding: '0 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: s.rsvp === 'No' ? '#ef4444' : 'transparent',
                          color: s.rsvp === 'No' ? '#ffffff' : 'var(--text-muted)',
                          border: `1px solid ${s.rsvp === 'No' ? '#ef4444' : 'var(--border)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Declined
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onUpdateRSVP(p.id, 'Pending')}
                        className="btn btn-sm"
                        style={{
                          height: '32px',
                          padding: '0 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: s.rsvp === 'Pending' ? '#6b7280' : 'transparent',
                          color: s.rsvp === 'Pending' ? '#ffffff' : 'var(--text-muted)',
                          border: `1px solid ${s.rsvp === 'Pending' ? '#6b7280' : 'var(--border)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {singers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                  <p className="text-muted text-sm">No singers found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppCard>
  );
};
