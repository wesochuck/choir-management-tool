import React, { useState, useEffect } from 'react';
import type { Profile } from '../../services/profileService';
import type { SeasonalDue } from '../../services/duesService';
import { pb } from '../../lib/pocketbase';
import { Pagination } from '../common/Pagination';
import { AppCard } from '../common/AppCard';
import { getGlobalStatusDisplay } from '../../lib/statusDisplay';
import { Button, Badge } from '../ui';

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

const getInitials = (name: string) => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const RosterTable: React.FC<RosterTableProps> = ({ 
  profiles, 
  onEdit, 
  currentSeason, 
  duesMap, 
  onToggleDues,
  currentPage,
  pageSize,
  totalCount,
  onPageChange
}) => {
  const [activePhoto, setActivePhoto] = useState<{ url: string; name: string; voicePart?: string } | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!activePhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto]);

  return (
    <AppCard noPadding>
      <div className="overflow-x-auto rounded-t-xl">
        <table className="min-w-full divide-y divide-border bg-surface">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Name</th>
              <th className="hidden sm:table-cell px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Login</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Voice</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Status</th>
              {currentSeason && (
                <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Dues Paid</th>
              )}
              <th className="hidden md:table-cell px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Phone</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold tracking-wider text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {profiles.map((p) => {
              const statusDisplay = getGlobalStatusDisplay(p.globalStatus);
              const photoUrl = p.photo ? pb.files.getURL(p, p.photo) : undefined;
              const initials = getInitials(p.name);

              return (
                <tr 
                  key={p.id} 
                  className="transition-colors hover:bg-slate-50/50 cursor-pointer" 
                  onClick={() => onEdit(p)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-text">
                    <div className="flex items-center gap-3">
                      {/* Interactive Avatar */}
                      <div 
                        onClick={(e) => {
                          if (photoUrl) {
                            e.stopPropagation();
                            setActivePhoto({ url: photoUrl, name: p.name, voicePart: p.voicePart });
                          }
                        }}
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 transition-all duration-200 select-none ${
                          photoUrl ? 'cursor-zoom-in hover:scale-105 hover:border-primary/50' : 'cursor-default'
                        }`}
                      >
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={p.name}
                            className="size-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-500 uppercase">
                            {initials}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        {p.expand?.user?.role === 'admin' && (
                          <span className="mt-1 inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-emerald-800 border border-emerald-200 uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 text-sm text-slate-500">
                    {p.expand?.user?.email || <span className="text-slate-300 italic">No login</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.voicePart ? (
                      <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-deep">
                        {p.voicePart}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge
                      label={statusDisplay.label}
                      tone={statusDisplay.tone}
                      size="sm"
                    />
                  </td>
                  {currentSeason && (
                    <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={duesMap?.[p.id]?.paid || false}
                        onChange={(e) => onToggleDues?.(p.id, e.target.checked)}
                        className="size-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-2"
                      />
                    </td>
                  )}
                  <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-500">
                    {p.phone || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right text-sm" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      onClick={() => onEdit(p)}
                      variant="ghost"
                      size="small"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={currentSeason ? 7 : 6} className="px-6 py-8 text-center">
                  <p className="text-slate-400 text-sm">No singers found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalCount > 0 && (
        <div className="no-print mt-1 flex flex-col items-center justify-between rounded-b-xl border-t border-border bg-surface px-6 py-4 md:flex-row">
          <span className="text-text-muted text-sm font-medium">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} singers
          </span>

          <Pagination 
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-opacity duration-300 animate-[modal-fade-in_0.2s_ease-out]"
          onClick={() => setActivePhoto(null)}
        >
          <div 
            className="relative max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 transition-all transform animate-[modal-slide-up_0.2s_ease-out] border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-100"
              aria-label="Close preview"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-slate-100 shadow-md">
              <img
                src={activePhoto.url}
                alt={activePhoto.name}
                className="size-full object-cover select-none"
              />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">{activePhoto.name}</h3>
              {activePhoto.voicePart && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-deep">
                  {activePhoto.voicePart}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </AppCard>
  );
};
