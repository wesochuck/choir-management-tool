import type { MusicPiece, MusicPieceInput } from '../../types/musicLibrary';
import type { MusicGenreDef } from '../../services/settingsService';

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

export function exportMusicToCSV(pieces: MusicPiece[], options?: { genres?: MusicGenreDef[] }): string {
  const header = ['Title', 'Composer', 'Voicing', 'Applies To', 'Genres'].join(',');
  const rows = pieces.map(p => {
    const applicability = (!p.sectionBuckets || p.sectionBuckets.length === 0) 
      ? 'All' 
      : p.sectionBuckets.join(';');
      
    const genreList = options?.genres 
      ? p.genres?.map(id => options.genres!.find(g => g.id === id)?.label || id).join(';') || ''
      : p.genres?.join(';') || '';

    return [
      `"${p.title || ''}"`,
      `"${p.composer || ''}"`,
      `"${p.voicing || ''}"`,
      `"${applicability}"`,
      `"${genreList}"`
    ].join(',');
  });
  return [header, ...rows].join('\n');
}
