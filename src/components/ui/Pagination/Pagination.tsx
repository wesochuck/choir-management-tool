import { useMemo } from 'react';
import { computePaginationRange, DOTS } from '../../../lib/paginationUtils';
import type { PaginationProps as CommonPaginationProps } from '../../common/Pagination';
import styles from './Pagination.module.css';

export type { CommonPaginationProps as PaginationProps };

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
    <nav className={styles.nav} role="navigation" aria-label="Pagination Navigation">
      <button type="button" className={styles.btn}
        onClick={() => handlePageChange(1)} disabled={currentPage === 1}
        aria-label="Go to first page">{'\u23EE'}</button>
      <button type="button" className={styles.btn}
        onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
        aria-label="Go to previous page">{'\u25C0'}</button>
      {paginationRange.map((pageNumber, idx) => {
        if (pageNumber === DOTS) {
          return <span key={`dots-${idx}`} className={styles.dots} aria-hidden="true">{'\u2026'}</span>;
        }
        const pageNum = pageNumber as number;
        const isCurrent = pageNum === currentPage;
        return (
          <button key={pageNum} type="button"
            className={[styles.btn, isCurrent ? styles.active : ''].join(' ').trim()}
            onClick={() => handlePageChange(pageNum)}
            aria-label={`Go to page ${pageNum}`}
            aria-current={isCurrent ? 'page' : undefined}>
            {pageNum}
          </button>
        );
      })}
      <button type="button" className={styles.btn}
        onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
        aria-label="Go to next page">{'\u25B6'}</button>
      <button type="button" className={styles.btn}
        onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}
        aria-label="Go to last page">{'\u23ED'}</button>
    </nav>
  );
}
