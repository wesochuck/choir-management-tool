import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, Textarea } from '../ui';
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
  onSave,
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
    const soloChanged = soloSmallGroup !== !!item.soloSmallGroup;
    return (
      titleChanged ||
      composerChanged ||
      durationChanged ||
      notesChanged ||
      typeChanged ||
      soloChanged
    );
  }, [item, title, composer, duration, notes, type, soloSmallGroup]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this set list item. Do you want to discard them?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!item) return;
    if (!title.trim()) return;

    const normalizedDuration = duration.trim();
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger',
      });
      return;
    }

    onSave({
      ...item,
      title: title.trim(),
      composer: type === 'song' ? composer.trim() || undefined : undefined,
      duration: normalizedDuration || undefined,
      notes: notes.trim() || undefined,
      type,
      soloSmallGroup: type === 'song' ? soloSmallGroup : false,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Set List Item"
      maxWidth="500px"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()}>
            Update Item
          </Button>
        </div>
      }
    >
      <form id="edit-item-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-label">Item Type</label>
          <div className="flex flex-row gap-2">
            <Button
              type="button"
              variant={type === 'song' ? 'primary' : 'outline'}
              size="small"
              onClick={() => setType('song')}
            >
              🎼 Song
            </Button>
            <Button
              type="button"
              variant={type === 'intermission' ? 'primary' : 'outline'}
              size="small"
              onClick={() => setType('intermission')}
            >
              ⏸️ Intermission
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label">Title</label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {type === 'song' && (
          <div className="flex flex-col gap-1">
            <label className="text-label">Composer/Arranger</label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
        )}

        {type === 'song' && (
          <div
            className={`flex cursor-pointer flex-row items-center gap-3 rounded-xl border p-3 px-4 shadow-sm transition-colors ${soloSmallGroup ? 'border-primary bg-primary-light text-primary-deep' : 'border-border bg-surface'}`}
            onClick={() => setSoloSmallGroup(!soloSmallGroup)}
          >
            <input
              type="checkbox"
              checked={soloSmallGroup}
              onChange={(e) => setSoloSmallGroup(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="accent-primary size-[18px] cursor-pointer"
            />
            <span className="text-[14px] font-medium">🎤 Mark as Solo / Small Group</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-label">Duration</label>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 3:30"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </form>
    </Modal>
  );
};
