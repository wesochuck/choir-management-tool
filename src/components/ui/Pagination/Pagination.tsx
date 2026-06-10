import { useMemo } from 'react';
import { computePaginationRange, DOTS } from '../../../lib/paginationUtils';
import type { PaginationProps as CommonPaginationProps } from '../../common/Pagination';

export type { CommonPaginationProps as PaginationProps };

const baseBtnClass = [
  'inline-flex items-center justify-center',
  'min-w-[36px] h-9 px-1',
  'border border-border rounded',
  'bg-surface text-text text-sm',
  'cursor-pointer transition-colors duration-200',
  'disabled:opacity-40 disabled:cursor-not-allowed',
  'hover:bg-primary-light hover:border-primary hover:text-primary-deep',
].join(' ');

const activeBtnClass = 'bg-primary text-surface border-primary hover:bg-primary-deep hover:text-surface';

export function Pagination({
  currentPage, totalPages, onPageChange, siblingCount = 1,
}: CommonPaginationProps) {
  const paginationRange = useMemo(() => {
    return computePaginationRange(currentPage, totalPages, siblingCount);
  }, [currentPage, totalPages, siblingCount]);

  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav className="flex items-center gap-1" role="navigation" aria-label="Pagination Navigation">
      <button type="button" className={baseBtnClass}
        onClick={() => handlePageChange(1)} disabled={currentPage === 1}
        aria-label="Go to first page">{'\u23EE'}</button>
      <button type="button" className={baseBtnClass}
        onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
        aria-label="Go to previous page">{'\u25C0'}</button>
      {paginationRange.map((pageNumber, idx) => {
        if (pageNumber === DOTS) {
          return <span key={`dots-${idx}`} className="inline-flex h-9 min-w-[36px] items-center justify-center text-sm text-text-muted" aria-hidden="true">{'\u2026'}</span>;
        }
        const pageNum = pageNumber as number;
        const isCurrent = pageNum === currentPage;
        return (
          <button key={pageNum} type="button"
            className={[baseBtnClass, isCurrent ? activeBtnClass : ''].filter(Boolean).join(' ')}
            onClick={() => handlePageChange(pageNum)}
            aria-label={`Go to page ${pageNum}`}
            aria-current={isCurrent ? 'page' : undefined}>
            {pageNum}
          </button>
        );
      })}
      <button type="button" className={baseBtnClass}
        onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
        aria-label="Go to next page">{'\u25B6'}</button>
      <button type="button" className={baseBtnClass}
        onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}
        aria-label="Go to last page">{'\u23ED'}</button>
    </nav>
  );
}
