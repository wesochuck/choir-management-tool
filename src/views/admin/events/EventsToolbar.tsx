interface EventsToolbarProps {
  onBulkAdd: () => void;
  onAdd: () => void;
}

export function EventsToolbar({ onBulkAdd, onAdd }: EventsToolbarProps) {
  return (
    <div className="admin-view-actions">
      <button onClick={onBulkAdd} className="btn btn-secondary">
        ⚡ Bulk Add Rehearsals
      </button>
      <button onClick={onAdd} className="btn btn-primary">
        + Single Event
      </button>
    </div>
  );
}
