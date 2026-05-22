import React, { useState, useEffect } from 'react';
import { BaseModal } from '../common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { isValidDurationString } from '../../lib/musicPieceUtils';
import type { SetListItem } from '../../services/eventService';

interface SetListItemEditModalProps {
  isOpen: boolean;
  item: SetListItem | null;
  onClose: () => void;
  onSave: (updatedItem: SetListItem) => void;
  onConvertToLibrary?: (item: SetListItem) => Promise<void>;
}

export const SetListItemEditModal: React.FC<SetListItemEditModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
  onConvertToLibrary
}) => {
  const dialog = useDialog();
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'song' | 'intermission'>('song');
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setComposer(item.composer || '');
      setDuration(item.duration || '');
      setNotes(item.notes || '');
      setType(item.type || 'song');
    }
  }, [item, isOpen]);

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
      type
    });
    onClose();
  };

  const handlePromote = async () => {
    if (!item || !onConvertToLibrary) return;
    
    // Create a temporary updated item for promotion
    const tempItem = {
        ...item,
        title: title.trim(),
        composer: type === 'song' ? (composer.trim() || undefined) : undefined,
        duration: duration.trim() || undefined,
        notes: notes.trim() || undefined,
        type
    };

    setIsPromoting(true);
    try {
      await onConvertToLibrary(tempItem);
      onClose();
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Set List Item"
      maxWidth="500px"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="edit-item-form" className="btn btn-primary">Update Item</button>
        </>
      }
    >
      <form id="edit-item-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Item Type</label>
          <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
            <button
              type="button"
              className={`btn btn-sm ${type === 'song' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setType('song')}
            >
              🎼 Song
            </button>
            <button
              type="button"
              className={`btn btn-sm ${type === 'intermission' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setType('intermission')}
            >
              ⏸️ Intermission
            </button>
          </div>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="card"
            style={{ padding: '0 12px', height: '40px' }}
          />
        </div>

        {type === 'song' && (
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Composer/Arranger</label>
            <input
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              className="card"
              style={{ padding: '0 12px', height: '40px' }}
            />
          </div>
        )}

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Duration</label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 3:30"
            className="card"
            style={{ padding: '0 12px', height: '40px' }}
          />
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="card"
            style={{ padding: '12px', minHeight: '80px', resize: 'vertical' }}
          />
        </div>

        {type === 'song' && !item?.pieceId && onConvertToLibrary && (
          <div style={{ marginTop: 'var(--space-xs)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handlePromote}
              disabled={isPromoting}
            >
              {isPromoting ? 'Converting...' : '✨ Convert to Library Piece'}
            </button>
          </div>
        )}
      </form>
    </BaseModal>
  );
};
