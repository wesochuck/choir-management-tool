import React from 'react';
import './Pagination.css';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

import { computePaginationRange, DOTS } from '../../lib/paginationUtils';

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
      className="app-pagination flex-row" 
      role="navigation" 
      aria-label="Pagination Navigation"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        marginTop: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      {/* First Page Button */}
      <button
        type="button"
        className="pagination-btn arrow-btn"
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
        aria-label="Go to first page"
      >
        ⏮
      </button>

      {/* Previous Page Button */}
      <button
        type="button"
        className="pagination-btn arrow-btn"
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
              className="pagination-dots"
              aria-hidden="true"
              style={{
                padding: '8px 12px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
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
            className={`pagination-btn num-btn ${isCurrent ? 'active' : ''}`}
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
        className="pagination-btn arrow-btn"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        ▶
      </button>

      {/* Last Page Button */}
      <button
        type="button"
        className="pagination-btn arrow-btn"
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Go to last page"
      >
        ⏭
      </button>
    </nav>
  );
};
