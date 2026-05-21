import type { MusicPiece, MusicPieceInput } from '../services/musicLibraryService';
import type { Event } from '../services/eventService';
import { DEFAULT_VOICE_PARTS } from '../services/settingsService';
import { getSectionFromVoicePart } from './voicePartUtils';
import type { VoicePartDef } from '../services/settingsService';

type MusicPieceWithPerformanceHistory = MusicPiece & {
  expand?: {
    performances?: Event[];
  };
};

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
export function formatPerformanceHistory(piece: MusicPieceWithPerformanceHistory): string[] {
  if (!piece || !piece.expand || !piece.expand.performances || !Array.isArray(piece.expand.performances)) {
    return [];
  }
  return piece.expand.performances.map((perf) => {
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

export function exportMusicToCSV(pieces: MusicPiece[]): string {
  const header = ['Title', 'Composer', 'Voicing'].join(',');
  const rows = pieces.map(p => [
    `"${p.title || ''}"`,
    `"${p.composer || ''}"`,
    `"${p.voicing || ''}"`
  ].join(','));
  return [header, ...rows].join('\n');
}

export function findDuplicates(pieces: MusicPiece[]): MusicPiece[] {
  const seen = new Map<string, MusicPiece[]>();
  for (const piece of pieces) {
    const key = `${piece.title?.toLowerCase()?.trim() || ''}|${piece.composer?.toLowerCase()?.trim() || ''}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(piece);
  }
  
  const duplicates: MusicPiece[] = [];
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
  if (!isValidDurationString(cleaned)) return 0;

  // Check if it's in format HH:MM:SS or MM:SS
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map(p => Number.parseInt(p, 10));

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
 * Returns true when a duration is in one of the formats the app can safely parse.
 */
export function isValidDurationString(durationStr: string | undefined): boolean {
  if (!durationStr) return false;
  const cleaned = durationStr.trim().toLowerCase();
  if (!cleaned) return false;

  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length !== 2 && parts.length !== 3) return false;
    if (!parts.every(part => /^\d+$/.test(part))) return false;

    const numbers = parts.map(part => Number.parseInt(part, 10));
    if (parts.length === 2) {
      const [, seconds] = numbers;
      return seconds < 60;
    }

    const [, minutes, seconds] = numbers;
    return minutes < 60 && seconds < 60;
  }

  if (/^\d+$/.test(cleaned)) return true;

  const durationUnitsPattern = /^(?=.*\d)\s*(?:(\d+)\s*(?:h|hr|hrs|hours?)\s*)?(?:(\d+)\s*(?:m|min|mins|minutes?)\s*)?(?:(\d+)\s*(?:s|sec|secs|seconds?)\s*)?$/;
  const match = cleaned.match(durationUnitsPattern);
  return Boolean(match && (match[1] || match[2] || match[3]));
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

/**
 * Appends a music piece to a set list if it is not already present in the set list.
 * @param setList The existing set list array (can be undefined).
 * @param piece The music piece details to append.
 * @returns An object containing:
 *  - updated: boolean indicating if a new item was appended
 *  - setList: the updated set list array
 */
export function appendPieceToSetList(
  setList: SetListItem[] | undefined,
  piece: { id: string; title: string; composer?: string; duration?: string; notes?: string }
): { updated: boolean; setList: SetListItem[] } {
  const currentList = setList ? [...setList] : [];
  
  // Check if a set list item already references this pieceId
  const alreadyExists = currentList.some(item => item.pieceId === piece.id);
  if (alreadyExists) {
    return { updated: false, setList: currentList };
  }

  const newItem: SetListItem = {
    id: crypto.randomUUID(),
    pieceId: piece.id,
    title: piece.title,
    composer: piece.composer || '',
    duration: piece.duration || '',
    notes: '', // Notes are specific to the performance and initialized to empty
    type: 'song'
  };

  currentList.push(newItem);
  return { updated: true, setList: currentList };
}

/**
 * Resolves a catalog lookup URL given a template and a piece's catalog ID.
 * @param template The configured URL template containing `{catalogId}`.
 * @param catalogId The piece's catalog ID.
 * @returns The resolved URL, or null if template or catalogId is empty/invalid.
 */
export function resolveCatalogLookupUrl(
  template: string | undefined,
  catalogId: string | undefined
): string | null {
  if (!template || !catalogId) return null;
  const trimmedTemplate = template.trim();
  const trimmedId = catalogId.trim();
  if (!trimmedTemplate || !trimmedId) return null;

  return trimmedTemplate.replace(/{catalogId}/g, encodeURIComponent(trimmedId));
}

/**
 * Resolves recommended audio tracks for a given voice part key from the tracks mapping.
 * @param voicePart The singer's voice part (e.g. "S1", "S2", "A1", "Bass").
 * @param mapping The track mapping object (e.g. {"tutti": "...", "S1": "...", "S": "..."}).
 * @returns An array of matching keys in order of preference.
 */
export function resolveRecommendedTracks(
  voicePart: string | undefined,
  mapping: Record<string, string> | undefined,
  voiceParts?: VoicePartDef[]
): string[] {
  if (!mapping) return [];
  const activeKeys = Object.keys(mapping).filter(k => mapping[k] && mapping[k].trim() !== '');
  if (activeKeys.length === 0) return [];

  const recommendedSet = new Set<string>();
  const normalizedPart = voicePart ? voicePart.trim() : '';

  if (normalizedPart) {
    // 1. Direct exact match
    const exactMatchKey = activeKeys.find(k => k.toLowerCase() === normalizedPart.toLowerCase());
    if (exactMatchKey) {
      recommendedSet.add(exactMatchKey);
    } else {
      const resolvedVoiceParts = voiceParts && voiceParts.length > 0 ? voiceParts : DEFAULT_VOICE_PARTS;
      
      const getSectionOfKey = (k: string): string => {
        const vp = resolvedVoiceParts.find(v => v.label.toLowerCase() === k.toLowerCase());
        if (vp && vp.sectionCode) {
          return vp.sectionCode;
        }
        return getSectionFromVoicePart(k);
      };

      const requestedSection = getSectionOfKey(normalizedPart);
      if (requestedSection !== 'Other') {
        // 2a. Broad section match (e.g. "S")
        const sectionCodeMatch = activeKeys.find(k => k.toLowerCase() === requestedSection.toLowerCase());
        if (sectionCodeMatch) {
          recommendedSet.add(sectionCodeMatch);
        }

        // 2b. Other voice parts in the same section (e.g. "S1")
        const sameSectionLabels = resolvedVoiceParts
          .filter(vp => vp.sectionCode === requestedSection)
          .map(vp => vp.label.toLowerCase());

        for (const label of sameSectionLabels) {
          const match = activeKeys.find(k => k.toLowerCase() === label);
          if (match) {
            recommendedSet.add(match);
          }
        }

        // 2c. Generic fallback for same section
        for (const k of activeKeys) {
          if (getSectionOfKey(k) === requestedSection) {
            recommendedSet.add(k);
          }
        }
      } else {
        // Fallback for unconfigured or custom legacy values
        const baseSection = normalizedPart.replace(/\d+/g, '').trim();
        if (baseSection && baseSection !== normalizedPart) {
          const prefixMatch = activeKeys.find(k => k.toLowerCase() === baseSection.toLowerCase());
          if (prefixMatch) {
            recommendedSet.add(prefixMatch);
          }
        }
        
        if (recommendedSet.size === 0 && baseSection) {
          const related = activeKeys.find(k => k.toLowerCase().startsWith(baseSection.toLowerCase()) && k.toLowerCase() !== 'tutti');
          if (related) {
            recommendedSet.add(related);
          }
        }
      }
    }
  }

  // 4. Always add Tutti (Full Mix) as fallback option if available
  const tuttiKey = activeKeys.find(k => k.toLowerCase() === 'tutti');
  if (tuttiKey) {
    recommendedSet.add(tuttiKey);
  }

  return Array.from(recommendedSet);
}

/**
 * Resolves metadata for a music piece, inheriting fields from a parent piece if the child's fields are blank.
 * @param piece The music piece to resolve.
 * @param parent Optional parent music piece to inherit from.
 * @returns A new music piece object with inherited values.
 */
export function resolvePieceMetadata(
  piece: Partial<MusicPiece>,
  parent?: Partial<MusicPiece>
): Partial<MusicPiece> {
  if (!parent) return piece;
  return {
    ...piece,
    composer: piece.composer?.trim() ? piece.composer : (parent.composer || ''),
    voicing: piece.voicing?.trim() ? piece.voicing : (parent.voicing || ''),
    copies: piece.copies !== undefined && piece.copies !== null ? piece.copies : parent.copies,
    catalogId: piece.catalogId?.trim() ? piece.catalogId : (parent.catalogId || ''),
  };
}

/**
 * Derives the human-readable context label shown in the Learning Tracks upload header.
 * For a standalone piece: returns the piece title.
 * For a movement (child piece): returns "Parent Title – Movement Title".
 *
 * @param piece An object with at least a `title` string.
 * @param parentTitle Optional parent piece name (only present for child/movement pieces).
 * @returns A formatted context label string.
 */
export function getLearningTrackContextLabel(
  piece: { title: string },
  parentTitle?: string
): string {
  const movementTitle = piece.title.trim();
  const parent = parentTitle?.trim();
  if (parent) {
    return `${parent} – ${movementTitle}`;
  }
  return movementTitle;
}

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

import type { SectionDef } from '../services/settingsService';

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
