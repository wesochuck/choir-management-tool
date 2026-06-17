import type { MusicPiece } from '../../types/musicLibrary';
import type { SetListItem } from '../../services/eventService';
import {
  isValidDurationString,
  parseDurationToSeconds,
  formatSecondsToDuration,
} from '../music/duration';
import { formatInTimezone } from '../timezone';

export interface SetListDisplayRow extends SetListItem {
  displayTitle: string;
  displayComposer: string;
  displayDuration: string;
  cumulativeStart: string;
  cumulativeEnd: string;
  resolvedPiece?: MusicPiece | null;
}

export interface SetListDurationTotals {
  songs: string;
  intermissions: string;
  gaps: string;
  total: string;
}

export function getPerformanceIdForSetListLibraryLink(
  event:
    | {
        id: string;
        type?: string;
      }
    | null
    | undefined
): string | undefined {
  return event?.type === 'Performance' ? event.id : undefined;
}

/**
 * Creates a SetListItem from custom input.
 */
export function createSetListItemFromCustomInput(input: {
  title: string;
  composer?: string;
  duration?: string;
  type: 'song' | 'intermission';
  notes?: string;
}): SetListItem {
  const { title, type, duration, composer, notes } = input;

  if (!title || !title.trim()) {
    throw new Error('Title is required');
  }

  if (duration && !isValidDurationString(duration)) {
    throw new Error('Invalid duration format');
  }

  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    composer: type === 'song' ? composer?.trim() || undefined : undefined,
    duration: duration?.trim() || undefined,
    notes: notes?.trim() || undefined,
    type,
  };
}

/**
 * Creates a SetListItem from a Music Library piece.
 */
export function createSetListItemFromMusicPiece(
  piece: MusicPiece,
  overrides: Partial<SetListItem> = {}
): SetListItem {
  return {
    id: crypto.randomUUID(),
    pieceId: piece.id,
    title: overrides.title?.trim() || piece.title,
    composer: overrides.composer?.trim() || piece.composer || '',
    duration: overrides.duration?.trim() || piece.duration || '',
    notes: overrides.notes?.trim() || '',
    type: 'song',
    ...overrides,
  };
}

/**
 * Updates an existing SetListItem with a patch.
 */
export function updateSetListItem(
  existingItem: SetListItem,
  patch: Partial<Omit<SetListItem, 'id'>>
): SetListItem {
  const updated = { ...existingItem, ...patch };

  if (updated.title !== undefined && (!updated.title || !updated.title.trim())) {
    throw new Error('Title is required');
  }

  if (
    updated.duration !== undefined &&
    updated.duration &&
    !isValidDurationString(updated.duration)
  ) {
    throw new Error('Invalid duration format');
  }

  // Clean up fields based on type
  if (updated.type === 'intermission') {
    updated.composer = undefined;
    updated.pieceId = undefined;
  }

  return updated;
}

/**
 * Resolves linked music library piece info and computes running timestamps.
 */
