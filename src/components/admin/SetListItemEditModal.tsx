import React, { useState, useEffect, useMemo } from 'react';
import { BaseModal } from '../common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { isValidDurationString } from '../../lib/musicPieceUtils';
import type { SetListItem } from '../../services/eventService';

interface SetListItemEditModalProps {
  isOpen: boolean;
  item: SetListItem | null;
  onClose: () => void;
  onSave: (updatedItem: SetListItem) => void;
}

export const SetListItemEditModal: React.FC<SetListItemEditModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave
}) => {
  const dialog = useDialog();
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'song' | 'intermission'>('song');
  const [soloSmallGroup, setSoloSmallGroup] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setComposer(item.composer || '');
      setDuration(item.duration || '');
      setNotes(item.notes || '');
      setType(item.type || 'song');
      setSoloSmallGroup(!!item.soloSmallGroup);
    }
  }, [item, isOpen]);

  const isDirty = useMemo(() => {
    if (!item) return false;
    const titleChanged = title !== item.title;
    const composerChanged = composer !== (item.composer || '');
    const durationChanged = duration !== (item.duration || '');
    const notesChanged = notes !== (item.notes || '');
    const typeChanged = type !== (item.type || 'song');
    const soloChanged = soloSmallGroup !== (!!item.soloSmallGroup);
    return titleChanged || composerChanged || durationChanged || notesChanged || typeChanged || soloChanged;
  }, [item, title, composer, duration, notes, type, soloSmallGroup]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this set list item. Do you want to discard them?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning'
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!title.trim()) return;

    const normalizedDuration = duration.trim();
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger'
      });
      return;
    }

    onSave({
      ...item,
      title: title.trim(),
      composer: type === 'song' ? (composer.trim() || undefined) : undefined,
      duration: normalizedDuration || undefined,
      notes: notes.trim() || undefined,
      type,
      soloSmallGroup: type === 'song' ? soloSmallGroup : false
    });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Set List Item"
      maxWidth="500px"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          <button type="submit" form="edit-item-form" className="btn btn-primary">Update Item</button>
        </>
      }
    >
      <form id="edit-item-form" onSubmit={handleSubmit} className="flex-col gap-[var(--space-md)]">
        <div className="flex-col gap-[var(--space-xs)]">
          <label className="text-label">Item Type</label>
          <div className="flex-row gap-[var(--space-sm)]">
            <button
              type="button"
              className={`btn btn-sm sl-modal-type-btn ${type === 'song' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setType('song')}
            >
              🎼 Song
            </button>
            <button
              type="button"
              className={`btn btn-sm sl-modal-type-btn ${type === 'intermission' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setType('intermission')}
            >
              ⏸️ Intermission
            </button>
          </div>
        </div>

        <div className="flex-col gap-[var(--space-xs)]">
          <label className="text-label">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="card h-10 px-3"
          />
        </div>

        {type === 'song' && (
          <div className="flex-col gap-[var(--space-xs)]">
            <label className="text-label">Composer/Arranger</label>
            <input
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              className="card h-10 px-3"
            />
          </div>
        )}

        {type === 'song' && (
          <div 
            className={`card sl-modal-solo-card flex-row ${soloSmallGroup ? 'sl-modal-solo-card-selected' : 'sl-modal-solo-card-unselected'}`}
            onClick={() => setSoloSmallGroup(!soloSmallGroup)}
          >
            <input
              type="checkbox"
              checked={soloSmallGroup}
              onChange={(e) => setSoloSmallGroup(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="size-[18px] cursor-pointer accent-[var(--primary)]"
            />
            <span className="text-[14px] font-medium">🎤 Mark as Solo / Small Group</span>
          </div>
        )}

        <div className="flex-col gap-[var(--space-xs)]">
          <label className="text-label">Duration</label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 3:30"
            className="card h-10 px-3"
          />
        </div>

        <div className="flex-col gap-[var(--space-xs)]">
          <label className="text-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="card min-h-[80px] resize-y p-3"
          />
        </div>
      </form>
    </BaseModal>
  );
};
