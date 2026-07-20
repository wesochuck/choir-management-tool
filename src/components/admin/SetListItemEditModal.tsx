import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Checkbox, Input, Textarea } from '../ui';
import { useDialog } from '../../contexts/DialogContext';
import { isValidDurationString } from '../../lib/musicPieceUtils';
import type { SetListItem, SetListPerformerCredit } from '../../services/eventService';
import {
  getPerformerCredits,
  isFeaturedNumber,
  migrateFeaturedNumberItem,
} from '../../lib/setList/performerCredits';
import { SetListPerformerCreditsEditor } from './SetListPerformerCreditsEditor';

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
  const [featuredNumber, setFeaturedNumber] = useState(false);
  const [performerCredits, setPerformerCredits] = useState<SetListPerformerCredit[]>([]);
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setComposer(item.composer || '');
      setDuration(item.duration || '');
      setNotes(item.notes || '');
      setType(item.type || 'song');
      setFeaturedNumber(isFeaturedNumber(item));
      setPerformerCredits(getPerformerCredits(item).map((credit) => ({ ...credit })));
    }
  }, [item, isOpen]);

  const isDirty = useMemo(() => {
    if (!item) return false;
    const titleChanged = title !== item.title;
    const composerChanged = composer !== (item.composer || '');
    const durationChanged = duration !== (item.duration || '');
    const notesChanged = notes !== (item.notes || '');
    const typeChanged = type !== (item.type || 'song');
    const featuredChanged = featuredNumber !== isFeaturedNumber(item);
    const creditsChanged =
      JSON.stringify(performerCredits) !== JSON.stringify(getPerformerCredits(item));
    return (
      titleChanged ||
      composerChanged ||
      durationChanged ||
      notesChanged ||
      typeChanged ||
      featuredChanged ||
      creditsChanged
    );
  }, [item, title, composer, duration, notes, type, featuredNumber, performerCredits]);

  const handleTypeChange = async (nextType: 'song' | 'intermission') => {
    if (nextType === type) return;
    if (nextType === 'intermission' && performerCredits.length > 0) {
      const confirmed = await dialog.confirm({
        title: 'Clear Performer Credits?',
        message: 'Changing this song to an intermission will remove all performer credits.',
        confirmLabel: 'Change to Intermission',
        cancelLabel: 'Keep Song',
        variant: 'danger',
      });
      if (!confirmed) return;
      setFeaturedNumber(false);
      setPerformerCredits([]);
    }
    setType(nextType);
  };

  const handleFeaturedChange = async (checked: boolean) => {
    if (!checked && performerCredits.length > 0) {
      const confirmed = await dialog.confirm({
        title: 'Clear Performer Credits?',
        message: 'Turning off Featured Number will remove all selected performer credits.',
        confirmLabel: 'Turn Off and Clear',
        cancelLabel: 'Keep Featured Number',
        variant: 'danger',
      });
      if (!confirmed) return;
      setPerformerCredits([]);
    }
    setFeaturedNumber(checked);
  };

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

  const validateDuration = (normalizedDuration: string) => {
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!item) return;
    if (!title.trim()) {
      setValidationError(true);
      dialog.showToast('Please enter a title for this set list item.');
      return;
    }
    setValidationError(false);

    const normalizedDuration = duration.trim();
    if (!validateDuration(normalizedDuration)) return;

    const updatedItem = migrateFeaturedNumberItem(
      item,
      type === 'song' && featuredNumber,
      performerCredits
    );
    onSave({
      ...updatedItem,
      title: title.trim(),
      composer: type === 'song' ? composer.trim() || undefined : undefined,
      duration: normalizedDuration || undefined,
      notes: notes.trim() || undefined,
      type,
      isFeaturedNumber: type === 'song' && featuredNumber,
      performerCredits: type === 'song' && featuredNumber ? performerCredits : [],
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
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button variant="primary" className="w-full sm:w-auto" onClick={() => handleSubmit()}>
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
              onClick={() => void handleTypeChange('song')}
            >
              🎼 Song
            </Button>
            <Button
              type="button"
              variant={type === 'intermission' ? 'primary' : 'outline'}
              size="small"
              onClick={() => void handleTypeChange('intermission')}
            >
              ⏸️ Intermission
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label">
            Title <span className="text-danger-text">*</span>
          </label>
          <Input
            required
            invalid={validationError}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setValidationError(false);
            }}
          />
          {validationError && <p className="text-danger-text m-0 text-xs">Title is required.</p>}
        </div>

        {type === 'song' && (
          <div className="flex flex-col gap-1">
            <label className="text-label">Composer/Arranger</label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
        )}

        {type === 'song' && (
          <Checkbox
            checked={featuredNumber}
            onChange={(event) => void handleFeaturedChange(event.target.checked)}
            className={`rounded-xl border p-3 px-4 shadow-sm transition-colors ${featuredNumber ? 'border-primary bg-primary-light text-primary-deep' : 'border-border bg-surface'}`}
          >
            <span className="text-sm font-medium">🎤 Featured Number</span>
          </Checkbox>
        )}

        {type === 'song' && featuredNumber && (
          <SetListPerformerCreditsEditor
            credits={performerCredits}
            onChange={setPerformerCredits}
            isOpen={isOpen}
          />
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
