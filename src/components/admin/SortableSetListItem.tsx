import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetListItem } from '../../services/eventService';
import type { MusicPiece } from '../../types/musicLibrary';
import { getDefaultPlayableTrackKey } from '../../lib/setList/setListItems';
import { formatFeaturedNumberCredit } from '../../lib/setList/performerCredits';
import type { MusicGenreDef } from '../../services/settingsService';
import { Button } from '../ui';

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
  genres,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'none',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 0,
    position: 'relative' as const,
  };

  const titleText = displayTitle || item.title;
  const hasAudio = linkedPiece ? !!getDefaultPlayableTrackKey(linkedPiece) : false;
  const featuredCredit = formatFeaturedNumberCredit(item);

  return (
    <div
      ref={setNodeRef}
      className={`border-border flex flex-row items-center gap-3 rounded-md border px-3.5 py-2.5 transition-colors ${
        item.type === 'intermission'
          ? 'border-primary/40 bg-primary-light/15 border-dashed'
          : 'bg-surface hover:bg-surface-muted/70 shadow-sm'
      }`}
      // @allow-inline-style - dnd-kit sortable transform and transition
      style={{
        ...style,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-text-muted hover:text-text flex cursor-grab items-center p-1 select-none"
      >
        <span className="text-[1.2rem] leading-none">⣿</span>
      </div>

      <div className="flex flex-1 flex-col gap-[2px]">
        {item.type === 'intermission' ? (
          <div className="flex flex-row flex-wrap items-center gap-2">
            <span className="text-primary-deep text-lg font-semibold">⏸️ {titleText}</span>
            {displayDuration && (
              <span className="bg-primary-light text-primary-deep inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold">
                {displayDuration}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-text-muted text-base italic">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        ) : (
          <div className="m-0 flex flex-row flex-wrap items-center gap-1.5 text-lg">
            {(item.pieceId || linkedPiece?.id) && onPieceClick ? (
              <button
                type="button"
                onClick={() => onPieceClick((item.pieceId || linkedPiece?.id)!)}
                className="text-primary decoration-primary/30 hover:text-primary-deep inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left font-semibold underline decoration-1 underline-offset-2"
              >
                {titleText}
                <span title="Linked to Music Library" className="inline-block text-xs no-underline">
                  🎼
                </span>
              </button>
            ) : (
              <span className="text-text inline-flex items-center gap-1">
                {onEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="hover:text-primary decoration-border cursor-pointer border-none bg-transparent p-0 text-left font-semibold text-inherit underline decoration-dotted underline-offset-2"
                  >
                    {titleText}
                  </button>
                ) : (
                  <span className="font-semibold">{titleText}</span>
                )}
                {(item.pieceId || linkedPiece?.id) && (
                  <span title="Linked to Music Library" className="text-xs">
                    🎼
                  </span>
                )}
              </span>
            )}
            {featuredCredit && (
              <span className="border-primary-light bg-primary-light text-primary-deep inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold">
                <span aria-hidden="true">🎤</span>
                {featuredCredit}
              </span>
            )}
            {cumulativeStart && cumulativeEnd && (
              <span className="text-text-muted text-base font-normal">
                ({cumulativeStart} - {cumulativeEnd})
              </span>
            )}
          </div>
        )}
        {item.type !== 'intermission' &&
          (displayComposer ||
            displayDuration ||
            (linkedPiece?.genres && linkedPiece.genres.length > 0)) && (
            <div className="text-text-muted flex flex-row flex-wrap items-center gap-1.5 text-base">
              {displayComposer && <span>{displayComposer}</span>}
              {displayComposer && displayDuration && <span>•</span>}
              {displayDuration && <span>{displayDuration}</span>}
              {linkedPiece?.genres && linkedPiece.genres.length > 0 && genres && (
                <div className="inline-flex flex-row flex-wrap items-center gap-1">
                  {linkedPiece.genres.map((id) => {
                    const found = genres.find((g) => g.id === id);
                    return (
                      <span
                        key={id}
                        className="border-primary-light/70 bg-primary-light/50 text-primary-deep inline-flex rounded border px-1.5 py-0.5 text-[11px] leading-none font-semibold"
                      >
                        {found ? found.label : id}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        {item.notes && <div className="text-text-muted mt-0.5 text-base italic">{item.notes}</div>}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="small" onClick={() => onEdit(item)}>
          Edit
        </Button>
        {hasAudio && onPlayTrack && (
          <Button
            variant="outline"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (linkedPiece) onPlayTrack(linkedPiece);
            }}
            title="Play default track"
          >
            🎵
          </Button>
        )}
        <Button variant="danger" size="small" onClick={() => onDelete(item.id)}>
          X
        </Button>
      </div>
    </div>
  );
};
