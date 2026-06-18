import React, { useState, useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import type { SeasonalDue } from '../../services/duesService';
import { pb } from '../../lib/pocketbase';
import { AppCard } from '../common/AppCard';
import { getGlobalStatusDisplay } from '../../lib/statusDisplay';
import { Button, Badge, Modal, DataTable, type ColumnDef } from '../ui';

interface RosterTableProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onCreate?: () => void;
  onPhotoChange?: () => void;
  currentSeason?: string;
  duesMap?: Record<string, SeasonalDue>;
  onToggleDues?: (profileId: string, paid: boolean) => void;
  pageSize: number;
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
  onCreate,
  currentSeason,
  duesMap,
  onToggleDues,
  pageSize,
}) => {
  const [activePhoto, setActivePhoto] = useState<{
    url: string;
    name: string;
    voicePart?: string;
  } | null>(null);

  const columns: ColumnDef<Profile>[] = useMemo(() => {
    const duesColumn: ColumnDef<Profile> = {
      id: 'dues',
      header: 'Dues Paid',
      cell: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={duesMap?.[row.id]?.paid || false}
            onChange={(e) => onToggleDues?.(row.id, e.target.checked)}
            className="text-primary focus:ring-primary size-4 cursor-pointer rounded border-slate-300 focus:ring-offset-2"
          />
        </div>
      ),
      cardSection: 1,
      cardSide: 'right',
      cardLabel: 'Dues',
    };

    return [
      {
        id: 'name',
        header: 'Name',
        cell: (_, row) => {
          const photoUrl = row.photo ? pb.files.getURL(row, row.photo) : undefined;
          const initials = getInitials(row.name);
          return (
            <div className="flex items-center gap-3">
              <div
                onClick={(e) => {
                  if (photoUrl) {
                    e.stopPropagation();
                    setActivePhoto({ url: photoUrl, name: row.name, voicePart: row.voicePart });
                  }
                }}
                className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 transition-all duration-200 select-none ${
                  photoUrl
                    ? 'hover:border-primary/50 cursor-zoom-in hover:scale-105'
                    : 'cursor-default'
                }`}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={row.name}
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-500 uppercase">{initials}</span>
                )}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-slate-900">{row.name}</span>
                {row.expand?.user?.role === 'admin' && (
                  <span className="text-overline mt-1 inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
                    Admin
                  </span>
                )}
              </div>
            </div>
          );
        },
        cardSection: 0,
        cardSide: 'left',
      },
      {
        id: 'login',
        header: 'Login',
        cell: (_, row) =>
          row.expand?.user?.email || <span className="text-slate-300 italic">No login</span>,
        hideBelow: 'sm',
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Login',
      },
      {
        id: 'voice',
        header: 'Voice',
        cell: (_, row) =>
          row.voicePart ? (
            <span className="bg-primary-light text-primary-deep inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {row.voicePart}
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
        cardSection: 0,
        cardSide: 'right',
      },
      {
        id: 'status',
        header: 'Status',
        cell: (_, row) => {
          const statusDisplay = getGlobalStatusDisplay(row.globalStatus);
          return <Badge label={statusDisplay.label} tone={statusDisplay.tone} size="sm" />;
        },
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Status',
      },
      ...(currentSeason ? [duesColumn] : []),
      {
        id: 'phone',
        header: 'Phone',
        cell: (_, row) => row.phone || <span className="text-slate-300">—</span>,
        hideBelow: 'md',
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Phone',
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        cell: (_, row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button onClick={() => onEdit(row)} variant="outline" size="small">
              Edit
            </Button>
          </div>
        ),
        cardSection: 1,
        cardSide: 'right',
      },
    ];
  }, [currentSeason, duesMap, onEdit, onToggleDues]);

  return (
    <AppCard noPadding>
      <DataTable
        columns={columns}
        data={profiles}
        isLoading={false}
        emptyState={{
          title: 'No singers found.',
          icon: '🎵',
          action: onCreate ? (
            <Button onClick={onCreate} variant="primary" size="small">
              + Add Singer
            </Button>
          ) : undefined,
        }}
        pageSize={pageSize}
        paginationLabel="singers"
        onRowClick={(p) => onEdit(p)}
        getRowId={(p) => p.id}
      />

      <Modal
        isOpen={!!activePhoto}
        onClose={() => setActivePhoto(null)}
        title={activePhoto?.name}
        maxWidth="360px"
      >
        {activePhoto && (
          <div className="flex flex-col items-center gap-4">
            <div className="size-48 overflow-hidden rounded-full border-4 border-slate-100 shadow-md">
              <img
                src={activePhoto.url}
                alt={activePhoto.name}
                className="size-full object-cover select-none"
              />
            </div>
            {activePhoto.voicePart && (
              <span className="bg-primary-light text-primary-deep inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {activePhoto.voicePart}
              </span>
            )}
          </div>
        )}
      </Modal>
    </AppCard>
  );
};
