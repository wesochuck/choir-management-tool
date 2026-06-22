import { AttendanceSingerRow } from './AttendanceSingerRow';

interface AttendanceItemDef {
  id: string;
  profileId: string;
  name: string;
  voicePart: string;
  attendance: 'Present' | 'Absent' | 'Pending';
  rsvpNote?: string;
}

interface AttendanceSectionGroupProps {
  section: string;
  members: AttendanceItemDef[];
  missCounts: Record<string, number>;
  maxRehearsalMisses: number;
  onToggle: (profileId: string) => void;
  onMore: (profileId: string) => void;
}

export function AttendanceSectionGroup({
  section,
  members,
  missCounts,
  maxRehearsalMisses,
  onToggle,
  onMore,
}: AttendanceSectionGroupProps) {
  return (
    <div>
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-1.5">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{section}</p>
      </div>

      {members.map((singer) => (
        <AttendanceSingerRow
          key={singer.id}
          singer={singer}
          missCount={missCounts[singer.profileId] || 0}
          maxRehearsalMisses={maxRehearsalMisses}
          onToggle={onToggle}
          onMore={onMore}
        />
      ))}
    </div>
  );
}
