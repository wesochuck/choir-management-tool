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

        {type === 'song' && (
          <div className="flex-row card" style={{ 
            alignItems: 'center', 
            gap: '10px', 
            padding: '12px',
            backgroundColor: soloSmallGroup ? 'rgba(74, 124, 89, 0.08)' : 'var(--surface)',
            border: soloSmallGroup ? '1px solid var(--primary)' : '1px solid var(--border)',
            cursor: 'pointer',
            userSelect: 'none'
          }} onClick={() => setSoloSmallGroup(!soloSmallGroup)}>
            <input
              type="checkbox"
              checked={soloSmallGroup}
              onChange={(e) => setSoloSmallGroup(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>🎤 Mark as Solo / Small Group</span>
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
      </form>
    </BaseModal>
  );
};
