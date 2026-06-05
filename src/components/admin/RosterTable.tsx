import React from 'react';
import type { Profile } from '../../services/profileService';
import type { SeasonalDue } from '../../services/duesService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { Pagination } from '../common/Pagination';
import { AppCard } from '../common/AppCard';
import { StatusBadge } from '../common/StatusBadge';
import { getGlobalStatusDisplay } from '../../lib/statusDisplay';
import './RosterComponents.css';

interface RosterTableProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onPhotoChange?: () => void;
  currentSeason?: string;
  duesMap?: Record<string, SeasonalDue>;
  onToggleDues?: (profileId: string, paid: boolean) => void;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({ 
  profiles, 
  onEdit, 
  onPhotoChange, 
  currentSeason, 
  duesMap, 
  onToggleDues,
  currentPage,
  pageSize,
  totalCount,
  onPageChange
}) => {
  return (
    <AppCard noPadding>
      <div className="admin-table-wrapper">
        <table className="admin-responsive-table">
          <thead>
            <tr>
              <th className="text-label">Name</th>
              <th className="text-label">Login</th>
              <th className="text-label">Voice</th>
              <th className="text-label">Status</th>
              {currentSeason && (
                <th className="text-label">Dues Paid</th>
              )}
              <th className="text-label">Phone</th>
              <th className="text-label">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const statusDisplay = getGlobalStatusDisplay(p.globalStatus);
              return (
                <tr 
                  key={p.id} 
                  className="relative-row" 
                  onClick={() => onEdit(p)}
                >
                  <td data-label="Name" className="roster-cmp-font-500">
                    <div className="roster-cmp-name-container">
                      <PhotoUploader
                        profileId={p.id}
                        profileName={p.name}
                        currentPhotoUrl={p.photo ? pb.files.getURL(p, p.photo) : undefined}
                        size="sm"
                        onSuccess={onPhotoChange}
                        readOnlyOnDesktop={true}
                      />
                      <span>{p.name}</span>
                      {p.expand?.user?.role === 'admin' && (
                        <span className="badge badge-admin roster-cmp-admin-badge">Admin</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Login" className="text-muted text-sm">
                    {p.expand?.user?.email || 'No login'}
                  </td>
                  <td data-label="Voice">
                    <span className="text-label roster-cmp-voice-part">{p.voicePart}</span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge
                      label={statusDisplay.label}
                      tone={statusDisplay.tone}
                      size="sm"
                    />
                  </td>
                {currentSeason && (
                  <td data-label="Dues Paid" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={duesMap?.[p.id]?.paid || false}
                      onChange={(e) => onToggleDues?.(p.id, e.target.checked)}
                      className="roster-cmp-checkbox"
                    />
                  </td>
                )}
                <td data-label="Phone" className="text-muted text-sm">{p.phone}</td>
                <td data-label="Actions">
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
              );
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={currentSeason ? 7 : 6} className="roster-cmp-empty-state-cell">
                  <p className="text-muted text-sm">No singers found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalCount > 0 && (
        <div className="flex-responsive no-print roster-cmp-pagination-footer">
          <span className="text-sm text-muted roster-cmp-pagination-info">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} singers
          </span>

          <Pagination 
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </AppCard>
  );
};
