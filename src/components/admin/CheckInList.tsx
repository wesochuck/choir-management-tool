import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AttendanceItem } from '../../hooks/useAttendance';
import { useVoiceParts } from '../../hooks/useVoiceParts';

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
  const navigate = useNavigate();
  const isPresent = item.attendance === 'Present';
  const isAbsent = item.attendance === 'Absent';

  return (
    <tr
      className="cursor-pointer border-b border-gray-200 text-sm transition-colors hover:bg-primary-light/50"
      onClick={() => onSetAttendance(item.profileId, isPresent ? 'Pending' : 'Present')}
      style={{ /* @allow-inline-style - Dynamic row opacity based on attendance state */ opacity: isPresent ? 0.85 : 1 }}
    >
      <td className="p-3 px-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              onClick={(event) => {
                event.stopPropagation();
                const query = new URLSearchParams({
                  singerId: item.profileId,
                  openModal: 'true',
                });
                navigate(`/admin/roster?${query.toString()}`);
              }}
              className="cursor-pointer font-semibold underline"
              style={{ /* @allow-inline-style - Dynamic name color based on attendance state */
                color: isPresent
                  ? 'var(--primary-deep)'
                  : isAbsent
                    ? '#991b1b'
                    : 'var(--text-main)',
              }}
              title="Click to view full roster profile"
            >
              {item.name}
            </span>
            <span
              className="inline-flex items-center rounded border border-[rgb(74_117_89_/_20%)] bg-primary-light px-[6px] py-0.5 text-[9px] font-semibold tracking-wider text-primary-deep uppercase"
            >
              {item.voicePart}
            </span>
            {item.rsvp === 'Yes' && (
              <span
                className="inline-flex items-center rounded bg-primary-light px-[6px] py-0.5 text-[9px] font-semibold tracking-wider text-primary-deep uppercase"
              >
                RSVP
              </span>
            )}
            {missCounts && missCounts[item.profileId] !== undefined && missCounts[item.profileId] > 0 && (
              <span
                className="inline-flex items-center rounded px-[6px] py-0.5 text-[9px] font-extrabold tracking-wider uppercase"
                style={{ /* @allow-inline-style - Dynamic colors based on miss threshold */
                  backgroundColor: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#fee2e2' : '#fef3c7',
                  color: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#991b1b' : '#92400e',
                  border: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '1px solid #fca5a5' : '1px solid #fde68a',
                }}
              >
                ⚠️ {missCounts[item.profileId]} missed
              </span>
            )}
          </div>
          {item.rsvpNote && (
            <span className="text-xs font-semibold text-[#b91c1c]">📝 {item.rsvpNote}</span>
          )}
        </div>
      </td>
      <td className="p-3 px-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={isAbsent}
            onClick={(event) => {
              event.stopPropagation();
              onSetAttendance(item.profileId, isAbsent ? 'Pending' : 'Absent');
            }}
            className="btn min-h-[36px] max-[700px]:min-h-[40px]"
            style={{ /* @allow-inline-style - Dynamic styling based on absence state */
              backgroundColor: isAbsent ? '#ef4444' : 'var(--surface)',
              color: isAbsent ? 'var(--surface)' : '#64748b',
              borderColor: isAbsent ? '#ef4444' : 'var(--border)',
              fontWeight: isAbsent ? '700' : '500',
              boxShadow: isAbsent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Absent
          </button>
          <button
            type="button"
            aria-pressed={isPresent}
            onClick={(event) => {
              event.stopPropagation();
              onSetAttendance(item.profileId, isPresent ? 'Pending' : 'Present');
            }}
            className="btn min-h-[36px] max-[700px]:min-h-[40px]"
            style={{ /* @allow-inline-style - Dynamic styling based on presence state */
              backgroundColor: isPresent ? 'var(--primary)' : 'var(--surface)',
              color: isPresent ? 'var(--surface)' : 'var(--primary-deep)',
              borderColor: isPresent ? 'var(--primary)' : 'var(--border)',
              fontWeight: isPresent ? '700' : '600',
              boxShadow: isPresent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Present
          </button>
        </div>
      </td>
      <td className="p-3 px-4 text-right whitespace-nowrap max-[700px]:hidden">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(item.profileId);
          }}
          className="btn btn-ghost btn-sm text-xs"
        >
          ✏️ Edit
        </button>
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
    voiceParts.forEach(vp => {
      map[vp.label] = vp.sectionCode;
    });
    return map;
  }, [voiceParts]);

  const sectionNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => {
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
              <td colSpan={3} className="p-0 pt-6 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[0.8rem] font-extrabold tracking-wider text-primary-deep">
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
    <div className="w-full flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
              <th className="p-3 px-4 text-left">Singer</th>
              <th className="p-3 px-4 text-left">Attendance</th>
              <th className="p-3 px-4 text-right max-[700px]:hidden">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notCheckedIn.length === 0 && checkedIn.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  No singers found in the roster.
                </td>
              </tr>
            ) : (
              <>
                {renderRowsWithHeaders(notCheckedIn)}
                {checkedIn.length > 0 && (
                  <tr className="border-none">
                    <td colSpan={3} className="p-0 pt-6 pb-2">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                        <span className="flex items-center gap-[6px] rounded-full border border-[rgb(74_117_89_/_25%)] bg-surface px-4 py-[6px] text-[0.8rem] font-extrabold tracking-widest text-primary-deep uppercase shadow-[0_2px_8px_rgb(0_0_0_/_3%)]">
                          ✓ Checked In ({checkedIn.length})
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
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
