import { Button } from '../../../components/ui';
import { CheckIcon, XMarkIcon } from '../../../components/ui/icons';

interface AttendanceSingerRowProps {
  singer: {
    id: string;
    profileId: string;
    name: string;
    voicePart: string;
    attendance: 'Present' | 'Absent' | 'Pending';
    rsvpNote?: string;
  };
  missCount: number;
  maxRehearsalMisses: number;
  onToggle: (profileId: string) => void;
  onMore: (profileId: string) => void;
}

export function AttendanceSingerRow({
  singer,
  missCount,
  maxRehearsalMisses,
  onToggle,
  onMore,
}: AttendanceSingerRowProps) {
  return (
    <div
      onClick={() => onToggle(singer.profileId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onToggle(singer.profileId);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={
        singer.attendance === 'Present'
          ? `Mark ${singer.name} not checked in`
          : `Check in ${singer.name}`
      }
      className={`flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 transition-colors focus:outline-none ${
        singer.attendance === 'Present'
          ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 focus:bg-emerald-50'
          : 'border-gray-100 bg-white hover:bg-gray-50 focus:bg-gray-50'
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          singer.attendance === 'Present'
            ? 'border-teal-500 bg-teal-500'
            : singer.attendance === 'Absent'
              ? 'border-red-400 bg-red-400'
              : 'border-gray-300 bg-white'
        }`}
      >
        {singer.attendance === 'Present' && <CheckIcon className="h-3.5 w-3.5 text-white" />}
        {singer.attendance === 'Absent' && <XMarkIcon className="h-3.5 w-3.5 text-white" />}
      </div>

      <span className="bg-primary-light text-primary-deep border-primary-deep/10 inline-flex min-w-[32px] shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold">
        {singer.voicePart}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-lg font-semibold text-gray-900">{singer.name}</span>
          {missCount > 0 && (
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                missCount > maxRehearsalMisses
                  ? 'bg-red-50/80 text-red-700'
                  : 'bg-amber-50/80 text-amber-700'
              }`}
            >
              ⚠️ {missCount} missed
            </span>
          )}
        </div>
        {singer.rsvpNote && (
          <span className="mt-0.5 text-xs font-semibold text-red-600 italic">
            📝 {singer.rsvpNote}
          </span>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="small"
        aria-label={`Contact info and profile actions for ${singer.name}`}
        className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-0"
        onClick={(e) => {
          e.stopPropagation();
          onMore(singer.profileId);
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          e.stopPropagation();
        }}
      >
        ⋯
      </Button>
    </div>
  );
}
