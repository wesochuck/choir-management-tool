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
      // @allow-inline-style - dnd-kit sortable transform and transition
      style={{ 
        ...style 
      }}
    >
      <div {...attributes} {...listeners} className="cursor-grab flex items-center p-2 text-[var(--text-muted)]">
        <span className="text-[1.2rem]">⣿</span>
      </div>
      
      <div className="flex-col flex-1 gap-[2px]">
        {item.type === 'intermission' ? (
          <div className="flex-row items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--primary-deep)] text-[0.95rem]">⏸️ {titleText}</span>
            {displayDuration && (
              <span className="inline-flex items-center px-[8px] py-[2px] rounded text-[0.75rem] font-semibold uppercase tracking-wider bg-[var(--surface)] text-primary-deep">
                {displayDuration}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted italic">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        ) : (
          <div className="text-label flex-row m-0 gap-[6px] items-center flex-wrap">
            {(item.pieceId || linkedPiece?.id) && onPieceClick ? (
              <button
                type="button"
                onClick={() => onPieceClick((item.pieceId || linkedPiece?.id)!)}
                className="bg-none border-none p-0 text-left font-inherit text-inherit cursor-pointer text-[var(--primary)] underline inline-flex items-center gap-[6px]"
              >
                {titleText}
                <span title="Linked to Music Library" className="text-[0.85rem] no-underline inline-block">🎼</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-[6px]">
                {onEdit ? (
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="bg-none border-none p-0 text-left text-inherit font-inherit font-semibold cursor-pointer underline decoration-dotted decoration-[var(--primary)] underline-offset-[3px]"
                    >
                        {titleText}
                    </button>
                ) : (
                    <span className="font-semibold">{titleText}</span>
                )}
                {(item.pieceId || linkedPiece?.id) && <span title="Linked to Music Library" className="text-[0.85rem]">🎼</span>}
              </span>
            )}
            {item.soloSmallGroup && (
              <span className="text-[0.75rem] px-[8px] py-[2px] bg-[rgb(74_124_89_/_8%)] text-[var(--primary-deep)] border border-[rgb(74_124_89_/_15%)] rounded-full font-semibold inline-flex items-center gap-1">
                🎤 Solo / Small Group
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-xs text-muted font-normal ml-1">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        )}
        {item.type !== 'intermission' && (displayComposer || displayDuration || (linkedPiece?.genres && linkedPiece.genres.length > 0)) && (
          <div className="text-xs text-muted flex-row gap-1">
            {displayComposer && (
              <span className="text-xs text-muted">
                {displayComposer}
              </span>
            )}
            {displayComposer && displayDuration && <span>•</span>}
            {displayDuration && <span>{displayDuration}</span>}
            {linkedPiece?.genres && linkedPiece.genres.length > 0 && genres && (
              <div className="flex-row gap-1 inline-flex flex-wrap items-center">
                {linkedPiece.genres.map(id => {
                  const found = genres.find(g => g.id === id);
                  return (
                    <span 
                      key={id}
                      className="inline-flex px-[5px] py-[1px] rounded bg-[rgb(74_124_89_/_8%)] border border-[rgb(74_124_89_/_15%)] text-[9px] font-semibold text-[var(--primary-deep)] leading-none"
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
          <div className="text-xs text-muted italic mt-[2px]">
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
          className="btn btn-secondary btn-sm !p-[0_8px] min-h-auto !h-6 flex items-center justify-center"
          title="Play default track"
        >
          🎵
        </button>
      )}
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">X</button>
    </div>
  );
};
