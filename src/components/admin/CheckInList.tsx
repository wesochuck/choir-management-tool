import { useMemo } from 'react';
import type { RecordModel } from 'pocketbase';
import type { AttendanceItem } from '../../hooks/useAttendance';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { Badge, DataTable, type ColumnDef } from '../ui';
import { getRsvpDisplay } from '../../lib/statusDisplay';

interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onEdit: (profileId: string) => void;
  sortBy: 'lastName' | 'voicePart' | 'section';
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}

export const CheckInList: React.FC<CheckInListProps> = ({
  items,
  onSetAttendance,
  onEdit,
  missCounts,
  maxRehearsalMisses,
}) => {
  const { voiceParts, sections } = useVoiceParts();

  const voicePartToSectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    voiceParts.forEach((vp) => {
      map[vp.label] = vp.sectionCode;
    });
    return map;
  }, [voiceParts]);

  const sectionNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach((s) => {
      map[s.code] = s.name;
    });
    return map;
  }, [sections]);

  const notCheckedIn = useMemo(() => items.filter((i) => i.attendance !== 'Present'), [items]);
  const checkedIn = useMemo(() => items.filter((i) => i.attendance === 'Present'), [items]);

  const columns: ColumnDef<AttendanceItem>[] = [
    {
      id: 'singer',
      header: 'Singer',
      cell: (_, item) => {
        const photoUrl = item.photo
          ? pb.files.getURL(
              { id: item.profileId, collectionId: '', collectionName: 'profiles', created: '', updated: '' } as RecordModel,
              item.photo,
            )
          : undefined;
        return (
        <div className="flex items-center gap-3">
          <div className="pointer-events-none">
            <PhotoUploader
              profileId={item.profileId}
              profileName={item.name}
              currentPhotoUrl={photoUrl}
              size="sm"
              readOnlyOnDesktop={true}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(item.profileId)}
              className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-emerald-700 transition-colors duration-150 hover:text-emerald-800 hover:underline"
            >
              {item.name}
            </button>
            {item.rsvpNote && (
              <span className="max-w-[200px] truncate text-xs font-semibold text-red-600 italic" title={item.rsvpNote}>
                📝 {item.rsvpNote}
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
      id: 'voice',
      header: 'Voice',
      cell: (_, item) => (
        <span className="font-semibold text-emerald-700">{item.voicePart || '--'}</span>
      ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Voice',
    },
    {
      id: 'section',
      header: 'Section',
      cell: (_, item) => {
        const sectionCode = voicePartToSectionMap[item.voicePart] || 'Other';
        return <span className="text-sm font-medium text-slate-600">{sectionNameMap[sectionCode] || sectionCode}</span>;
      },
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Section',
    },
    {
      id: 'missed',
      header: 'Missed Rehearsals',
      align: 'center',
      cell: (_, item) => {
        const count = missCounts?.[item.profileId];
        return count !== undefined && count > 0 ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              count > (maxRehearsalMisses ?? 3) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            ⚠️ {count} missed
          </span>
        ) : (
          <span className="text-slate-400">0</span>
        );
      },
      hideBelow: 'sm',
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Missed',
    },
    {
      id: 'rsvp',
      header: 'RSVP',
      align: 'center',
      cell: (_, item) => {
        const rsvpDisplay = getRsvpDisplay(item.rsvp, { variant: 'eventRoster' });
        return <Badge label={rsvpDisplay.label} tone={rsvpDisplay.tone} size="sm" />;
      },
      hideBelow: 'sm',
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'attendance',
      header: 'Attendance',
      align: 'right',
      cell: (_, item) => {
        const isPresent = item.attendance === 'Present';
        const isAbsent = item.attendance === 'Absent';

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSetAttendance(item.profileId, 'Absent')}
              className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-sm transition ${
                isAbsent
                  ? 'bg-red-600 text-white'
                  : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
              }`}
            >
              ✗ Absent
            </button>
            <button
              type="button"
              onClick={() => onSetAttendance(item.profileId, 'Pending')}
              className="inline-flex items-center justify-center px-2 py-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-600"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => onSetAttendance(item.profileId, 'Present')}
              className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-sm transition ${
                isPresent
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
              }`}
            >
              ✓ Present
            </button>
          </div>
        );
      },
      cardSection: 1,
      cardSide: 'right',
    },
  ];

  return (
    <div className="flex w-full flex-col gap-3">
      {notCheckedIn.length === 0 && checkedIn.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
          No singers expected or matching current filters.
        </div>
      ) : (
        <>
          {notCheckedIn.length > 0 && (
            <DataTable
              columns={columns}
              data={notCheckedIn}
              isLoading={false}
              emptyState={{ title: '', icon: '' }}
              manualPagination
              onRowClick={(item) => onEdit(item.profileId)}
              getRowId={(item) => item.id}
              renderMobileCard={(item) => (
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-emerald-50"
                  onClick={() => onSetAttendance(item.profileId, 'Present')}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                    ✓
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.voicePart || '--'}</span>
                  </div>
                </div>
              )}
            />
          )}
          {checkedIn.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <span className="flex items-center gap-[6px] rounded-full border border-[rgb(74_117_89_/_25%)] bg-white px-4 py-[6px] text-[0.8rem] font-extrabold tracking-widest uppercase text-emerald-800 shadow-[0_2px_8px_rgb(0_0_0_/_3%)]">
                ✓ Checked In ({checkedIn.length})
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
            </div>
          )}
          {checkedIn.length > 0 && (
            <DataTable
              columns={columns}
              data={checkedIn}
              isLoading={false}
              emptyState={{ title: '', icon: '' }}
              manualPagination
              onRowClick={(item) => onEdit(item.profileId)}
              getRowId={(item) => item.id}
              renderMobileCard={(item) => (
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-emerald-50"
                  onClick={() => onSetAttendance(item.profileId, 'Absent')}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                    ✓
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.voicePart || '--'}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-700">Checked In</span>
                </div>
              )}
            />
          )}
        </>
      )}
    </div>
  );
};
