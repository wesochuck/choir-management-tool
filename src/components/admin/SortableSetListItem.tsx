import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetListItem } from '../../services/eventService';
import type { MusicPiece } from '../../types/musicLibrary';
import { getDefaultPlayableTrackKey } from '../../lib/setList/setListItems';
import type { MusicGenreDef } from '../../services/settingsService';
import '../../views/admin/SetList.css';

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
    transition: isDragging ? 'none' : (transition || 'none'),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 0,
    position: 'relative' as const,
  };

  const titleText = displayTitle || item.title;
  const hasAudio = linkedPiece ? !!getDefaultPlayableTrackKey(linkedPiece) : false;

  return (
    <div 
      ref={setNodeRef} 
      className={`card flex-row sl-item-card ${item.type === 'intermission' ? 'sl-item-card-intermission' : 'sl-item-card-song'}`}
      // @allow-inline-style - dynamic dnd kit positioning
      style={{ 
        ...style 
      }}
    >
      <div {...attributes} {...listeners} className="sl-drag-handle">
        <span className="sl-drag-icon">⣿</span>
      </div>
      
      <div className="flex-col sl-item-content">
        {item.type === 'intermission' ? (
          <div className="flex-row sl-item-header">
            <span className="sl-intermission-title">⏸️ {titleText}</span>
            {displayDuration && (
              <span className="badge badge-rehearsal sl-badge-intermission">
                {displayDuration}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted sl-item-duration">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        ) : (
          <div className="text-label flex-row sl-solo-group">
            {(item.pieceId || linkedPiece?.id) && onPieceClick ? (
              <button
                type="button"
                onClick={() => onPieceClick((item.pieceId || linkedPiece?.id)!)}
                className="sl-item-title-linked"
              >
                {titleText}
                <span title="Linked to Music Library" className="sl-library-link">🎼</span>
              </button>
            ) : (
              <span className="sl-title-wrapper">
                {onEdit ? (
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="sl-item-title-edit-btn"
                    >
                        {titleText}
                    </button>
                ) : (
                    <span className="sl-item-title-unlinked">{titleText}</span>
                )}
                {(item.pieceId || linkedPiece?.id) && <span title="Linked to Music Library" className="sl-library-icon">🎼</span>}
              </span>
            )}
            {item.soloSmallGroup && (
              <span className="badge sl-solo-badge">
                🎤 Solo / Small Group
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted sl-composer-text">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        )}
        {item.type !== 'intermission' && (displayComposer || displayDuration || (linkedPiece?.genres && linkedPiece.genres.length > 0)) && (
          <div className="text-xs text-muted flex-row sl-missing-link">
            {displayComposer && (
              <span className="sl-missing-link-text">
                {displayComposer}
              </span>
            )}
            {displayComposer && displayDuration && <span>•</span>}
            {displayDuration && <span>{displayDuration}</span>}
            {linkedPiece?.genres && linkedPiece.genres.length > 0 && genres && (
              <div className="flex-row sl-action-buttons">
                {linkedPiece.genres.map(id => {
                  const found = genres.find(g => g.id === id);
                  return (
                    <span 
                      key={id}
                      className="sl-genre-badge"
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
          <div className="text-xs text-muted sl-notes-text">
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
          className="btn btn-secondary btn-sm sl-play-btn"
          title="Play default track"
        >
          🎵
        </button>
      )}
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">X</button>
    </div>
  );
};
