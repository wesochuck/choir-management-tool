import type { MusicPiece } from '../../types/musicLibrary';
import { filterPiecesBySectionBucket } from './applicability';

export interface BuildVisibleMusicLibraryRowsOptions {
  searchTerm?: string;
  showDuplicatesOnly?: boolean;
  showMovements?: boolean;
  duplicateIds?: Set<string>;
  sectionFilter?: string;
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
    sectionFilter = ''
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
  if (sectionFilter) {
    result = filterPiecesBySectionBucket(result, sectionFilter);
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
