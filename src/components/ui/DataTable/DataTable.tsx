import { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef as TanStackColumnDef,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { Spinner } from '../Spinner/Spinner';
import { EmptyState } from '../EmptyState/EmptyState';
import { DataTablePagination } from './pagination';
import type { ColumnDef as OurColumnDef, DataTableProps } from './types';

interface OurCellMeta {
  align?: 'left' | 'center' | 'right';
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  headerClassName?: string;
  cellClassName?: string;
  cardSection?: 0 | 1;
  cardSide?: 'left' | 'right';
  cardLabel?: string;
}

function toTanStackColumn<T>(col: OurColumnDef<T>): TanStackColumnDef<T> {
  const tanStackCol: TanStackColumnDef<T> = {
    id: col.id,
    header: col.header,
    accessorKey: col.accessorKey,
    accessorFn: col.accessorFn,
    enableSorting: col.enableSorting,
    meta: {
      align: col.align,
      hideBelow: col.hideBelow,
      headerClassName: col.headerClassName,
      cellClassName: col.cellClassName,
      cardSection: col.cardSection,
      cardSide: col.cardSide,
      cardLabel: col.cardLabel,
    } satisfies OurCellMeta,
  };

  if (col.cell) {
    tanStackCol.cell = ({ getValue, row }) => col.cell!(getValue(), row.original);
  }

  return tanStackCol;
}

function getCellMeta(cell: { column: { columnDef: { meta?: unknown } } }): OurCellMeta | undefined {
  return cell.column.columnDef.meta as OurCellMeta | undefined;
}

function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function hideClass(hideBelow?: 'sm' | 'md' | 'lg' | 'xl'): string {
  if (hideBelow === 'sm') return 'hidden sm:table-cell';
  if (hideBelow === 'md') return 'hidden md:table-cell';
  if (hideBelow === 'lg') return 'hidden lg:table-cell';
  if (hideBelow === 'xl') return 'hidden xl:table-cell';
  return '';
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyState,
  enableSelection,
  onSelectionChange,
  renderSelectionActions,
  onRowClick,
  manualSorting,
  onSortingChange,
  manualPagination,
  pagination: controlledPagination,
  onPaginationChange,
  pageCount,
  pageSize = 20,
  renderMobileCard: renderMobileCardProp,
  getRowId,
  getRowClassName,
  renderRow,
  defaultSorting,
  sorting: controlledSorting,
  hidePagination,
  paginationLabel,
}: DataTableProps<T>) {
  const tanStackColumns = useMemo(() => columns.map(toTanStackColumn), [columns]);

  const [internalSorting, setInternalSorting] = useState<SortingState>(defaultSorting ?? []);
  const sorting = controlledSorting ?? internalSorting;
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const pagination = controlledPagination ?? internalPagination;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  useEffect(() => {
    if (!manualPagination && !controlledPagination) {
      setInternalPagination((prev) => {
        if (prev.pageIndex === 0 && prev.pageSize === pageSize) return prev;
        return { pageIndex: 0, pageSize };
      });
    }
  }, [data.length, pageSize, manualPagination, controlledPagination]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tanStackColumns,
    state: {
      sorting,
      pagination,
      rowSelection,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;

      if (!controlledSorting) {
        setInternalSorting(next);
      }

      onSortingChange?.(next);
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;

      if (!controlledPagination) {
        setInternalPagination(next);
      }

      onPaginationChange?.(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      onSelectionChange?.(new Set(Object.keys(next).filter((k) => next[k])));
    },
    getCoreRowModel: getCoreRowModel(),
    ...(!manualSorting && { getSortedRowModel: getSortedRowModel() }),
    ...(!manualPagination && { getPaginationRowModel: getPaginationRowModel() }),
    manualSorting,
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    enableRowSelection: !!enableSelection,
    getRowId: getRowId ?? ((_originalRow: T, index: number) => String(index)),
    meta: {
      onRowClick,
      renderMobileCard: renderMobileCardProp,
      enableSelection,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
        <span className="ml-3 text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title={emptyState.title}
          description={emptyState.description}
          icon={emptyState.icon}
          action={emptyState.action}
        />
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div>
      {selectedCount > 0 && renderSelectionActions && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-slate-500">{selectedCount} selected</span>
          {renderSelectionActions({ selectedCount })}
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-xl border border-slate-100 shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/75">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {enableSelection && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={table.getIsAllRowsSelected()}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate =
                            table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
                        }
                      }}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                  </th>
                )}
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as OurCellMeta | undefined;
                  const sortable = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-xs font-semibold tracking-wider whitespace-nowrap text-slate-500 uppercase ${alignClass(meta?.align)} ${hideClass(meta?.hideBelow)} ${meta?.headerClassName ?? ''} ${sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                      onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                      title={sortable ? 'Click to sort' : undefined}
                      aria-sort={
                        sortable
                          ? sortState === 'asc'
                            ? 'ascending'
                            : sortState === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortable && (
                          <span
                            className={`text-xs transition-colors ${
                              sortState ? 'text-primary' : 'text-slate-300'
                            }`}
                            aria-hidden="true"
                          >
                            {sortState === 'asc'
                              ? '\u25B2'
                              : sortState === 'desc'
                                ? '\u25BC'
                                : '\u2195'}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((dataRow) => {
              if (renderRow) {
                const RowComponent = renderRow;
                return <RowComponent key={dataRow.id} row={dataRow.original} />;
              }
              return (
                <tr
                  key={dataRow.id}
                  className={`border-b border-slate-100 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/40' : ''
                  } ${getRowClassName?.(dataRow.original) ?? ''}`}
                  onClick={() => onRowClick?.(dataRow.original)}
                >
                  {enableSelection && (
                    <td className="w-10 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={dataRow.getIsSelected()}
                        onChange={dataRow.getToggleSelectedHandler()}
                      />
                    </td>
                  )}
                  {dataRow.getVisibleCells().map((cell) => {
                    const meta = getCellMeta(cell);
                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-2.5 text-sm whitespace-nowrap ${alignClass(meta?.align)} ${hideClass(meta?.hideBelow)} ${meta?.cellClassName ?? ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden">
        {renderMobileCardProp
          ? rows.map((row) => (
              <div key={row.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                {renderMobileCardProp(row.original)}
              </div>
            ))
          : rows.map((row) => {
              const cells = row.getVisibleCells();
              const section0Left = cells.filter(
                (c) => getCellMeta(c)?.cardSection === 0 && getCellMeta(c)?.cardSide === 'left'
              );
              const section0Right = cells.filter(
                (c) => getCellMeta(c)?.cardSection === 0 && getCellMeta(c)?.cardSide === 'right'
              );
              const section1Left = cells.filter(
                (c) => getCellMeta(c)?.cardSection === 1 && getCellMeta(c)?.cardSide === 'left'
              );
              const section1Right = cells.filter(
                (c) => getCellMeta(c)?.cardSection === 1 && getCellMeta(c)?.cardSide === 'right'
              );
              const hasSection0 = section0Left.length > 0 || section0Right.length > 0;
              const hasSection1 = section1Left.length > 0 || section1Right.length > 0;

              return (
                <div
                  key={row.id}
                  className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${getRowClassName?.(row.original) ?? ''}`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {hasSection0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {enableSelection && (
                          <input
                            type="checkbox"
                            checked={row.getIsSelected()}
                            onChange={row.getToggleSelectedHandler()}
                          />
                        )}
                        {section0Left.map((cell) => (
                          <span key={cell.id} className="text-sm font-medium text-slate-900">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {section0Right.map((cell) => (
                          <span key={cell.id} className="text-sm text-slate-600">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasSection1 && hasSection0 && (
                    <div className="mt-2 border-t border-slate-100 pt-2" />
                  )}

                  {hasSection1 && (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {!hasSection0 && enableSelection && (
                          <div className="mb-1">
                            <input
                              type="checkbox"
                              checked={row.getIsSelected()}
                              onChange={row.getToggleSelectedHandler()}
                            />
                          </div>
                        )}
                        {section1Left.map((cell) => {
                          const meta = getCellMeta(cell);
                          return (
                            <div key={cell.id} className="flex items-center gap-1">
                              {meta?.cardLabel && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  {meta.cardLabel}
                                </span>
                              )}
                              <span className="text-sm text-slate-900">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div
                        className="flex shrink-0 flex-col items-end gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {section1Right.map((cell) => {
                          const meta = getCellMeta(cell);
                          return (
                            <div key={cell.id} className="flex items-center gap-1">
                              {meta?.cardLabel && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  {meta.cardLabel}
                                </span>
                              )}
                              <span className="text-sm text-slate-600">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {!hidePagination && <DataTablePagination table={table} label={paginationLabel} />}
    </div>
  );
}
