import type {
  ColumnDef as TanStackColumnDef,
  SortingState,
  PaginationState,
  RowSelectionState,
  ColumnFiltersState,
  VisibilityState,
  Table,
} from '@tanstack/react-table';
import type { ComponentType, ReactNode } from 'react';

export interface DataTableColumnMeta {
  align?: 'left' | 'center' | 'right';
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  headerClassName?: string;
  cellClassName?: string;
  cardSection?: 0 | 1;
  cardSide?: 'left' | 'right';
  cardLabel?: string;
}

export type ColumnDef<T> = TanStackColumnDef<T, unknown> & {
  meta?: DataTableColumnMeta;
};

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading: boolean;
  emptyState: {
    title: string;
    description?: string;
    icon: ReactNode;
    action?: ReactNode;
  };
  enableSelection?: boolean;
  onSelectionChange?: (ids: Set<string>) => void;
  renderSelectionActions?: (info: { selectedCount: number }) => ReactNode;
  onRowClick?: (row: T) => void;
  defaultSorting?: SortingState;
  sorting?: SortingState;
  manualSorting?: boolean;
  onSortingChange?: (sorting: SortingState) => void;
  manualPagination?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (state: PaginationState) => void;
  rowCount?: number;
  pageCount?: number;
  pageSize?: number;
  paginationLabel?: string;
  hidePagination?: boolean;
  getRowId?: (originalRow: T, index: number) => string;
  getRowClassName?: (row: T) => string;
  renderMobileCard?: (row: T) => ReactNode;
  renderRow?: ComponentType<{ row: T }>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  globalFilter?: unknown;
  onGlobalFilterChange?: (value: unknown) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (state: ColumnFiltersState) => void;
  manualFiltering?: boolean;
  enableGlobalFilter?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
  defaultColumnVisibility?: VisibilityState;
  renderToolbar?: (table: Table<T>) => ReactNode;
  renderPagination?: (table: Table<T>) => ReactNode;
}
