import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetListItem } from '../../services/eventService';
import type { MusicPiece } from '../../types/musicLibrary';
import { getDefaultPlayableTrackKey } from '../../lib/setList/setListItems';
import type { MusicGenreDef } from '../../services/settingsService';

interface Props {
  item: SetListItem;
  linkedPiece?: MusicPiece;
  onEdit: (item: SetListItem) => void;
  onDelete: (id: string) => void;
  onPieceClick?: (pieceId: string) => void;
  onPlayTrack?: (piece: MusicPiece) => void;
  displayTitle?: string;
  displayComposer?: string;
  displayDuration?: string;
  cumulativeStart?: string;
  cumulativeEnd?: string;
  genres?: MusicGenreDef[];
}

export const SortableSetListItem: React.FC<Props> = ({
  item,
  linkedPiece,
  onEdit,
  onDelete,
  onPieceClick,
  onPlayTrack,
  displayTitle,
  displayComposer,
  displayDuration,
  cumulativeStart,
  cumulativeEnd,
  genres
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
  const hasAudio = linkedPiece ? !!getDefaultPlayableTrackKey(linkedPiece) : false;

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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {onEdit ? (
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            color: 'inherit',
                            font: 'inherit',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline dotted var(--primary)',
                            textUnderlineOffset: '3px'
                        }}
                    >
                        {titleText}
                    </button>
                ) : (
                    <span style={{ fontWeight: 600 }}>{titleText}</span>
                )}
                {item.pieceId && <span title="Linked to Music Library" style={{ fontSize: '0.85rem' }}>🎼</span>}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted" style={{ fontWeight: 'normal', marginLeft: '4px' }}>
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        )}
        {item.type !== 'intermission' && (displayComposer || displayDuration || (linkedPiece?.genres && linkedPiece.genres.length > 0)) && (
          <div className="text-xs text-muted flex-row" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <span>{displayComposer}{displayComposer && displayDuration ? ' • ' : ''}{displayDuration}</span>
            {linkedPiece?.genres && linkedPiece.genres.length > 0 && genres && (
              <div className="flex-row" style={{ gap: '4px', display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center' }}>
                {linkedPiece.genres.map(id => {
                  const found = genres.find(g => g.id === id);
                  return (
                    <span 
                      key={id}
                      style={{ 
                        display: 'inline-flex',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(74, 124, 89, 0.08)',
                        border: '1px solid rgba(74, 124, 89, 0.15)',
                        fontSize: '9px',
                        fontWeight: 600,
                        color: 'var(--primary-deep)',
                        lineHeight: 1
                      }}
                    >
                      {found ? found.label : id}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {item.notes && (
          <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '2px' }}>
            {item.notes}
          </div>
        )}
      </div>

      <button onClick={() => onEdit(item)} className="btn btn-ghost btn-sm">Edit</button>
      {hasAudio && onPlayTrack && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (linkedPiece) onPlayTrack(linkedPiece);
          }} 
          className="btn btn-secondary btn-sm"
          title="Play default track"
          style={{ padding: '0 8px', minHeight: 'auto', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          🎵
        </button>
      )}
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">X</button>
    </div>
  );
};

