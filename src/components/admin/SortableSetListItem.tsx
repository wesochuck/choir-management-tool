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
      className={`card sl-item-card flex-row ${item.type === 'intermission' ? 'sl-item-card-intermission' : 'sl-item-card-song'}`}
      // @allow-inline-style - dnd-kit sortable transform and transition
      style={{ 
        ...style 
      }}
    >
      <div {...attributes} {...listeners} className="flex cursor-grab items-center p-2 text-[var(--text-muted)]">
        <span className="text-[1.2rem]">⣿</span>
      </div>
      
      <div className="flex-1 flex-col gap-[2px]">
        {item.type === 'intermission' ? (
          <div className="flex-row flex-wrap items-center gap-2">
            <span className="text-[0.95rem] font-semibold text-[var(--primary-deep)]">⏸️ {titleText}</span>
            {displayDuration && (
              <span className="inline-flex items-center rounded bg-[var(--surface)] px-[8px] py-[2px] text-xs font-semibold tracking-wider text-primary-deep uppercase">
                {displayDuration}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-muted text-xs italic">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        ) : (
          <div className="text-label m-0 flex-row flex-wrap items-center gap-[6px]">
            {(item.pieceId || linkedPiece?.id) && onPieceClick ? (
              <button
                type="button"
                onClick={() => onPieceClick((item.pieceId || linkedPiece?.id)!)}
                className="font-[inherit] inline-flex cursor-pointer items-center gap-[6px] border-none bg-none p-0 text-left text-[var(--primary)] underline"
              >
                {titleText}
                <span title="Linked to Music Library" className="inline-block text-[0.85rem] no-underline">🎼</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-[6px]">
                {onEdit ? (
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="font-[inherit] cursor-pointer border-none bg-none p-0 text-left font-semibold text-inherit underline decoration-[var(--primary)] decoration-dotted underline-offset-[3px]"
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
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(74_124_89_/_15%)] bg-[rgb(74_124_89_/_8%)] px-[8px] py-[2px] text-xs font-semibold text-[var(--primary-deep)]">
                🎤 Solo / Small Group
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-muted ml-1 text-xs font-normal">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        )}
        {item.type !== 'intermission' && (displayComposer || displayDuration || (linkedPiece?.genres && linkedPiece.genres.length > 0)) && (
          <div className="text-muted flex-row gap-1 text-xs">
            {displayComposer && (
              <span className="text-muted text-xs">
                {displayComposer}
              </span>
            )}
            {displayComposer && displayDuration && <span>•</span>}
            {displayDuration && <span>{displayDuration}</span>}
            {linkedPiece?.genres && linkedPiece.genres.length > 0 && genres && (
              <div className="inline-flex flex-row flex-wrap items-center gap-1">
                {linkedPiece.genres.map(id => {
                  const found = genres.find(g => g.id === id);
                  return (
                    <span 
                      key={id}
                      className="inline-flex rounded border border-[rgb(74_124_89_/_15%)] bg-[rgb(74_124_89_/_8%)] px-[5px] py-[1px] text-[9px] leading-none font-semibold text-[var(--primary-deep)]"
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
          <div className="text-muted mt-[2px] text-xs italic">
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
          className="btn btn-secondary btn-sm flex !h-6 min-h-auto items-center justify-center !p-[0_8px]"
          title="Play default track"
        >
          🎵
        </button>
      )}
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">X</button>
    </div>
  );
};
