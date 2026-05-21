import type { MusicPiece } from '../../types/musicLibrary';
import type { SectionDef } from '../../services/settingsService';

/**
 * Returns true if a music piece applies to the specified section bucket.
 * Unrestricted pieces (no sectionBuckets or empty) apply to all buckets.
 */
export function pieceAppliesToSectionBucket(piece: Partial<MusicPiece>, sectionCode: string): boolean {
  if (!piece.sectionBuckets || piece.sectionBuckets.length === 0) {
    return true;
  }
  return piece.sectionBuckets.includes(sectionCode);
}

/**
 * Returns a human-readable label describing a piece's section-bucket applicability.
 */
export function getSectionBucketApplicabilityLabel(piece: Partial<MusicPiece>, sections: SectionDef[]): string {
  if (!piece.sectionBuckets || piece.sectionBuckets.length === 0) {
    return 'All section buckets';
  }
  
  return piece.sectionBuckets.map(code => {
    const section = sections.find(s => s.code === code);
    return section ? section.name : code;
  }).join(', ');
}

/**
 * Filters a list of music pieces by section bucket applicability.
 * If no section code is selected, returns all pieces.
 */
export function filterPiecesBySectionBucket(pieces: MusicPiece[], selectedSectionCode: string): MusicPiece[] {
  if (!selectedSectionCode) {
    return pieces;
  }
  return pieces.filter(p => pieceAppliesToSectionBucket(p, selectedSectionCode));
}
