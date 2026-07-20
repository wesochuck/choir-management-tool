import type React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetListItem } from '../../services/eventService';
import type { MusicPiece } from '../../types/musicLibrary';
import { getDefaultPlayableTrackKey } from '../../lib/setList/setListItems';
import { formatFeaturedNumberCredit } from '../../lib/setList/performerCredits';
import type { MusicGenreDef } from '../../services/settingsService';
import { Button, Icon } from '../ui';

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
  const linkedPieceId = item.pieceId || linkedPiece?.id;
  const hasAudio = linkedPiece ? !!getDefaultPlayableTrackKey(linkedPiece) : false;
  const featuredCredit = formatFeaturedNumberCredit(item);

  return (
    <div
      ref={setNodeRef}
      className={`border-border flex flex-row flex-wrap items-center gap-3 rounded-md border px-3.5 py-2.5 transition-colors sm:flex-nowrap ${
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

      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
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
            <span className="text-text font-semibold">{titleText}</span>
            {linkedPieceId && onPieceClick && (
              <button
                type="button"
                onClick={() => onPieceClick(linkedPieceId)}
                aria-label={`Edit ${titleText} in the Music Library`}
                className="text-primary hover:text-primary-deep focus-visible:ring-primary inline-flex cursor-pointer items-center gap-1 rounded border-none bg-transparent px-1 py-0.5 text-xs font-medium underline decoration-1 underline-offset-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Icon name="journal-music" className="text-sm" />
                <span>Edit Library Piece</span>
              </button>
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

      <div className="flex basis-full shrink-0 items-center justify-end gap-1.5 pl-8 sm:ml-auto sm:basis-auto sm:pl-0">
        <Button
          variant="outline"
          size="small"
          onClick={() => onEdit(item)}
          aria-label={`Edit set list details for ${titleText}`}
          title="Edit details for this set list"
        >
          Set List Details
        </Button>
        {hasAudio && onPlayTrack && (
          <Button
            variant="outline"
            size="small"
            icon={<Icon name="play-fill" />}
            onClick={(e) => {
              e.stopPropagation();
              if (linkedPiece) onPlayTrack(linkedPiece);
            }}
            aria-label={`Play ${titleText}`}
            title={`Play ${titleText}`}
          />
        )}
        <Button
          variant="danger"
          size="small"
          icon={<Icon name="trash3" />}
          onClick={() => onDelete(item.id)}
          aria-label={`Remove ${titleText} from the set list`}
          title={`Remove ${titleText} from the set list`}
        />
      </div>
    </div>
  );
};
