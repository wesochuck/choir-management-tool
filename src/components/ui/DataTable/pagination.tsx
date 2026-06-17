import { type Table } from '@tanstack/react-table';

interface DataTablePaginationProps<T> {
  table: Table<T>;
}

export function DataTablePagination<T>({ table }: DataTablePaginationProps<T>) {
  const pageCount = table.getPageCount();
  if (pageCount <= 1) return null;

  const currentPage = table.getState().pagination.pageIndex;

  const maxVisible = 7;
  let pages: (number | 'ellipsis')[];
  if (pageCount <= maxVisible) {
    pages = Array.from({ length: pageCount }, (_, i) => i);
  } else {
    pages = [0];
    if (currentPage > 3) pages.push('ellipsis');
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pageCount - 2, currentPage + 2); i++) {
      pages.push(i);
    }
    if (currentPage < pageCount - 4) pages.push('ellipsis');
    pages.push(pageCount - 1);
  }

  return (
    <nav className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-3">
      <button
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        className="rounded-md px-2 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-1 text-sm text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => table.setPageIndex(p)}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
              p === currentPage
                ? 'bg-primary text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p + 1}
          </button>
        )
      )}
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
