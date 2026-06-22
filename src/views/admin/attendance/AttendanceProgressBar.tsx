import { CheckIcon } from '../../../components/ui/icons';

interface AttendanceProgressBarProps {
  presentCount: number;
  expectedCount: number;
}

export function AttendanceProgressBar({ presentCount, expectedCount }: AttendanceProgressBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-300"
          // @allow-inline-style - dynamic width for progress bar
          style={{
            // @allow-inline-style - dynamic width for progress bar
            width: `${expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0}%`,
          }}
        />
      </div>
      <p className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-teal-700">
        {presentCount === expectedCount && expectedCount > 0 && (
          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-teal-700" />
        )}
        <span>
          {presentCount} / {expectedCount}
        </span>
      </p>
    </div>
  );
}
