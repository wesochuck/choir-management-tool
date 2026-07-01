import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import type { EventRoster } from '../../services/rosterService';
import { pb } from '../../lib/pocketbase';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../lib/labelHelpers';
import { PhotoUploader } from '../common/PhotoUploader';
import { Badge, Button, DataTable, Dropdown, DropdownMenu, DropdownMenuItem } from '../ui';
import type { ColumnDef } from '../ui';
import { getRsvpDisplay } from '../../lib/statusDisplay';

interface EventRosterSinger {
  profile: Profile;
  rsvp: 'Yes' | 'No' | 'Pending';
  roster?: EventRoster;
}

interface EventRosterTableProps {
  singers: EventRosterSinger[];
  isUpdating: boolean;
  onCreate?: () => void;
  onUpdateRSVP: (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => Promise<void>;
  onPhotoChange?: () => void;
  onSingerClick?: (profile: Profile) => void;
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
  selectedSingerIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
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
  selectedSingerIds,
  onSelectionChange,
}) => {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
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
                className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left text-lg font-semibold text-emerald-700 transition-colors duration-150 hover:text-emerald-800 hover:underline"
              >
                {p.name}
              </button>
            ) : (
              <span className="text-lg font-semibold text-slate-800">{p.name}</span>
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
      cell: ({ row }) => {
        const profileId = row.original.profile.id;
        const rsvp = row.original.rsvp;
        const profileName = row.original.profile.name;

        return (
          <div onClick={(e) => e.stopPropagation()}>
            {/* Desktop actions */}
            <div className="hidden items-center justify-end gap-1.5 sm:flex">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onUpdateRSVP(profileId, 'Yes')}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  rsvp === 'Yes'
                    ? 'bg-emerald-700 text-white'
                    : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Attending
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onUpdateRSVP(profileId, 'No')}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  rsvp === 'No'
                    ? 'bg-red-600 text-white'
                    : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Declined
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onUpdateRSVP(profileId, 'Pending')}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  rsvp === 'Pending'
                    ? 'bg-slate-500 text-white'
                    : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Reset
              </button>
            </div>

            {/* Mobile actions: Attending visible + overflow menu */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onUpdateRSVP(profileId, 'Yes')}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  rsvp === 'Yes'
                    ? 'bg-emerald-700 text-white'
                    : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Attending
              </button>
              <Dropdown
                trigger={
                  <button
                    type="button"
                    disabled={isUpdating}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`More RSVP actions for ${profileName}`}
                  >
                    ⋯
                  </button>
                }
              >
                <DropdownMenu>
                  <DropdownMenuItem
                    disabled={isUpdating}
                    onClick={() => onUpdateRSVP(profileId, 'No')}
                  >
                    Mark Declined
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isUpdating}
                    onClick={() => onUpdateRSVP(profileId, 'Pending')}
                  >
                    Reset RSVP
                  </DropdownMenuItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        );
      },
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];

  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedSingerIds.forEach((id) => {
      selection[id] = true;
    });
    return selection;
  }, [selectedSingerIds]);

  return (
    <DataTable
      columns={columns}
      data={singers}
      isLoading={false}
      emptyState={{
        title: `No ${performerLabelPlural} found.`,
        icon: '🎵',
        action: onCreate ? (
          <Button onClick={onCreate} variant="primary" size="small">
            + Add {performerLabelPlural}
          </Button>
        ) : undefined,
      }}
      pageSize={25}
      paginationLabel={performerLabelPlural.toLowerCase()}
      onRowClick={onSingerClick ? (row) => onSingerClick(row.profile) : undefined}
      getRowId={(s) => s.profile.id}
      enableSelection
      rowSelection={rowSelection}
      onSelectionChange={onSelectionChange}
      getRowClassName={(row) => (selectedSingerIds.has(row.profile.id) ? 'bg-emerald-50/60' : '')}
    />
  );
};
