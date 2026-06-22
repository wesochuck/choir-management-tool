import type { SetListItem } from '../../../services/eventService';
import type { SetListDurationTotals } from '../../../lib/setList/setListItems';

interface SetListDurationBarProps {
  items: SetListItem[];
  durationTotals: SetListDurationTotals;
  localGapSeconds: number;
  onGapChange: (seconds: number) => void;
}

export function SetListDurationBar({
  items,
  durationTotals,
  localGapSeconds,
  onGapChange,
}: SetListDurationBarProps) {
  return (
    <div className="border-primary-light bg-primary-light/40 text-primary-deep flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm font-semibold lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span>
          🎼 Songs: <span className="text-text">{durationTotals.songs}</span>
        </span>
        <span>
          ⏸️ Intermissions: <span className="text-text">{durationTotals.intermissions}</span>
        </span>
        <span className="flex items-center gap-2">
          📢 Gaps:
          <input
            type="number"
            className="border-border bg-surface text-text focus:border-primary focus:ring-primary/30 h-9 w-16 rounded-md border px-2 text-sm transition outline-none focus:ring-2"
            min={0}
            step={1}
            value={localGapSeconds}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onGapChange(isNaN(val) ? 0 : val);
            }}
          />
          <span className="text-primary-deep/80 text-xs font-normal">
            sec × {Math.max(0, items.length - 1)} =
          </span>
          <span className="text-text">{durationTotals.gaps}</span>
        </span>
      </div>
      <div className="text-primary-deep flex items-center gap-1 text-[0.95rem] font-bold">
        ⏱️ Total: <span className="text-text">{durationTotals.total}</span>
      </div>
    </div>
  );
}
