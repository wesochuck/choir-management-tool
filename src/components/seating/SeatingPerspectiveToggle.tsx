import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { Button } from '../ui';
import type { SeatingPerspective } from './types';

type SeatingPerspectiveToggleProps = {
  value: SeatingPerspective;
  onChange: (value: SeatingPerspective) => void;
};

export function SeatingPerspectiveToggle({ value, onChange }: SeatingPerspectiveToggleProps) {
  const { performerLabel } = useChoirSettings();
  return (
    <div className="mx-auto mb-1 flex w-max flex-row justify-center gap-1 rounded-md bg-[var(--surface-muted)] p-1">
      <Button
        variant={value === 'singer' ? 'primary' : 'outline'}
        size="small"
        onClick={() => onChange('singer')}
      >
        {performerLabel} View
      </Button>
      <Button
        variant={value === 'director' ? 'primary' : 'outline'}
        size="small"
        onClick={() => onChange('director')}
      >
        Director View
      </Button>
    </div>
  );
}
