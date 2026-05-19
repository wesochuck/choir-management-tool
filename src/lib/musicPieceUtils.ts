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

/**
 * Parses a duration string and returns the total duration in seconds.
 * Supports:
 * - MM:SS (e.g. "3:45", "03:45")
 * - HH:MM:SS (e.g. "1:15:30")
 * - Minutes only (e.g. "15", "10")
 * - Suffixes (e.g. "15m", "15 min", "15 mins", "45s", "45 sec")
 * @param durationStr The duration string to parse.
 * @returns The duration in seconds, or 0 if invalid/empty.
 */
export function parseDurationToSeconds(durationStr: string | undefined): number {
  if (!durationStr) return 0;
  const cleaned = durationStr.trim().toLowerCase();
  if (!cleaned) return 0;

  // Check if it's in format HH:MM:SS or MM:SS
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map(p => {
      const val = parseInt(p, 10);
      return isNaN(val) ? 0 : val;
    });

    if (parts.length === 3) {
      // HH:MM:SS
      const [h, m, s] = parts;
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      // MM:SS
      const [m, s] = parts;
      return m * 60 + s;
    }
  }

  // Check if it contains suffix matches like 'm', 'min', 's', 'sec', 'h', 'hr'
  const hourMatch = cleaned.match(/(\d+)\s*(h|hr|hours?)/);
  const minMatch = cleaned.match(/(\d+)\s*(m|min|minutes?)/);
  const secMatch = cleaned.match(/(\d+)\s*(s|sec|seconds?)/);

  if (hourMatch || minMatch || secMatch) {
    let totalSec = 0;
    if (hourMatch) totalSec += parseInt(hourMatch[1], 10) * 3600;
    if (minMatch) totalSec += parseInt(minMatch[1], 10) * 60;
    if (secMatch) totalSec += parseInt(secMatch[1], 10);
    return totalSec;
  }

  // If it's a pure number, assume minutes
  const pureNum = parseInt(cleaned, 10);
  if (!isNaN(pureNum)) {
    return pureNum * 60; // minutes to seconds
  }

  return 0;
}

/**
 * Formats a duration in seconds to a human-readable HH:MM:SS or MM:SS string.
 * @param totalSeconds The total duration in seconds.
 * @returns A formatted duration string.
 */
export function formatSecondsToDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0:00';
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const sStr = s.toString().padStart(2, '0');
  
  if (h > 0) {
    const mStr = m.toString().padStart(2, '0');
    return `${h}:${mStr}:${sStr}`;
  }
  
  return `${m}:${sStr}`;
}




