import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetListItem } from '../../services/eventService';

interface Props {
  item: SetListItem;
  onEdit: (item: SetListItem) => void;
  onDelete: (id: string) => void;
  onPieceClick?: (pieceId: string) => void;
}

export const SortableSetListItem: React.FC<Props> = ({ item, onEdit, onDelete, onPieceClick }) => {
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

  return (
    <div 
      ref={setNodeRef} 
      className="card flex-row" 
      style={{ 
        padding: 'var(--space-sm) var(--space-md)', 
        gap: 'var(--space-md)', 
        alignItems: 'center', 
        backgroundColor: 'var(--surface)', 
        border: '1px solid var(--border)', 
        ...style 
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '8px', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '1.2rem' }}>⣿</span>
      </div>
      
      <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
        <div className="text-label flex-row" style={{ margin: 0, gap: '6px', alignItems: 'center' }}>
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
              {item.title}
              <span title="Linked to Music Library" style={{ fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block' }}>🎼</span>
            </button>
          ) : (
            <>
              {item.title}
              {item.pieceId && <span title="Linked to Music Library" style={{ fontSize: '0.85rem' }}>🎼</span>}
            </>
          )}
        </div>
        {(item.composer || item.duration) && (
          <div className="text-xs text-muted">
            {item.composer}{item.composer && item.duration ? ' • ' : ''}{item.duration}
          </div>
        )}
      </div>

      <button onClick={() => onEdit(item)} className="btn btn-ghost btn-sm">Edit</button>
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">X</button>
    </div>
  );
};
