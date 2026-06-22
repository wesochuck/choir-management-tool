import { AppCard } from '../common/AppCard';
import { Button } from '../ui';
import type { SelectedSeatInfo } from './types';

type SelectedSeatCardProps = {
  selectedSeat: SelectedSeatInfo;
  onClear: () => void;
};

export function SelectedSeatCard({ selectedSeat, onClear }: SelectedSeatCardProps) {
  return (
    <AppCard className="max-sm:block">
      <div className="flex items-center justify-between gap-4 max-sm:flex">
        <div>
          <div className="text-text-muted text-[0.72rem] font-extrabold tracking-[0.08em] uppercase max-sm:text-[0.72rem]">
            Row {selectedSeat.row + 1} &bull; Seat {selectedSeat.seat + 1}
          </div>
          <div className="text-text text-base font-extrabold max-sm:text-base">
            {selectedSeat.status === 'empty' && 'Empty seat'}
            {selectedSeat.status === 'assignedUnknown' && 'Assigned singer'}
            {selectedSeat.status === 'assigned' && selectedSeat.name}
            {selectedSeat.status === 'self' && 'Your seat'}
          </div>
          {selectedSeat.status === 'self' && selectedSeat.name && (
            <div className="text-text-muted text-sm max-sm:text-sm">{selectedSeat.name}</div>
          )}
          {selectedSeat.voicePart && (
            <div className="text-text-muted text-sm max-sm:text-sm">{selectedSeat.voicePart}</div>
          )}
        </div>

        <Button type="button" variant="outline" size="small" onClick={onClear}>
          Dismiss
        </Button>
      </div>
    </AppCard>
  );
}