export function resolveSetListDisplayRows(
  items: SetListItem[],
  library: MusicPiece[]
): SetListDisplayRow[] {
  return items.reduce<SetListDisplayRow[]>((acc, item) => {
    // 1. Resolve by pieceId first
    let linkedPiece = item.pieceId ? library.find((p) => p.id === item.pieceId) : null;

    // 2. Fallback: Resolve by title match (case-insensitive, normalized) if pieceId is missing
    if (!linkedPiece && item.title) {
      const normTitle = item.title
        .toLowerCase()
        .replace(/[♪♫♬♩𝄞]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (normTitle) {
        linkedPiece =
          library.find(
            (p) =>
              !p.parentId &&
              p.title
                .toLowerCase()
                .replace(/[♪♫♬♩𝄞]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim() === normTitle
          ) ||
          library.find(
            (p) =>
              p.title
                .toLowerCase()
                .replace(/[♪♫♬♩𝄞]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim() === normTitle
          ) ||
          null;
      }
    }

    // 3. Parent work fallback for child movements to resolve composer
    const parentPiece = linkedPiece?.parentId
      ? library.find((p) => p.id === linkedPiece.parentId)
      : null;

    const displayTitle = item.title || linkedPiece?.title || '';
    const linkedComposer = linkedPiece?.composer || parentPiece?.composer || '';
    const linkedArranger = linkedPiece?.arranger || parentPiece?.arranger || '';
    const combinedLinked =
      linkedComposer && linkedArranger
        ? `${linkedComposer} (arr. ${linkedArranger})`
        : linkedComposer || linkedArranger;

    const displayComposer =
      item.type !== 'intermission' ? item.composer || combinedLinked || '' : '';
    const rawDuration = item.duration || linkedPiece?.duration || '';
    const durationSeconds = parseDurationToSeconds(rawDuration);

    const previousEndSeconds =
      acc.length > 0 ? parseDurationToSeconds(acc[acc.length - 1].cumulativeEnd) : 0;
    const endSec = previousEndSeconds + durationSeconds;

    acc.push({
      ...item,
      displayTitle,
      displayComposer,
      displayDuration: rawDuration ? formatSecondsToDuration(durationSeconds) : '',
      cumulativeStart: formatSecondsToDuration(previousEndSeconds),
      cumulativeEnd: formatSecondsToDuration(endSec),
      resolvedPiece: linkedPiece,
    });
    return acc;
  }, []);
}

/**
 * Calculates cumulative duration totals splitting songs and intermissions.
 */
export function calculateSetListDurationTotals(
  items: SetListItem[],
  library: MusicPiece[],
  announcementGapSeconds: number = 0
): SetListDurationTotals {
  // Multi-movement dedup: detect complete works (all children of a parent in setlist)
  // Map parentId -> count of children in library
  const parentChildCount: Record<string, number> = {};
  const presentChildCount: Record<string, number> = {};
  const completeParents: Record<string, boolean> = {};

  library.forEach((p) => {
    if (p.parentId) {
      parentChildCount[p.parentId] = (parentChildCount[p.parentId] || 0) + 1;
    }
  });

  items.forEach((item) => {
    if (item.pieceId) {
      const piece = library.find((p) => p.id === item.pieceId);
      if (piece && piece.parentId) {
        presentChildCount[piece.parentId] = (presentChildCount[piece.parentId] || 0) + 1;
      }
    }
  });

  Object.keys(parentChildCount).forEach((parentId) => {
    completeParents[parentId] = parentChildCount[parentId] === (presentChildCount[parentId] || 0);
  });

  let songsSeconds = 0;
  let intermissionSeconds = 0;
  const addedParentDurations = new Set<string>();

  items.forEach((item) => {
    const linkedPiece = item.pieceId ? library.find((p) => p.id === item.pieceId) : null;
    let rawDuration = item.duration || linkedPiece?.duration || '';

    // Multi-movement dedup: skip individual movements when all children present
    if (linkedPiece && linkedPiece.parentId && completeParents[linkedPiece.parentId]) {
      if (addedParentDurations.has(linkedPiece.parentId)) {
        return; // Already accounted for this parent
      }
      const parentPiece = library.find((p) => p.id === linkedPiece.parentId);
      if (parentPiece && parentPiece.duration) {
        rawDuration = parentPiece.duration;
      }
      addedParentDurations.add(linkedPiece.parentId);
    }

    const sec = parseDurationToSeconds(rawDuration);

    if (item.type === 'intermission') {
      intermissionSeconds += sec;
    } else {
      songsSeconds += sec;
    }
  });

  const numGaps = items.length > 1 ? items.length - 1 : 0;
  const totalGapSeconds = announcementGapSeconds * numGaps;

  return {
    songs: formatSecondsToDuration(songsSeconds),
    intermissions: formatSecondsToDuration(intermissionSeconds),
    gaps: formatSecondsToDuration(totalGapSeconds),
    total: formatSecondsToDuration(songsSeconds + intermissionSeconds + totalGapSeconds),
  };
}

/**
 * Determines the default track key to play for a piece.
 * Prefers 'tutti', then first available track.
 */
export function getDefaultPlayableTrackKey(piece: MusicPiece): string | null {
  const mapping = piece.audioTrackMapping;
  if (!mapping) return null;

  const keys = Object.keys(mapping).filter((k) => mapping[k]);
  if (keys.length === 0) return null;

  if (keys.includes('tutti')) return 'tutti';
  return keys[0];
}

/**
 * Builds plain text representation of a set list for copy/print.
 */
export function buildSetListPlainText(
  eventTitle: string,
  eventDate: string,
  timezone: string,
  venueName: string,
  items: SetListDisplayRow[]
): string {
  const dateStr = formatInTimezone(eventDate, timezone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = formatInTimezone(eventDate, timezone, {
    hour: 'numeric',
    minute: '2-digit',
  });

  let text = `Set List: ${eventTitle}\n`;
  text += `Date: ${dateStr}\n`;
  text += `Time: ${timeStr}\n`;
  if (venueName) text += `Venue: ${venueName}\n`;
  text += '\n';

  let songIndex = 1;
  items.forEach((item) => {
    if (item.type === 'intermission') {
      text += `${item.displayTitle || 'Intermission'}\n`;
    } else {
      const composerSuffix = item.displayComposer ? ` ~ ${item.displayComposer}` : '';
      text += `${songIndex}. ${item.displayTitle}${composerSuffix}\n`;
      songIndex++;
    }
  });

  return text;
}

/**
 * Filters the music library for suggestions based on a query.
 */
export function filterMusicLibrarySuggestions(library: MusicPiece[], query: string): MusicPiece[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return library
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.composer?.toLowerCase().includes(q) ||
        p.arranger?.toLowerCase().includes(q)
    )
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 10);
}
