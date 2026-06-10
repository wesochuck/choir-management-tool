import React from 'react';
import type { Profile } from '../../services/profileService';
import type { SeasonalDue } from '../../services/duesService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { Pagination } from '../common/Pagination';
import { AppCard } from '../common/AppCard';
import { StatusBadge } from '../common/StatusBadge';
import { getGlobalStatusDisplay } from '../../lib/statusDisplay';

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
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
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
                  <td data-label="Name" className="font-medium">
                    <div className="flex items-center gap-2">
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
                        <span className="inline-flex h-fit items-center rounded bg-primary-light px-[5px] py-[1px] text-[0.65rem] font-bold tracking-wider text-primary uppercase">Admin</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Login" className="text-muted text-sm">
                    {p.expand?.user?.email || 'No login'}
                  </td>
                  <td data-label="Voice">
                    <span className="text-label font-bold text-primary">{p.voicePart}</span>
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
                      className="size-[18px] cursor-pointer accent-[var(--primary)]"
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
                <td colSpan={currentSeason ? 7 : 6} className="p-8 text-center">
                  <p className="text-muted text-sm">No singers found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalCount > 0 && (
        <div className="no-print mt-1 flex flex-col items-center justify-between rounded-b-lg border-t border-border bg-surface px-6 py-4 md:flex-row">
          <span className="text-muted text-sm font-medium">
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
