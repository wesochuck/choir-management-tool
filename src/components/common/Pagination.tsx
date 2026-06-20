import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

import { computePaginationRange, DOTS } from '../../lib/paginationUtils';

const paginationBtnClass =
  'inline-flex justify-center items-center min-w-[38px] h-[38px] px-2 rounded-lg border border-border bg-white text-text text-sm font-medium cursor-pointer transition-all duration-200 outline-none ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-text-muted disabled:border-border disabled:transform-none ' +
  'hover:enabled:border-primary-deep hover:enabled:bg-gray-50 hover:enabled:text-primary-deep hover:enabled:-translate-y-px ' +
  'active:enabled:translate-y-0 ' +
  'focus-visible:shadow-[0_0_0_2px_white,0_0_0_4px_var(--color-primary-deep)] ' +
  'motion-reduce:transition-none motion-reduce:transform-none';

const activeBtnClass =
  '!bg-primary-deep !text-white !border-primary-deep font-semibold shadow-md hover:enabled:translate-y-0';

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}) => {
  // Compute sliding window page array using extracted helper
  const paginationRange = React.useMemo(() => {
    return computePaginationRange(currentPage, totalPages, siblingCount);
  }, [currentPage, totalPages, siblingCount]);

  // If there is only 1 page, don't display pagination at all or show simple page info
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav
      className="m-4 mx-auto flex flex-row flex-wrap items-center justify-center gap-1 select-none"
      role="navigation"
      aria-label="Pagination Navigation"
    >
      {/* First Page Button */}
      <button
        type="button"
        className={paginationBtnClass}
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
        aria-label="Go to first page"
      >
        ⏮
      </button>

      {/* Previous Page Button */}
      <button
        type="button"
        className={paginationBtnClass}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        ◀
      </button>

      {/* Page Numbers */}
      {paginationRange.map((pageNumber, idx) => {
        if (pageNumber === DOTS) {
          return (
            <span
              key={`dots-${idx}`}
              className="text-text-muted inline-flex h-[38px] min-w-[32px] cursor-default items-center justify-center px-3 text-base font-semibold"
              aria-hidden="true"
            >
              &#8230;
            </span>
          );
        }

        const pageNum = pageNumber as number;
        const isCurrent = pageNum === currentPage;

        return (
          <button
            key={pageNum}
            type="button"
            className={`${paginationBtnClass} ${isCurrent ? activeBtnClass : ''}`}
            onClick={() => handlePageChange(pageNum)}
            aria-label={`Go to page ${pageNum}`}
            aria-current={isCurrent ? 'page' : undefined}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Next Page Button */}
      <button
        type="button"
        className={paginationBtnClass}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        ▶
      </button>

      {/* Last Page Button */}
      <button
        type="button"
        className={paginationBtnClass}
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Go to last page"
      >
        ⏭
      </button>
    </nav>
  );
};
