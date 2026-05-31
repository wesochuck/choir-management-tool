import type { MusicPiece } from '../../types/musicLibrary';
import { filterPiecesBySectionBucket } from './applicability';
import { filterPiecesByGenre } from './genres';
import {
  getMostRecentPerformanceDate,
  type PerformanceRecencyFilter,
} from './performanceHistory';

export interface BuildVisibleMusicLibraryRowsOptions {
  searchTerm?: string;
  showDuplicatesOnly?: boolean;
  showMovements?: boolean;
  duplicateIds?: Set<string>;
  /** @deprecated Use sectionFilters instead. */
  sectionFilter?: string;
  sectionFilters?: string[];
  /** @deprecated Use genreFilters instead. */
  genreFilter?: string;
  genreFilters?: string[];
  recencyFilter?: PerformanceRecencyFilter;
  now?: Date;
}

/**
 * Pure function that handles the complex filtering, sorting, and hierarchical grouping
 * of music library pieces for display in the library table.
 */
export function buildVisibleMusicLibraryRows(
  pieces: MusicPiece[],
  options: BuildVisibleMusicLibraryRowsOptions
): MusicPiece[] {
  const { 
    searchTerm = '', 
    showDuplicatesOnly = false, 
    showMovements = false, 
    duplicateIds = new Set<string>(),
    sectionFilter = '',
    sectionFilters = [],
    genreFilter = '',
    genreFilters = [],
    recencyFilter = 'all',
    now
  } = options;

  let result = [...pieces];

  // 1. Core Visibility Filtering
  if (!showMovements) {
    result = result.filter(p => !p.parentId);
  }

  if (showDuplicatesOnly) {
    result = result.filter(p => duplicateIds.has(p.id));
  }

  // 2. Search Matching
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    result = result.filter(p => 
      p.title.toLowerCase().includes(lower) || 
      p.composer?.toLowerCase().includes(lower) ||
      p.catalogId?.toLowerCase().includes(lower)
    );
  }

  // 3. Section Bucket Applicability
  if (sectionFilters && sectionFilters.length > 0) {
    result = result.filter(p => {
      if (!p.sectionBuckets || p.sectionBuckets.length === 0) {
        return true;
      }
      return p.sectionBuckets.some(code => sectionFilters.includes(code));
    });
  } else if (sectionFilter) {
    result = filterPiecesBySectionBucket(result, sectionFilter);
  }

  // 3b. Genre Filtering
  if (genreFilters && genreFilters.length > 0) {
    result = result.filter(p => {
      if (!p.genres || !Array.isArray(p.genres)) {
        return false;
      }
      return p.genres.some(gId => genreFilters.includes(gId));
    });
  } else if (genreFilter) {
    result = filterPiecesByGenre(result, genreFilter);
  }

  // 3c. Performance Recency Filtering
  if (recencyFilter && recencyFilter !== 'all') {
    const referenceDate = now || new Date();
    result = result.filter(p => {
      const mostRecent = getMostRecentPerformanceDate(p);

      if (recencyFilter === 'never') {
        return mostRecent === null;
      }

      if (recencyFilter === 'within-1-year') {
        if (!mostRecent) return false;
        const cutoff = subtractYears(referenceDate, 1);
        return isOnOrAfterDateOnly(mostRecent, cutoff);
      }

      if (recencyFilter === 'within-2-years') {
        if (!mostRecent) return false;
        const cutoff = subtractYears(referenceDate, 2);
        return isOnOrAfterDateOnly(mostRecent, cutoff);
      }

      if (recencyFilter === 'within-3-years') {
        if (!mostRecent) return false;
        const cutoff = subtractYears(referenceDate, 3);
        return isOnOrAfterDateOnly(mostRecent, cutoff);
      }

      if (recencyFilter === 'not-within-3-years') {
        if (!mostRecent) return true; // Never performed counts as not within 3 years
        const cutoff = subtractYears(referenceDate, 3);
        return !isOnOrAfterDateOnly(mostRecent, cutoff);
      }

      if (recencyFilter === 'not-within-5-years') {
        if (!mostRecent) return true; // Never performed counts as not within 5 years
        const cutoff = subtractYears(referenceDate, 5);
        return !isOnOrAfterDateOnly(mostRecent, cutoff);
      }

      return true;
    });
  }

  // 4. Hierarchical Sorting & Grouping
  // Separate parent/standalone and child pieces from the current result set
  const parents = result.filter(p => !p.parentId);
  const children = result.filter(p => p.parentId);

  // Sort parents alphabetically by title
  parents.sort((a, b) => a.title.localeCompare(b.title));

  const sorted: MusicPiece[] = [];
  const childMap = new Map<string, MusicPiece[]>();

  // Group children by parentId
  children.forEach(child => {
    if (child.parentId) {
      const list = childMap.get(child.parentId) || [];
      list.push(child);
      childMap.set(child.parentId, list);
    }
  });

  // Sort each parent's children alphabetically by title
  childMap.forEach(list => {
    list.sort((a, b) => a.title.localeCompare(b.title));
  });

  // Insert children immediately following their parent piece
  parents.forEach(parent => {
    sorted.push(parent);
    const parentChildren = childMap.get(parent.id);
    if (parentChildren) {
      sorted.push(...parentChildren);
    }
  });

  // 5. Handle Orphans
  // (children whose parents are not in the current filtered list, or whose parentId is invalid)
  const sortedIds = new Set(sorted.map(p => p.id));
  const orphans = children.filter(child => !sortedIds.has(child.id));
  orphans.sort((a, b) => a.title.localeCompare(b.title));
  sorted.push(...orphans);

  return sorted;
}

/**
 * Pure helper function to toggle an ID in a Set, returning a new Set.
 */
export function toggleIdInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

function subtractYears(date: Date, years: number): Date {
  const next = new Date(date.getTime());
  next.setFullYear(next.getFullYear() - years);
  return next;
}

function isOnOrAfterDateOnly(dateIso: string, cutoff: Date): boolean {
  const dateStr = dateIso.split('T')[0];
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return dateStr >= cutoffStr;
}
