import React from 'react';
import type { Profile } from '../../services/profileService';
import type { EventRoster } from '../../services/rosterService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { Badge, Button, DataTable, type ColumnDef } from '../ui';
import { getRsvpDisplay } from '../../lib/statusDisplay';

interface EventRosterTableProps {
  singers: Array<{
    profile: Profile;
    rsvp: 'Yes' | 'No' | 'Pending';
    roster?: EventRoster;
  }>;
  isUpdating: boolean;
  onCreate?: () => void;
  onUpdateRSVP: (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => Promise<void>;
  onPhotoChange?: () => void;
  onSingerClick?: (profile: Profile) => void;
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}

export const EventRosterTable: React.FC<EventRosterTableProps> = ({
  singers,
  isUpdating,
  onCreate,
  onUpdateRSVP,
  onPhotoChange,
  onSingerClick,
  missCounts,
  maxRehearsalMisses,
}) => {
  const columns: ColumnDef<(typeof singers)[number]>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const p = row.original.profile;
        return (
          <div className="flex items-center gap-3">
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
                className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-emerald-700 transition-colors duration-150 hover:text-emerald-800 hover:underline"
              >
                {p.name}
              </button>
            ) : (
              <span className="font-medium text-slate-800">{p.name}</span>
            )}
          </div>
        );
      },
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'voice',
      header: 'Voice',
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-700">
          {row.original.profile.voicePart || '--'}
        </span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Voice',
      },
    },
    {
      id: 'missedRehearsals',
      header: 'Missed Rehearsals',
      cell: ({ row }) => {
        const id = row.original.profile.id;
        const count = missCounts?.[id];
        return count !== undefined && count > 0 ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              count > (maxRehearsalMisses ?? 3)
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            ⚠️ {count} missed
          </span>
        ) : (
          <span className="text-slate-400">0</span>
        );
      },
      meta: {
        align: 'center',
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Missed',
      },
    },
    {
      id: 'rsvp',
      header: 'RSVP Status',
      cell: ({ row }) => {
        const rsvpDisplay = getRsvpDisplay(row.original.rsvp, { variant: 'eventRoster' });
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge label={rsvpDisplay.label} tone={rsvpDisplay.tone} size="sm" />
            {row.original.roster?.rsvpNote && row.original.rsvp === 'No' && (
              <div className="max-w-[160px] text-xs leading-tight font-normal text-slate-400 italic">
                &quot;{row.original.roster.rsvpNote}&quot;
              </div>
            )}
          </div>
        );
      },
      meta: {
        align: 'center',
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateRSVP(row.original.profile.id, 'Yes')}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              row.original.rsvp === 'Yes'
                ? 'bg-emerald-700 text-white'
                : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Attending
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateRSVP(row.original.profile.id, 'No')}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              row.original.rsvp === 'No'
                ? 'bg-red-600 text-white'
                : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Declined
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateRSVP(row.original.profile.id, 'Pending')}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              row.original.rsvp === 'Pending'
                ? 'bg-slate-500 text-white'
                : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Reset
          </button>
        </div>
      ),
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={singers}
      isLoading={false}
      emptyState={{
        title: 'No singers found.',
        icon: '🎵',
        action: onCreate ? (
          <Button onClick={onCreate} variant="primary" size="small">
            + Add Singers
          </Button>
        ) : undefined,
      }}
      pageSize={25}
      paginationLabel="singers"
      onRowClick={onSingerClick ? (row) => onSingerClick(row.profile) : undefined}
      getRowId={(s) => s.profile.id}
    />
  );
};
