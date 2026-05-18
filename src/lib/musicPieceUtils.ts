import type { MusicPiece, MusicPieceInput } from '../services/musicLibraryService';

/**
 * Searches the music library for a specific piece by its unique ID.
 * @param pieceId The ID of the music piece to look up.
 * @param library The list of music pieces in the library.
 * @returns The matching MusicPiece object, or null if not found or parameters are invalid.
 */
export function findPieceDetails(
  pieceId: string | undefined,
  library: MusicPiece[] | undefined
): MusicPiece | null {
  if (!pieceId || !library || library.length === 0) {
    return null;
  }
  return library.find((piece) => piece.id === pieceId) || null;
}

/**
 * Formats the performance history of a music piece.
 * @param piece The music piece object.
 * @returns An array of formatted performance string titles with dates.
 */
export function formatPerformanceHistory(piece: any): string[] {
  if (!piece || !piece.expand || !piece.expand.performances || !Array.isArray(piece.expand.performances)) {
    return [];
  }
  return piece.expand.performances.map((perf: any) => {
    const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
    return `${perf.title}${dateStr ? ` (${dateStr})` : ''}`;
  });
}

/**
 * Parses a CSV file into Partial<MusicPieceInput> elements.
 * Supports title, composer, copies, catalogId, duration, and notes.
 */
export function parseMusicLibraryCSV(csvText: string): Partial<MusicPieceInput>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const titleIdx = headers.findIndex(h => h.includes('title'));
  const composerIdx = headers.findIndex(h => h.includes('composer') || h.includes('arranger'));
  const copiesIdx = headers.findIndex(h => h.includes('cop'));
  const catalogIdx = headers.findIndex(h => h.includes('catalog') || h.includes('id'));
  const durationIdx = headers.findIndex(h => h.includes('duration') || h.includes('length') || h.includes('time'));
  const notesIdx = headers.findIndex(h => h.includes('note'));

  if (titleIdx === -1) {
    throw new Error('CSV must contain a "Title" column.');
  }

  const pieces: Partial<MusicPieceInput>[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV cell split that handles double-quoted commas
    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    if (!cells[titleIdx]) continue;

    let copies: number | undefined = undefined;
    if (copiesIdx !== -1 && cells[copiesIdx]) {
      const parsed = parseInt(cells[copiesIdx], 10);
      if (!isNaN(parsed)) copies = parsed;
    }

    pieces.push({
      title: cells[titleIdx],
      composer: composerIdx !== -1 && cells[composerIdx] !== undefined ? cells[composerIdx] : '',
      copies,
      catalogId: catalogIdx !== -1 && cells[catalogIdx] !== undefined ? cells[catalogIdx] : '',
      duration: durationIdx !== -1 && cells[durationIdx] ? cells[durationIdx] : undefined,
      notes: notesIdx !== -1 && cells[notesIdx] !== undefined ? cells[notesIdx] : '',
      performances: []
    });
  }

  return pieces;
}

import type { SetListItem } from '../services/eventService';

/**
 * Links a set list item in a list of items to a specific music library piece ID.
 * @param items The current list of set list items.
 * @param itemId The ID of the set list item to link.
 * @param pieceId The ID of the created/selected music library piece.
 * @returns A new array of set list items with the specified item linked, or the original array if not found.
 */
export function linkSetListItemToPiece(
  items: SetListItem[],
  itemId: string,
  pieceId: string
): SetListItem[] {
  return items.map(item => 
    item.id === itemId ? { ...item, pieceId } : item
  );
}

/**
 * Validates whether a set list item has the minimum information required to be converted/created
 * as a music library piece.
 * @param title The title of the piece.
 * @returns true if valid, false otherwise.
 */
export function validatePieceForLibrary(title: string): boolean {
  return typeof title === 'string' && title.trim().length > 0;
}

export function exportMusicToCSV(pieces: any[]): string {
  const header = ['Title', 'Composer', 'Voicing'].join(',');
  const rows = pieces.map(p => [
    `"${p.title || ''}"`,
    `"${p.composer || ''}"`,
    `"${p.voicing || ''}"`
  ].join(','));
  return [header, ...rows].join('\n');
}

export function findDuplicates(pieces: any[]): any[] {
  const seen = new Map<string, any[]>();
  for (const piece of pieces) {
    const key = `${piece.title?.toLowerCase()?.trim() || ''}|${piece.composer?.toLowerCase()?.trim() || ''}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(piece);
  }
  
  const duplicates: any[] = [];
  for (const group of seen.values()) {
    if (group.length > 1) {
      duplicates.push(...group);
    }
  }
  return duplicates;
}




