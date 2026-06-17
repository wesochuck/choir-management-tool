import React, { useState } from 'react';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../services/settingsService';
import {
  toggleIdInSet,
  type MusicLibrarySortField,
  type SortDirection,
} from '../../../lib/music/libraryRows';
import { Pagination } from '../../../components/common/Pagination';
import { MusicLibraryRow } from './table/MusicLibraryRow';
import { getChildMovements } from './table/musicLibraryTableUtils';

export interface MusicLibraryTableProps {
  pieces: MusicPiece[];
  filteredPieces: MusicPiece[];
  genres: MusicGenreDef[];
  isLoading: boolean;
  duplicateIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEditPiece: (
    piece: MusicPiece,
    tab?: 'details' | 'tracks' | 'performances' | 'movements'
  ) => void;
  onPlayTrack: (piece: MusicPiece) => void;
  catalogLookupTemplate: string;
  currentPage: number;
  pageSize: number;
  totalParentCount: number;
  onPageChange: (page: number) => void;
  sortField: MusicLibrarySortField;
  sortDirection: SortDirection;
  onSortChange: (field: MusicLibrarySortField) => void;
}

export const MusicLibraryTable: React.FC<MusicLibraryTableProps> = ({
  pieces,
  filteredPieces,
  genres,
  isLoading,
  duplicateIds,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onEditPiece,
  onPlayTrack,
  catalogLookupTemplate,
  currentPage,
  pageSize,
  totalParentCount,
  onPageChange,
  sortField,
  sortDirection,
  onSortChange,
}) => {
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParentIds((prev) => toggleIdInSet(prev, id));
  };

  const totalPages = Math.max(1, Math.ceil(totalParentCount / pageSize));

  const renderSortHeader = (label: string, field: MusicLibrarySortField) => {
    const isActive = sortField === field;
    return (
      <th
        className={`text-label border-border cursor-pointer border px-[10px] py-[6px] font-semibold select-none ${isActive ? 'text-primary' : 'text-text-muted'}`}
        onClick={() => onSortChange(field)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <span
            className={`inline-block text-[10px] ${isActive ? 'opacity-100' : 'opacity-[0.35]'}`}
          >
            {!isActive ? '⇅' : sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="!m-0">
      <div className="overflow-x-auto">
        <table className="border-border w-full min-w-[760px] border-collapse border text-left">
          <thead>
            <tr className="bg-primary-light">
              <th className="text-label text-muted border-border w-10 border px-[10px] py-[6px] text-center font-semibold">
                <input
                  type="checkbox"
                  checked={
                    filteredPieces.length > 0 && filteredPieces.every((p) => selectedIds.has(p.id))
                  }
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="!m-0 !h-[14px] !min-h-auto !w-[14px] cursor-pointer align-middle"
                />
              </th>
              {renderSortHeader('Title', 'title')}
              {renderSortHeader('Composer/Arranger', 'composer')}
              {renderSortHeader('Duration', 'duration')}
              <th className="text-label text-muted border-border w-[50px] border px-[10px] py-[6px] text-center font-semibold">
                Perf
              </th>
              {renderSortHeader('Last Performed', 'lastPerformed')}
              <th className="text-label text-muted border-border border px-[10px] py-[6px] font-semibold">
                Tracks
              </th>
              <th className="text-label text-muted border-border w-[60px] border px-[10px] py-[6px] text-center font-semibold">
                Link
              </th>
              <th className="text-label text-muted border-border w-20 border px-[10px] py-[6px] font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-text-muted px-6 py-12 text-center text-sm">
                  <p>Loading library...</p>
                </td>
              </tr>
            ) : filteredPieces.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-text-muted px-6 py-12 text-center text-sm">
                  <p>No pieces found.</p>
                </td>
              </tr>
            ) : (
              filteredPieces.map((piece) => {
                if (piece.parentId) return null;

                const isExpanded = expandedParentIds.has(piece.id);
                const movements = getChildMovements(piece, pieces);

                return (
                  <React.Fragment key={piece.id}>
                    <MusicLibraryRow
                      piece={piece}
                      allPieces={pieces}
                      isChildMovement={false}
                      isExpanded={isExpanded}
                      duplicateIds={duplicateIds}
                      selectedIds={selectedIds}
                      genres={genres}
                      catalogLookupTemplate={catalogLookupTemplate}
                      onToggleSelection={onToggleSelection}
                      onToggleExpansion={toggleRowExpansion}
                      onEditPiece={onEditPiece}
                      onPlayTrack={onPlayTrack}
                    />

                    {isExpanded &&
                      movements.map((movement) => (
                        <MusicLibraryRow
                          key={movement.id}
                          piece={movement}
                          allPieces={pieces}
                          isChildMovement={true}
                          isExpanded={false}
                          duplicateIds={duplicateIds}
                          selectedIds={selectedIds}
                          genres={genres}
                          catalogLookupTemplate={catalogLookupTemplate}
                          onToggleSelection={onToggleSelection}
                          onToggleExpansion={toggleRowExpansion}
                          onEditPiece={onEditPiece}
                          onPlayTrack={onPlayTrack}
                        />
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalParentCount > 0 && (
        <div className="border-border flex items-center justify-between rounded-b-md border-x border-b bg-[var(--bg-card,#fff)] px-6 py-4">
          <span className="text-muted text-sm font-medium">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalParentCount)}–
            {Math.min(currentPage * pageSize, totalParentCount)} of {totalParentCount} pieces
          </span>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};
