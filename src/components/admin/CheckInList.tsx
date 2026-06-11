import React, { useMemo } from 'react';
import type { RecordModel } from 'pocketbase';
import type { AttendanceItem } from '../../hooks/useAttendance';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { StatusBadge } from '../common/StatusBadge';
import { getRsvpDisplay } from '../../lib/statusDisplay';

interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onEdit: (profileId: string) => void;
  sortBy: 'lastName' | 'voicePart' | 'section';
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}

const getLastName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
};

const compareLastNames = (a: string, b: string): number => {
  const lastA = getLastName(a);
  const lastB = getLastName(b);
  const cmp = lastA.localeCompare(lastB);
  if (cmp !== 0) return cmp;
  return a.localeCompare(b);
};

const CheckInRow: React.FC<{
  item: AttendanceItem;
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onEdit: (profileId: string) => void;
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}> = ({ item, onSetAttendance, onEdit, missCounts, maxRehearsalMisses }) => {
  const isPresent = item.attendance === 'Present';
  const isAbsent = item.attendance === 'Absent';
  const isPending = item.attendance === 'Pending';

  const photoUrl = item.photo
    ? pb.files.getURL(
        {
          id: item.profileId,
          collectionId: '',
          collectionName: 'profiles',
          created: '',
          updated: '',
        } as RecordModel,
        item.photo
      )
    : undefined;

  const rsvpDisplay = getRsvpDisplay(item.rsvp, { variant: 'eventRoster' });

  return (
    <tr className="transition-colors hover:bg-slate-50/80">
      {/* Name and Avatar */}
      <td className="px-6 py-4 text-sm whitespace-nowrap">
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
              <span
                className="max-w-[200px] truncate text-xs font-semibold text-red-600 italic"
                title={item.rsvpNote}
              >
                📝 {item.rsvpNote}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Voice Part */}
      <td className="px-6 py-4 text-sm whitespace-nowrap">
        <span className="font-semibold text-emerald-700">{item.voicePart || '--'}</span>
      </td>

      {/* Missed Rehearsals */}
      <td className="px-6 py-4 text-center text-sm whitespace-nowrap">
        {missCounts &&
        missCounts[item.profileId] !== undefined &&
        missCounts[item.profileId] > 0 ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              missCounts[item.profileId] > (maxRehearsalMisses ?? 3)
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            ⚠️ {missCounts[item.profileId]} missed
          </span>
        ) : (
          <span className="text-slate-400">0</span>
        )}
      </td>

      {/* RSVP Status */}
      <td className="px-6 py-4 text-center text-sm whitespace-nowrap">
        <StatusBadge label={rsvpDisplay.label} tone={rsvpDisplay.tone} size="sm" />
      </td>

      {/* Attendance Action Buttons */}
      <td className="px-6 py-4 text-sm whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetAttendance(item.profileId, 'Present')}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              isPresent
                ? 'bg-emerald-700 text-white'
                : 'border border-slate-300 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Present
          </button>
          <button
            type="button"
            onClick={() => onSetAttendance(item.profileId, 'Absent')}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              isAbsent
                ? 'bg-red-600 text-white'
                : 'border border-slate-300 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Absent
          </button>
          <button
            type="button"
            onClick={() => onSetAttendance(item.profileId, 'Pending')}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              isPending
                ? 'bg-slate-500 text-white'
                : 'border border-slate-300 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Reset
          </button>
        </div>
      </td>
    </tr>
  );
};

export const CheckInList: React.FC<CheckInListProps> = ({
  items,
  onSetAttendance,
  onEdit,
  sortBy,
  missCounts,
  maxRehearsalMisses,
}) => {
  const { voiceParts, sections } = useVoiceParts();

  const voicePartOrder = useMemo(() => {
    const order: Record<string, number> = {};
    voiceParts.forEach((p, index) => {
      order[p.label] = index + 1;
    });
    return order;
  }, [voiceParts]);

  const sectionOrderMap = useMemo(() => {
    const order: Record<string, number> = {};
    sections.forEach((s, index) => {
      order[s.code] = index + 1;
    });
    return order;
  }, [sections]);

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

  const notCheckedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance !== 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        } else if (sortBy === 'section') {
          const secA = sectionOrderMap[voicePartToSectionMap[a.voicePart] || ''] ?? 99;
          const secB = sectionOrderMap[voicePartToSectionMap[b.voicePart] || ''] ?? 99;
          if (secA !== secB) return secA - secB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy, voicePartOrder, sectionOrderMap, voicePartToSectionMap]);

  const checkedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        } else if (sortBy === 'section') {
          const secA = sectionOrderMap[voicePartToSectionMap[a.voicePart] || ''] ?? 99;
          const secB = sectionOrderMap[voicePartToSectionMap[b.voicePart] || ''] ?? 99;
          if (secA !== secB) return secA - secB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy, voicePartOrder, sectionOrderMap, voicePartToSectionMap]);

  const renderRowsWithHeaders = (listItems: AttendanceItem[]) => {
    let lastHeaderValue = '';

    return listItems.map((item) => {
      let showHeader = false;
      let headerText = '';

      if (sortBy === 'voicePart') {
        showHeader = item.voicePart !== lastHeaderValue;
        if (showHeader) {
          lastHeaderValue = item.voicePart;
          headerText = item.voicePart;
        }
      } else if (sortBy === 'section') {
        const sectionCode = voicePartToSectionMap[item.voicePart] || 'Other';
        showHeader = sectionCode !== lastHeaderValue;
        if (showHeader) {
          lastHeaderValue = sectionCode;
          headerText = sectionNameMap[sectionCode] || sectionCode;
        }
      }

      return (
        <React.Fragment key={item.id}>
          {showHeader && (
            <tr className="border-none">
              <td colSpan={5} className="p-0 pt-6 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-primary-deep text-[0.8rem] font-extrabold tracking-wider uppercase">
                    {headerText}
                  </span>
                  <div className="h-px flex-1 bg-[rgb(74_117_89_/_15%)]" />
                </div>
              </td>
            </tr>
          )}
          <CheckInRow
            item={item}
            onSetAttendance={onSetAttendance}
            onEdit={onEdit}
            missCounts={missCounts}
            maxRehearsalMisses={maxRehearsalMisses}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Singer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Voice
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Missed Rehearsals
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
                RSVP
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Attendance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {notCheckedIn.length === 0 && checkedIn.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No singers expected or matching current filters.
                </td>
              </tr>
            ) : (
              <>
                {renderRowsWithHeaders(notCheckedIn)}
                {checkedIn.length > 0 && (
                  <tr className="border-none">
                    <td colSpan={5} className="p-0 pt-6 pb-2">
                      <div className="flex items-center gap-4">
                        <div className="to-border h-px flex-1 bg-gradient-to-r from-transparent" />
                        <span className="bg-surface text-primary-deep flex items-center gap-[6px] rounded-full border border-[rgb(74_117_89_/_25%)] px-4 py-[6px] text-[0.8rem] font-extrabold tracking-widest uppercase shadow-[0_2px_8px_rgb(0_0_0_/_3%)]">
                          ✓ Checked In ({checkedIn.length})
                        </span>
                        <div className="to-border h-px flex-1 bg-gradient-to-l from-transparent" />
                      </div>
                    </td>
                  </tr>
                )}
                {renderRowsWithHeaders(checkedIn)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
