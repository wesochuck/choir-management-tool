export interface CSVData {
  headers: string[];
  rows: string[][];
}

export type RosterField = 'name' | 'email' | 'phone' | 'voicePart' | 'globalStatus' | 'notes';
export type FieldMapping = Record<RosterField, number>;

export interface MappedSinger {
  rowNumber: number;
  data: {
    name: string;
    email: string;
    phone: string;
    voicePart: string;
    globalStatus: 'Active' | 'Idle' | 'Inactive';
    notes: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function parseCSV(text: string): CSVData {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => parseLine(line));

  return { headers, rows };
}
export function suggestFieldMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {
    name: -1,
    email: -1,
    phone: -1,
    voicePart: -1,
    globalStatus: -1,
    notes: -1,
  };

  const nameKeywords = ['name', 'singer', 'fullname'];
  const emailKeywords = ['email', 'e-mail', 'mail'];
  const phoneKeywords = ['phone', 'cell', 'telephone', 'mobile'];
  const voiceKeywords = ['voice part', 'voice', 'part', 'section', 'voicepart'];
  const statusKeywords = ['status', 'active'];
  const notesKeywords = ['notes', 'note', 'comments', 'comment'];

  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase();
    
    const matches = (keywords: string[]) => keywords.some(k => clean.includes(k) || k.includes(clean));

    if (mapping.name === -1 && matches(nameKeywords)) {
      mapping.name = index;
    } else if (mapping.email === -1 && matches(emailKeywords)) {
      mapping.email = index;
    } else if (mapping.phone === -1 && matches(phoneKeywords)) {
      mapping.phone = index;
    } else if (mapping.voicePart === -1 && matches(voiceKeywords)) {
      mapping.voicePart = index;
    } else if (mapping.globalStatus === -1 && matches(statusKeywords)) {
      mapping.globalStatus = index;
    } else if (mapping.notes === -1 && matches(notesKeywords)) {
      mapping.notes = index;
    }
  });

  return mapping;
}

export function validateAndMapSingers(csvData: CSVData, mapping: FieldMapping, validVoiceParts?: string[]): MappedSinger[] {
  const result: MappedSinger[] = [];

  csvData.rows.forEach((row, rowIndex) => {
    // Row number is 1-indexed, header is row 1, so data rows start at row 2
    const rowNumber = rowIndex + 2;

    const getValue = (field: RosterField): string => {
      const idx = mapping[field];
      if (idx === -1 || idx >= row.length) return '';
      return row[idx].trim();
    };

    const name = getValue('name');
    const email = getValue('email');
    const phone = getValue('phone');
    const rawVoicePart = getValue('voicePart');
    const rawStatus = getValue('globalStatus');
    const notes = getValue('notes');

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Name validation
    if (!name) {
      errors.push('Name is required.');
    }

    // 2. Email validation (if provided)
    if (email && !email.includes('@')) {
      errors.push(`Invalid email format: "${email}".`);
    }

    // 3. Voice Part normalization
    let voicePart: MappedSinger['data']['voicePart'] = '';
    if (rawVoicePart) {
      const cleanVP = rawVoicePart.toLowerCase().replace(/\s+/g, '');
      
      // If valid parts are provided, try an exact match first
      if (validVoiceParts && validVoiceParts.length > 0) {
        const match = validVoiceParts.find(p => p.toLowerCase() === cleanVP);
        if (match) {
          voicePart = match;
        }
      }

      // If no match found yet, try common abbreviations/long names
      if (!voicePart) {
        if (/^(s1|soprano1|sopranoi|sop1)$/i.test(cleanVP)) {
          voicePart = 'S1';
        } else if (/^(s2|soprano2|sopranoii|sop2)$/i.test(cleanVP)) {
          voicePart = 'S2';
        } else if (/^(a1|alto1|altoi|alt1)$/i.test(cleanVP)) {
          voicePart = 'A1';
        } else if (/^(a2|alto2|altoii|alt2)$/i.test(cleanVP)) {
          voicePart = 'A2';
        } else if (/^(t1|tenor1|tenori|ten1)$/i.test(cleanVP)) {
          voicePart = 'T1';
        } else if (/^(t2|tenor2|tenorii|ten2)$/i.test(cleanVP)) {
          voicePart = 'T2';
        } else if (/^(b1|bass1|bassi|bas1)$/i.test(cleanVP)) {
          voicePart = 'B1';
        } else if (/^(b2|bass2|bassii|bas2)$/i.test(cleanVP)) {
          voicePart = 'B2';
        }
      }

      // If we STILL don't have a match, and we have valid parts, just use the raw value if it exists in parts (case insensitive)
      if (!voicePart && validVoiceParts && validVoiceParts.length > 0) {
        const match = validVoiceParts.find(p => p.toLowerCase().includes(cleanVP) || cleanVP.includes(p.toLowerCase()));
        if (match) {
          voicePart = match;
        }
      }

      if (!voicePart) {
        warnings.push(`Unrecognized voice part "${rawVoicePart}", leaving blank.`);
      }
    }

    let globalStatus: MappedSinger['data']['globalStatus'] = 'Active';
    if (rawStatus) {
      const cleanStatus = rawStatus.toLowerCase().replace(/\s+/g, '');
      if (cleanStatus.includes('future') || cleanStatus.includes('idle')) {
        globalStatus = 'Idle';
      } else if (cleanStatus.includes('inactive')) {
        globalStatus = 'Inactive';
      } else if (cleanStatus.includes('current') || cleanStatus === 'active') {
        globalStatus = 'Active';
      } else {
        warnings.push(`Unrecognized status "${rawStatus}", defaulting to "Active".`);
        globalStatus = 'Active';
      }
    }

    const isValid = errors.length === 0;

    result.push({
      rowNumber,
      data: {
        name,
        email,
        phone,
        voicePart,
        globalStatus,
        notes,
      },
      isValid,
      errors,
      warnings,
    });
  });

  return result;
}

