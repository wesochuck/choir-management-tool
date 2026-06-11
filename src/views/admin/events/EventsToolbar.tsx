import React from 'react';
import { Button } from '../../../components/ui';

interface EventsToolbarProps {
  onBulkAdd: () => void;
  onAdd: () => void;
}

export function EventsToolbar({ onBulkAdd, onAdd }: EventsToolbarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onBulkAdd} variant="secondary">
        ⚡ Bulk Add Rehearsals
      </Button>
      <Button onClick={onAdd} variant="primary">
        + Single Event
      </Button>
    </div>
  );
}

