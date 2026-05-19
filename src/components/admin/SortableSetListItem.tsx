import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetListItem } from '../../services/eventService';

interface Props {
  item: SetListItem;
  onEdit: (item: SetListItem) => void;
  onDelete: (id: string) => void;
  onPieceClick?: (pieceId: string) => void;
  displayTitle?: string;
  displayComposer?: string;
  displayDuration?: string;
  cumulativeStart?: string;
  cumulativeEnd?: string;
}

export const SortableSetListItem: React.FC<Props> = ({
  item,
  onEdit,
  onDelete,
  onPieceClick,
  displayTitle,
  displayComposer,
  displayDuration,
  cumulativeStart,
  cumulativeEnd
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  const titleText = displayTitle || item.title;

  return (
    <div 
      ref={setNodeRef} 
      className="card flex-row" 
      style={{ 
        padding: 'var(--space-sm) var(--space-md)', 
        gap: 'var(--space-md)', 
        alignItems: 'center', 
        backgroundColor: item.type === 'intermission' ? 'var(--primary-light)' : 'var(--surface)', 
        border: item.type === 'intermission' ? '1px dashed var(--primary)' : '1px solid var(--border)', 
        ...style 
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '8px', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '1.2rem' }}>⣿</span>
      </div>
      
      <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
        {item.type === 'intermission' ? (
          <div className="flex-row" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--primary-deep)', fontSize: '0.95rem' }}>⏸️ {titleText}</span>
            {displayDuration && (
              <span className="badge badge-rehearsal" style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--surface)' }}>
                {displayDuration}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted" style={{ fontStyle: 'normal' }}>
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        ) : (
          <div className="text-label flex-row" style={{ margin: 0, gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {item.pieceId && onPieceClick ? (
              <button
                type="button"
                onClick={() => onPieceClick(item.pieceId!)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  cursor: 'pointer',
                  color: 'var(--primary)',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {titleText}
                <span title="Linked to Music Library" style={{ fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block' }}>🎼</span>
              </button>
            ) : (
              <>
                {titleText}
                {item.pieceId && <span title="Linked to Music Library" style={{ fontSize: '0.85rem' }}>🎼</span>}
              </>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted" style={{ fontWeight: 'normal', marginLeft: '4px' }}>
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        )}
        {item.type !== 'intermission' && (displayComposer || displayDuration) && (
          <div className="text-xs text-muted">
            {displayComposer}{displayComposer && displayDuration ? ' • ' : ''}{displayDuration}
          </div>
        )}
        {item.notes && (
          <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '2px' }}>
            {item.notes}
          </div>
        )}
      </div>

      <button onClick={() => onEdit(item)} className="btn btn-ghost btn-sm">Edit</button>
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">X</button>
    </div>
  );
};

