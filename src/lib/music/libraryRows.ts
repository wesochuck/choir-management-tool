import type { MusicPiece } from '../../types/musicLibrary';
import {
  getEffectiveMostRecentPerformanceDate,
  type PerformanceRecencyFilter,
} from './performanceHistory';
import { parseDurationToSeconds } from './duration';

export type MusicLibrarySortField =
  | 'title'
  | 'composer'
  | 'duration'
  | 'copies'
  | 'catalogId'
  | 'lastPerformed'
  | 'performances'
  | 'tracks';
export type SortDirection = 'asc' | 'desc';
export type FilterMode = 'OR' | 'AND';

export interface BuildVisibleMusicLibraryRowsOptions {
  searchTerm?: string;
  showDuplicatesOnly?: boolean;
  showMovements?: boolean;
  duplicateIds?: Set<string>;
  sectionFilters?: string[];
  genreFilters?: string[];
  genreFilterMode?: FilterMode;
  recencyFilter?: PerformanceRecencyFilter;
  now?: Date;
  sortField?: MusicLibrarySortField;
  sortDirection?: SortDirection;
  ignoreArticles?: boolean;
}

function getSortTitle(title: string, ignoreArticles: boolean): string {
  if (!ignoreArticles) return title;
  return title.replace(/^(?:a|an|the)\s+/i, '');
}

export function getTrackSortCount(piece: MusicPiece, allPieces: MusicPiece[]): number {
  const directTracks = piece.audioTrackMapping
    ? Object.keys(piece.audioTrackMapping).filter((key) => piece.audioTrackMapping?.[key]).length
    : 0;

  const movementTracks = allPieces
    .filter((candidate) => candidate.parentId === piece.id)
    .reduce((sum, movement) => {
      const count = movement.audioTrackMapping
        ? Object.keys(movement.audioTrackMapping).filter((key) => movement.audioTrackMapping?.[key])
            .length
        : 0;
      return sum + count;
    }, 0);

  return directTracks + movementTracks;
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
    sectionFilters = [],
    genreFilters = [],
    genreFilterMode = 'OR',
    recencyFilter = 'all',
    now,
    sortField = 'title',
    sortDirection = 'asc',
    ignoreArticles = false,
  } = options;

  let result = [...pieces];

  // 1. Core Visibility Filtering
  if (!showMovements) {
    result = result.filter((p) => !p.parentId);
  }

  if (showDuplicatesOnly) {
    result = result.filter((p) => duplicateIds.has(p.id));
  }

  // 2. Search Matching
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.composer?.toLowerCase().includes(lower) ||
        p.arranger?.toLowerCase().includes(lower) ||
        p.catalogId?.toLowerCase().includes(lower) ||
        p.notes?.toLowerCase().includes(lower)
    );
  }

  // 3. Section Bucket Applicability
  if (sectionFilters && sectionFilters.length > 0) {
    result = result.filter((p) => {
      if (!p.sectionBuckets || p.sectionBuckets.length === 0) {
        return true;
      }
      return p.sectionBuckets.some((code) => sectionFilters.includes(code));
    });
  }

  // 3b. Genre Filtering
  if (genreFilters && genreFilters.length > 0) {
    const realGenreFilters = genreFilters.filter((id) => id !== '__no-genre__');
    const includeNoGenre = genreFilters.includes('__no-genre__');
    result = result.filter((p) => {
      const pGenres = p.genres || [];
      const hasNoGenres = !Array.isArray(pGenres) || pGenres.length === 0;

      if (genreFilterMode === 'AND') {
        // AND mode: Must match ALL criteria
        if (includeNoGenre && !hasNoGenres) return false;
        if (realGenreFilters.length > 0) {
          return realGenreFilters.every((gId) => pGenres.includes(gId));
        }
        return includeNoGenre ? hasNoGenres : true;
      } else {
        // OR mode: Match ANY criteria
        if (includeNoGenre && hasNoGenres) return true;
        if (realGenreFilters.length > 0 && pGenres.some((gId) => realGenreFilters.includes(gId)))
          return true;
        return false;
      }
    });
  }

  // 3c. Performance Recency Filtering
  if (recencyFilter && recencyFilter !== 'all') {
    const referenceDate = now || new Date();
    result = result.filter((p) => {
      const mostRecent = getEffectiveMostRecentPerformanceDate(p, pieces);

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

  // Separate parent/standalone and child pieces from the current result set
  const parents = result.filter((p) => !p.parentId);
  const children = result.filter((p) => p.parentId);

  const comparePieces = (a: MusicPiece, b: MusicPiece): number => {
    switch (sortField) {
      case 'composer': {
        const compA = a.composer || '';
        const compB = b.composer || '';
        const comp = compA.localeCompare(compB);
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'duration': {
        const durA = parseDurationToSeconds(a.duration);
        const durB = parseDurationToSeconds(b.duration);
        const comp = durA - durB;
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'copies': {
        const copiesA = a.copies !== undefined ? a.copies : -1;
        const copiesB = b.copies !== undefined ? b.copies : -1;
        const comp = copiesA - copiesB;
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'catalogId': {
        const catA = a.catalogId || '';
        const catB = b.catalogId || '';
        const comp = catA.localeCompare(catB);
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'lastPerformed': {
        const dateA = getEffectiveMostRecentPerformanceDate(a, pieces);
        const dateB = getEffectiveMostRecentPerformanceDate(b, pieces);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        const comp = dateA.localeCompare(dateB);
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'performances': {
        const countA = Array.isArray(a.performances) ? a.performances.length : 0;
        const countB = Array.isArray(b.performances) ? b.performances.length : 0;
        const comp = countA - countB;
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'tracks': {
        const comp = getTrackSortCount(a, pieces) - getTrackSortCount(b, pieces);
        return sortDirection === 'asc' ? comp : -comp;
      }
      case 'title':
      default: {
        const titleA = getSortTitle(a.title, ignoreArticles);
        const titleB = getSortTitle(b.title, ignoreArticles);
        const comp = titleA.localeCompare(titleB);
        return sortDirection === 'asc' ? comp : -comp;
      }
    }
  };

  parents.sort(comparePieces);

  const sorted: MusicPiece[] = [];
  const childMap = new Map<string, MusicPiece[]>();

  // Group children by parentId
  children.forEach((child) => {
    if (child.parentId) {
      const list = childMap.get(child.parentId) || [];
      list.push(child);
      childMap.set(child.parentId, list);
    }
  });

  // Sort each parent's children alphabetically by title
  childMap.forEach((list) => {
    list.sort((a, b) => {
      const titleA = getSortTitle(a.title, ignoreArticles);
      const titleB = getSortTitle(b.title, ignoreArticles);
      return titleA.localeCompare(titleB);
    });
  });

  // Insert children immediately following their parent piece
  parents.forEach((parent) => {
    sorted.push(parent);
    const parentChildren = childMap.get(parent.id);
    if (parentChildren) {
      sorted.push(...parentChildren);
    }
  });

  // 5. Handle Orphans
  // (children whose parents are not in the current filtered list, or whose parentId is invalid)
  const sortedIds = new Set(sorted.map((p) => p.id));
  const orphans = children.filter((child) => !sortedIds.has(child.id));
  orphans.sort(comparePieces);
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
