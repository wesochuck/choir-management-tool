import type { CSVData } from './rosterImportUtils';

export type MusicField =
  | 'title'
  | 'composer'
  | 'arranger'
  | 'copies'
  | 'catalogId'
  | 'duration'
  | 'notes'
  | 'purchaseDate';
export type MusicFieldMapping = Record<MusicField, number>;

export interface MappedMusicPiece {
  rowNumber: number;
  data: {
    title: string;
    composer: string;
    arranger?: string;
    purchaseDate?: string;
    copies?: number;
    catalogId: string;
    duration?: string;
    notes: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function trimStr(s: string): string {
  if (!s) return '';
  return s.replace(/^[\s,;./()]+|[\s,;./()]+$/g, '').trim();
}

function parseComposerArranger(combined: string): { composer: string; arranger: string } {
  if (!combined) return { composer: '', arranger: '' };

  const trimmed = combined.trim();

  // Pattern 1: Check if there's a parentheses with an arranger inside, like "Traditional (arr. Moses Hogan)"
  const parenArrMatch = trimmed.match(/\((?:arr|arranged)(?:\.|by)?\s*([^)]+)\)/i);
  if (parenArrMatch) {
    const arranger = trimStr(parenArrMatch[1]);
    const composer = trimStr(trimmed.replace(parenArrMatch[0], ''));
    if (composer && arranger) {
      return { composer, arranger };
    }
  }

  // Pattern 2: Check standard parentheses like "(arr.)" or "(arr)" at the end, e.g. "Moses Hogan (arr.)"
  const parenArrSuffixMatch = trimmed.match(/\((?:arr|arranged)\.?\)/i);
  if (parenArrSuffixMatch) {
    const composer = trimStr(trimmed.replace(parenArrSuffixMatch[0], ''));
    return { composer, arranger: '' };
  }

  // Pattern 3: Split by common delimiters like "/ arr. ", ", arr. ", " arr. ", "arranged by", "/ arr"
  const splitRegex = /(?:\/|,|\b)\s*(?:arr(?:anged)?\b\.?\s*(?:by)?)\s+/i;
  const match = trimmed.match(splitRegex);
  if (match && match.index !== undefined) {
    const composer = trimStr(trimmed.slice(0, match.index));
    const arranger = trimStr(trimmed.slice(match.index + match[0].length));
    if (composer && arranger) {
      return { composer, arranger };
    }
  }

  // Pattern 4: Fallback to simple split by "/" if the word "arr" or "arrange" appears in the second half
  if (trimmed.indexOf('/') !== -1) {
    const parts = trimmed.split('/');
    if (parts.length === 2) {
      const left = trimStr(parts[0]);
      const right = trimStr(parts[1]);
      if (/arr|arrange/i.test(right)) {
        const arrangerVal = right.replace(/^(?:arr(?:anged)?\b\.?\s*(?:by)?\s*)/i, '').trim();
        return {
          composer: left,
          arranger: trimStr(arrangerVal),
        };
      }
    }
  }

  return { composer: trimStr(trimmed), arranger: '' };
}

function parsePurchaseDate(val: string): string | undefined {
  const clean = val.trim();
  if (!clean) return undefined;

  // 1. Matches YYYY-MM-DD or YYYY-MM
  const ymdMatch = clean.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2];
    return `${year}-${month}-01`;
  }

  // 2. Matches MM/YYYY or M/YYYY or MM/YY or M/YY
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    let year = slashMatch[2];
    if (year.length === 2) {
      year = `20${year}`; // assume 21st century
    }
    return `${year}-${month}-01`;
  }

  // 3. Matches just YYYY
  if (/^\d{4}$/.test(clean)) {
    return `${clean}-01-01`;
  }

  // 4. Matches Month Name Year, e.g. "May 2026" or "May, 2026" or "May 26"
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];
  const shortMonthNames = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];

  const lower = clean.toLowerCase();
  for (let i = 0; i < 12; i++) {
    const mName = monthNames[i];
    const mShort = shortMonthNames[i];

    // Check if month name exists in string
    if (lower.includes(mName) || lower.includes(mShort)) {
      // Find a 2 or 4 digit year in the string
      const yearMatch = clean.match(/\b(\d{2}|\d{4})\b/);
      if (yearMatch) {
        let year = yearMatch[1];
        if (year.length === 2) {
          year = `20${year}`;
        }
        const monthNum = String(i + 1).padStart(2, '0');
        return `${year}-${monthNum}-01`;
      }
    }
  }

  // 5. Try standard Date parsing fallback
  const parsedDate = new Date(clean);
  if (!isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  return undefined;
}

export function suggestMusicFieldMapping(headers: string[]): MusicFieldMapping {
  const mapping: MusicFieldMapping = {
    title: -1,
    composer: -1,
    arranger: -1,
    copies: -1,
    catalogId: -1,
    duration: -1,
    notes: -1,
    purchaseDate: -1,
  };

  const titleKeywords = ['title', 'piece', 'song', 'name'];
  const composerKeywords = ['composer', 'writer', 'by'];
  const arrangerKeywords = ['arranger', 'arr.'];
  const copiesKeywords = ['copies', 'qty', 'quantity', 'count', 'cop'];
  const catalogKeywords = ['catalog', 'id', 'cat', 'number'];
  const durationKeywords = ['duration', 'length', 'time'];
  const notesKeywords = ['notes', 'comments', 'comment', 'description'];
  const purchaseKeywords = ['purchase', 'bought', 'acquired', 'pur'];

  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase();

    const matches = (keywords: string[]) =>
      keywords.some((k) => clean.includes(k) || k.includes(clean));

    if (mapping.title === -1 && matches(titleKeywords)) {
      mapping.title = index;
    } else if (mapping.arranger === -1 && matches(arrangerKeywords)) {
      mapping.arranger = index;
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
    } else if (mapping.purchaseDate === -1 && matches(purchaseKeywords)) {
      mapping.purchaseDate = index;
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
    let composer = getValue('composer');
    let arranger = getValue('arranger') || undefined;
    const rawCopies = getValue('copies');
    const catalogId = getValue('catalogId');
    const duration = getValue('duration') || undefined;
    const notes = getValue('notes');
    const rawPurchaseDate = getValue('purchaseDate');

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Title validation
    if (!title) {
      errors.push('Title is required.');
    }

    // 2. Intelligent composer/arranger split if arranger column isn't mapped
    if (composer && (mapping.arranger === -1 || !arranger)) {
      const parsed = parseComposerArranger(composer);
      if (parsed.arranger) {
        composer = parsed.composer;
        arranger = parsed.arranger;
      }
    }

    // 3. Copies validation
    let copies: number | undefined = undefined;
    if (rawCopies) {
      const parsed = parseInt(rawCopies, 10);
      if (isNaN(parsed)) {
        warnings.push(`Unrecognized copies count "${rawCopies}", leaving blank.`);
      } else {
        copies = parsed;
      }
    }

    // 4. Purchase Date validation
    let purchaseDate: string | undefined = undefined;
    if (rawPurchaseDate) {
      const parsed = parsePurchaseDate(rawPurchaseDate);
      if (!parsed) {
        warnings.push(`Unrecognized purchase date format "${rawPurchaseDate}", leaving blank.`);
      } else {
        purchaseDate = parsed;
      }
    }

    const isValid = errors.length === 0;

    result.push({
      rowNumber,
      data: {
        title,
        composer,
        arranger: arranger || undefined,
        purchaseDate,
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
