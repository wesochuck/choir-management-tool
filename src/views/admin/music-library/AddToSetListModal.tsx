import { useState } from 'react';
import { Modal, Button, Select } from '../../../components/ui';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { Event } from '../../../services/eventService';

interface AddToSetListModalProps {
  isOpen: boolean;
  selectedPieces: MusicPiece[];
  performances: Event[];
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (eventId: string) => Promise<void> | void;
}

export function AddToSetListModal({
  isOpen,
  selectedPieces,
  performances,
  isSaving,
  onClose,
  onConfirm,
}: AddToSetListModalProps) {
  const [selectedEventId, setSelectedEventId] = useState('');

  const handleConfirm = () => {
    if (selectedEventId) {
      onConfirm(selectedEventId);
    }
  };

  const handleClose = () => {
    setSelectedEventId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add to Set List">
      <div className="flex flex-col gap-4">
        {performances.length === 0 ? (
          <p className="text-sm text-slate-500">
            No performances found. Create a performance before adding titles to a set list.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Performance
              </label>
              <Select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                <option value="">Choose a performance...</option>
                {performances.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title || 'Untitled Performance'} —{' '}
                    {new Date(event.date).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Selected titles ({selectedPieces.length})
              </p>
              <ul className="max-h-48 overflow-y-auto text-sm text-slate-600">
                {selectedPieces.map((piece) => (
                  <li key={piece.id}>
                    {piece.title}
                    {piece.composer ? ` — ${piece.composer}` : ''}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!selectedEventId || isSaving}
                className="w-full sm:w-auto"
                onClick={handleConfirm}
              >
                {isSaving ? 'Adding…' : 'Add to Set List'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
