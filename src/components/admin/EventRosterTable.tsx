import React from 'react';
import type { Profile } from '../../services/profileService';
import type { EventRoster } from '../../services/rosterService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { AppCard } from '../common/AppCard';
import { StatusBadge } from '../common/StatusBadge';
import { getRsvpDisplay } from '../../lib/statusDisplay';
import './EventRosterTable.css';

interface EventRosterTableProps {
  singers: Array<{
    profile: Profile;
    rsvp: 'Yes' | 'No' | 'Pending';
    roster?: EventRoster;
  }>;
  isUpdating: boolean;
  onUpdateRSVP: (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => Promise<void>;
  onPhotoChange?: () => void;
  onSingerClick?: (profile: Profile) => void;
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}

export const EventRosterTable: React.FC<EventRosterTableProps> = ({
  singers,
  isUpdating,
  onUpdateRSVP,
  onPhotoChange,
  onSingerClick,
  missCounts,
  maxRehearsalMisses,
}) => {
  return (
    <AppCard noPadding>
      <div className="admin-table-wrapper">
        <table className="admin-responsive-table">
          <thead>
            <tr>
              <th className="text-label">Name</th>
              <th className="text-label">Voice</th>
              <th className="text-label roster-table-header-cell-center">Missed Rehearsals</th>
              <th className="text-label roster-table-header-cell-center">RSVP Status</th>
              <th className="text-label roster-table-header-cell-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {singers.map((s) => {
              const p = s.profile;
              const rsvpDisplay = getRsvpDisplay(s.rsvp, { variant: 'eventRoster' });
              return (
                <tr
                  key={p.id}
                  className="relative-row"
                >
                  <td data-label="Name" className="roster-table-header-row">
                    <div className="roster-table-header-name">
                      <PhotoUploader
                        profileId={p.id}
                        profileName={p.name}
                        currentPhotoUrl={p.photo ? pb.files.getURL(p, p.photo) : undefined}
                        size="sm"
                        onSuccess={onPhotoChange}
                        readOnlyOnDesktop={true}
                      />
                      {onSingerClick ? (
                        <button
                          type="button"
                          onClick={() => onSingerClick(p)}
                          className="roster-table-singer-link"
                        >
                          {p.name}
                        </button>
                      ) : (
                        <span>{p.name}</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Voice">
                    <span className="text-label roster-table-section-header">{p.voicePart || '--'}</span>
                  </td>
                  <td data-label="Missed Rehearsals" className="roster-table-header-cell-center">
                    {missCounts && missCounts[p.id] !== undefined && missCounts[p.id] > 0 ? (
                      <span
                        className="badge"
                        style={{ // @allow-inline-style - miss count color coding
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: missCounts[p.id] > (maxRehearsalMisses ?? 3) ? '#fee2e2' : '#fef3c7',
                          color: missCounts[p.id] > (maxRehearsalMisses ?? 3) ? '#991b1b' : '#92400e',
                          border: missCounts[p.id] > (maxRehearsalMisses ?? 3) ? '1px solid #fca5a5' : '1px solid #fde68a',
                          fontWeight: 800
                        }}
                      >
                        ⚠️ {missCounts[p.id]} missed
                      </span>
                    ) : (
                      <span className="roster-table-note-text">0</span>
                    )}
                  </td>
                  <td data-label="RSVP Status" className="roster-table-header-cell-center">
                    <div className="roster-table-flex-col roster-table-rsvp-wrapper">
                      <StatusBadge
                        label={rsvpDisplay.label}
                        tone={rsvpDisplay.tone}
                        size="sm"
                      />
                      {s.roster?.rsvpNote && s.rsvp === 'No' && (
                        <div className="text-xs roster-table-rsvp-note">
                          "{s.roster.rsvpNote}"
                        </div>
                      )}
                    </div>
                  </td>
                  <td data-label="Actions" className="roster-table-header-cell-right">
                    <div className="flex-row roster-table-actions-wrapper">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onUpdateRSVP(p.id, 'Yes')}
                        className="btn btn-sm"
                        style={{ // @allow-inline-style - RSVP status button coloring
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
                        style={{ // @allow-inline-style - RSVP status button coloring
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
                        style={{ // @allow-inline-style - RSVP status button coloring
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
                <td colSpan={5} className="roster-table-empty-cell">
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
