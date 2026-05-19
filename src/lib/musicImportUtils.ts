import type { CSVData } from './rosterImportUtils';

export type MusicField = 'title' | 'composer' | 'copies' | 'catalogId' | 'duration' | 'notes';
export type MusicFieldMapping = Record<MusicField, number>;

export interface MappedMusicPiece {
  rowNumber: number;
  data: {
    title: string;
    composer: string;
    copies?: number;
    catalogId: string;
    duration?: string;
    notes: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function suggestMusicFieldMapping(headers: string[]): MusicFieldMapping {
  const mapping: MusicFieldMapping = {
    title: -1,
    composer: -1,
    copies: -1,
    catalogId: -1,
    duration: -1,
    notes: -1,
  };

  const titleKeywords = ['title', 'piece', 'song', 'name'];
  const composerKeywords = ['composer', 'arranger', 'writer', 'by'];
  const copiesKeywords = ['copies', 'qty', 'quantity', 'count', 'cop'];
  const catalogKeywords = ['catalog', 'id', 'cat', 'number'];
  const durationKeywords = ['duration', 'length', 'time'];
  const notesKeywords = ['notes', 'comments', 'comment', 'description'];

  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase();
    
    const matches = (keywords: string[]) => keywords.some(k => clean.includes(k) || k.includes(clean));

    if (mapping.title === -1 && matches(titleKeywords)) {
      mapping.title = index;
    } else if (mapping.composer === -1 && matches(composerKeywords)) {
      mapping.composer = index;
    } else if (mapping.copies === -1 && matches(copiesKeywords)) {
      mapping.copies = index;
    } else if (mapping.catalogId === -1 && matches(catalogKeywords)) {
      mapping.catalogId = index;
    } else if (mapping.duration === -1 && matches(durationKeywords)) {
      mapping.duration = index;
    } else if (mapping.notes === -1 && matches(notesKeywords)) {
      mapping.notes = index;
    }
  });

  return mapping;
}

export function validateAndMapMusicPieces(
  csvData: CSVData,
  mapping: MusicFieldMapping
): MappedMusicPiece[] {
  const result: MappedMusicPiece[] = [];

  csvData.rows.forEach((row, rowIndex) => {
    // Row number is 1-indexed, header is row 1, so data rows start at row 2
    const rowNumber = rowIndex + 2;

    const getValue = (field: MusicField): string => {
      const idx = mapping[field];
      if (idx === -1 || idx >= row.length) return '';
      return row[idx].trim();
    };

    const title = getValue('title');
    const composer = getValue('composer');
    const rawCopies = getValue('copies');
    const catalogId = getValue('catalogId');
    const duration = getValue('duration') || undefined;
    const notes = getValue('notes');

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Title validation
    if (!title) {
      errors.push('Title is required.');
    }

    // 2. Copies validation
    let copies: number | undefined = undefined;
    if (rawCopies) {
      const parsed = parseInt(rawCopies, 10);
      if (isNaN(parsed)) {
        warnings.push(`Unrecognized copies count "${rawCopies}", leaving blank.`);
      } else {
        copies = parsed;
      }
    }

    const isValid = errors.length === 0;

    result.push({
      rowNumber,
      data: {
        title,
        composer,
        copies,
        catalogId,
        duration,
        notes,
      },
      isValid,
      errors,
      warnings,
    });
  });

  return result;
}
