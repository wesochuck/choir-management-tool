import React from 'react';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../services/settingsService';
import { type MusicLibrarySortField, type SortDirection } from '../../../lib/music/libraryRows';
import { Pagination } from '../../../components/common/Pagination';
import { MusicLibraryTitleCell } from './table/MusicLibraryTitleCell';
import {
  resolveCatalogLookupUrl,
  formatSecondsToDuration,
  parseDurationToSeconds,
} from '../../../lib/musicPieceUtils';
import { getEffectiveMostRecentPerformanceDate } from '../../../lib/music/performanceHistory';
import { getMovementTrackCount, isParentPiece } from './table/musicLibraryTableUtils';
import { Button, DataTable, type ColumnDef } from '../../../components/ui';

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
  const totalPages = Math.max(1, Math.ceil(totalParentCount / pageSize));

  const columns: ColumnDef<MusicPiece>[] = [
    {
      id: 'select',
      header: '',
      cell: (_, row) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => onToggleSelection(row.id)}
            className="!m-0 !h-[14px] !min-h-auto !w-[14px] cursor-pointer align-middle"
          />
        </div>
      ),
    },
    {
      id: 'title',
      header: 'Title',
      enableSorting: true,
      cell: (_, row) => (
        <div className="whitespace-normal">
          <MusicLibraryTitleCell
            piece={row}
            allPieces={pieces}
            isDuplicate={duplicateIds.has(row.id)}
            genres={genres}
          />
        </div>
      ),
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'composer',
      header: 'Composer/Arranger',
      enableSorting: true,
      cell: (_, row) => (
        <div className="whitespace-normal">
          {row.composer && row.arranger
            ? `${row.composer} / arr. ${row.arranger}`
            : row.composer || row.arranger || '-'}
        </div>
      ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Composer',
    },
    {
      id: 'duration',
      header: 'Duration',
      enableSorting: true,
      cell: (_, row) =>
        row.duration ? formatSecondsToDuration(parseDurationToSeconds(row.duration)) : '-',
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Duration',
    },
    {
      id: 'performances',
      header: 'Perf',
      align: 'center',
      cell: (_, row) =>
        row.performances && row.performances.length > 0 ? (
          <span className="font-semibold">{row.performances.length}</span>
        ) : (
          '-'
        ),
      cardSection: 1,
      cardSide: 'right',
      cardLabel: 'Perf',
    },
    {
      id: 'lastPerformed',
      header: 'Last Performed',
      enableSorting: true,
      cell: (_, row) => {
        const lastPerformedDate = getEffectiveMostRecentPerformanceDate(row, pieces);
        return lastPerformedDate || '-';
      },
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Last Performed',
    },
    {
      id: 'tracks',
      header: 'Tracks',
      cell: (_, row) => {
        const isParent = isParentPiece(row, pieces);
        const totalMovementTracksCount = getMovementTrackCount(row, pieces);

        return (
          <div onClick={(e) => e.stopPropagation()}>
            {row.audioTrackMapping && Object.keys(row.audioTrackMapping).length > 0 ? (
              <Button
                variant="secondary"
                size="tiny"
                className="!m-0"
                onClick={() => onPlayTrack(row)}
              >
                🎵 Play
              </Button>
            ) : isParent && totalMovementTracksCount > 0 ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPiece(row, 'tracks');
                }}
                className="text-primary inline-flex cursor-pointer items-center gap-1 rounded-full border border-[rgb(27_77_62_/_15%)] bg-[rgb(27_77_62_/_8%)] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap transition-colors hover:bg-[rgb(27_77_62_/_12%)]"
              >
                🎧 {totalMovementTracksCount} in mvts
              </span>
            ) : (
              <span className="text-muted text-xs">-</span>
            )}
          </div>
        );
      },
      cardSection: 1,
      cardSide: 'right',
      cardLabel: 'Tracks',
    },
    {
      id: 'link',
      header: 'Link',
      align: 'center',
      cell: (_, row) => {
        const catalogLookupUrl = row.catalogId
          ? resolveCatalogLookupUrl(catalogLookupTemplate, row.catalogId)
          : null;
        return row.catalogId && catalogLookupUrl ? (
          <a
            href={catalogLookupUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`View Catalog ID: ${row.catalogId}`}
            className="text-primary inline-flex size-6 items-center justify-center rounded-sm"
          >
            🔗
          </a>
        ) : null;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'center',
      cell: (_, row) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="tiny" className="!m-0" onClick={() => onEditPiece(row)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="!m-0">
      <DataTable
        columns={columns}
        data={filteredPieces}
        isLoading={isLoading}
        emptyState={{
          title: 'No pieces found.',
          icon: '🎵',
        }}
        manualPagination
        pageCount={totalPages}
        onPaginationChange={(state) => onPageChange(state.pageIndex + 1)}
        pageSize={pageSize}
        hidePagination
        onRowClick={(piece) => onEditPiece(piece)}
        getRowId={(p) => p.id}
        getRowClassName={(p) => (duplicateIds.has(p.id) ? 'bg-[rgb(255_138_101_/_5%)]' : '')}
        manualSorting
        onSortingChange={(sorting) => {
          if (sorting.length > 0) onSortChange(sorting[0].id as MusicLibrarySortField);
        }}
        defaultSorting={sortField ? [{ id: sortField, desc: sortDirection === 'desc' }] : undefined}
      />

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
