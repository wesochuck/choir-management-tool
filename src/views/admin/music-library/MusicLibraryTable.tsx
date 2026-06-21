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
import type { PiecePerformanceEntry } from '../../../hooks/usePiecePerformanceMap';
import { Button, DataTable, type ColumnDef } from '../../../components/ui';

export interface MusicLibraryTableProps {
  pieces: MusicPiece[];
  filteredPieces: MusicPiece[];
  genres: MusicGenreDef[];
  isLoading: boolean;
  duplicateIds: Set<string>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
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
  onSortChange: (field: MusicLibrarySortField, direction: SortDirection) => void;
  perfMap?: Map<string, PiecePerformanceEntry>;
}

export const MusicLibraryTable: React.FC<MusicLibraryTableProps> = ({
  pieces,
  filteredPieces,
  genres,
  isLoading,
  duplicateIds,
  selectedIds,
  onSelectionChange,
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
  perfMap = new Map(),
}) => {
  const totalPages = Math.max(1, Math.ceil(totalParentCount / pageSize));

  const columns: ColumnDef<MusicPiece>[] = [
    {
      id: 'title',
      header: 'Title',
      accessorFn: (row) => row.title,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="whitespace-normal">
          <MusicLibraryTitleCell
            piece={row.original}
            allPieces={pieces}
            isDuplicate={duplicateIds.has(row.original.id)}
            genres={genres}
          />
        </div>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'composer',
      header: 'Composer/Arranger',
      accessorFn: (row) => row.composer || row.arranger || '',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="whitespace-normal">
          {row.original.composer && row.original.arranger
            ? `${row.original.composer} / arr. ${row.original.arranger}`
            : row.original.composer || row.original.arranger || '-'}
        </div>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Composer',
      },
    },
    {
      id: 'duration',
      header: 'Duration',
      accessorFn: (row) => parseDurationToSeconds(row.duration),
      enableSorting: true,
      cell: ({ row }) =>
        row.original.duration
          ? formatSecondsToDuration(parseDurationToSeconds(row.original.duration))
          : '-',
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Duration',
      },
    },
    {
      id: 'performances',
      header: 'Perf',
      accessorFn: (row) => perfMap.get(row.id)?.count ?? 0,
      enableSorting: true,
      cell: ({ row }) => {
        const count = perfMap.get(row.original.id)?.count ?? 0;
        return count > 0 ? <span className="font-semibold">{count}</span> : '-';
      },
      meta: {
        align: 'center',
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'Perf',
      },
    },
    {
      id: 'lastPerformed',
      header: 'Last Performed',
      accessorFn: (row) => getEffectiveMostRecentPerformanceDate(row, pieces) || '',
      enableSorting: true,
      cell: ({ row }) => {
        const lastPerformedDate = getEffectiveMostRecentPerformanceDate(row.original, pieces);
        return lastPerformedDate || '-';
      },
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Last Performed',
      },
    },
    {
      id: 'tracks',
      header: 'Tracks',
      accessorFn: (row) => {
        const directTracks = row.audioTrackMapping
          ? Object.keys(row.audioTrackMapping).filter((key) => row.audioTrackMapping?.[key]).length
          : 0;
        const movementTracks = getMovementTrackCount(row, pieces);
        return directTracks + movementTracks;
      },
      enableSorting: true,
      cell: ({ row }) => {
        const isParent = isParentPiece(row.original, pieces);
        const totalMovementTracksCount = getMovementTrackCount(row.original, pieces);

        return (
          <div onClick={(e) => e.stopPropagation()}>
            {row.original.audioTrackMapping &&
            Object.keys(row.original.audioTrackMapping).length > 0 ? (
              <Button
                variant="secondary"
                size="tiny"
                className="!m-0"
                onClick={() => onPlayTrack(row.original)}
              >
                ▶ Play
              </Button>
            ) : isParent && totalMovementTracksCount > 0 ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPiece(row.original, 'tracks');
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
      meta: {
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'Tracks',
      },
    },
    {
      id: 'link',
      header: 'Link',
      cell: ({ row }) => {
        const catalogLookupUrl = row.original.catalogId
          ? resolveCatalogLookupUrl(catalogLookupTemplate, row.original.catalogId)
          : null;
        return row.original.catalogId && catalogLookupUrl ? (
          <a
            href={catalogLookupUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`View Catalog ID: ${row.original.catalogId}`}
            className="text-primary inline-flex size-6 items-center justify-center rounded-sm"
          >
            🔗
          </a>
        ) : null;
      },
      meta: {
        align: 'center',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="tiny"
            className="!m-0"
            onClick={() => onEditPiece(row.original)}
          >
            Edit
          </Button>
        </div>
      ),
      meta: {
        align: 'center',
      },
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
        enableSelection
        rowSelection={Object.fromEntries(Array.from(selectedIds).map((id) => [id, true]))}
        onSelectionChange={onSelectionChange}
        manualPagination
        rowCount={totalParentCount}
        pageCount={totalPages}
        onPaginationChange={(state) => onPageChange(state.pageIndex + 1)}
        pageSize={pageSize}
        onRowClick={(piece) => onEditPiece(piece)}
        getRowId={(p) => p.id}
        getRowClassName={(p) => (duplicateIds.has(p.id) ? 'bg-[rgb(255_138_101_/_5%)]' : '')}
        manualSorting
        onSortingChange={(sorting) => {
          const next = sorting[0];
          if (!next) {
            onSortChange('title', 'asc');
            return;
          }
          onSortChange(next.id as MusicLibrarySortField, next.desc ? 'desc' : 'asc');
        }}
        sorting={sortField ? [{ id: sortField, desc: sortDirection === 'desc' }] : []}
        renderPagination={(table) => {
          if (isLoading) return null;
          const pagState = table.getState().pagination;
          const first = pagState.pageIndex * pagState.pageSize + 1;
          const last = Math.min((pagState.pageIndex + 1) * pagState.pageSize, totalParentCount);
          return (
            <div className="border-border flex items-center justify-between rounded-b-md border-x border-b bg-[var(--bg-card,#fff)] px-6 py-4">
              <span className="text-muted text-sm font-medium">
                Showing {first}–{last} of {totalParentCount} pieces
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          );
        }}
      />
    </div>
  );
};
