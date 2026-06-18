import { type Table } from '@tanstack/react-table';

interface DataTablePaginationProps<T> {
  table: Table<T>;
  label?: string;
}

export function DataTablePagination<T>({ table, label }: DataTablePaginationProps<T>) {
  const pageCount = table.getPageCount();
  if (pageCount <= 1) return null;

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalCount = table.options.rowCount ?? table.getFilteredRowModel().rows.length;
  const firstItem = pageIndex * pageSize + 1;
  const lastItem = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <nav className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-3">
      <span className="mr-auto text-sm text-slate-500">
        Showing {firstItem}–{lastItem} of {totalCount}
        {label ? ` ${label}` : ''}
      </span>
      <button
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        className="rounded-md px-2 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        Prev
      </button>
      {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
        let page: number;
        if (pageCount <= 7) {
          page = i;
        } else if (pageIndex <= 3) {
          page = i;
        } else if (pageIndex >= pageCount - 4) {
          page = pageCount - 7 + i;
        } else {
          page = pageIndex - 3 + i;
        }
        return (
          <button
            key={page}
            onClick={() => table.setPageIndex(page)}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
              page === pageIndex ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {page + 1}
          </button>
        );
      })}
      <button
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
        className="rounded-md px-2 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        Next
      </button>
    </nav>
  );
}
