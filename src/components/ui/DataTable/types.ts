import type { ComponentType, ReactNode } from 'react';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T & string;
  accessorFn?: (row: T) => unknown;
  cell?: (value: unknown, row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  enableSorting?: boolean;
  hideBelow?: 'sm' | 'md';
  cardSection?: 0 | 1;
  cardSide?: 'left' | 'right';
  cardLabel?: string;
}

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
  defaultSorting?: { id: string; desc: boolean }[];
  manualSorting?: boolean;
  onSortingChange?: (sorting: { id: string; desc: boolean }[]) => void;
  manualPagination?: boolean;
  onPaginationChange?: (state: { pageIndex: number; pageSize: number }) => void;
  pageCount?: number;
  pageSize?: number;
  getRowId?: (originalRow: T, index: number) => string;
  getRowClassName?: (row: T) => string;
  renderMobileCard?: (row: T) => ReactNode;
  renderRow?: ComponentType<{ row: T }>;
}
