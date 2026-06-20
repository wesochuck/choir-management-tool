import { useMemo } from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../../services/settingsService';
import { MultiMovementBadge } from './MusicLibraryBadges';
import { CHIP_CLASSES, getChipClass } from '../../../../lib/chipColorUtils';
import { isParentPiece } from './musicLibraryTableUtils';

interface MusicLibraryTitleCellProps {
  piece: MusicPiece;
  allPieces: MusicPiece[];
  isDuplicate: boolean;
  genres: MusicGenreDef[];
}

export function MusicLibraryTitleCell({
  piece,
  allPieces,
  isDuplicate,
  genres,
}: MusicLibraryTitleCellProps) {
  const isParent = isParentPiece(piece, allPieces);

  const chipClassMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...genres].sort((a, b) => a.label.localeCompare(b.label));
    sorted.forEach((genre, idx) => {
      map.set(genre.id, getChipClass(idx));
    });
    return map;
  }, [genres]);

  return (
    <div className="flex flex-col gap-[2px]">
      <div className="flex flex-row flex-wrap items-center gap-[6px]">
        <strong className={`font-bold ${isDuplicate ? 'text-section-orange' : ''}`}>
          {piece.title}
        </strong>
        {isParent && <MultiMovementBadge />}
      </div>
      <div className="mt-[2px] flex flex-row flex-wrap items-center gap-[6px]">
        {piece.genres?.map((id) => {
          const found = genres.find((g) => g.id === id);
          const chipClass = chipClassMap.get(id) || CHIP_CLASSES[0];
          return (
            <span
              key={id}
              className={`inline-flex rounded-[4px] border px-[5px] py-[1px] text-[9px] font-medium ${chipClass}`}
            >
              {found ? found.label : id}
            </span>
          );
        })}
      </div>
    </div>
  );
}
