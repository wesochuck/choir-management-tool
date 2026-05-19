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
    globalStatus: 'Active (Current)' | 'Active (Future)' | 'Inactive';
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

export function validateAndMapSingers(csvData: CSVData, mapping: FieldMapping): MappedSinger[] {
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
      if (cleanVP === 's1' || cleanVP === 'soprano1' || cleanVP === 'sopranoi' || cleanVP === 'sop1') {
        voicePart = 'S1';
      } else if (cleanVP === 's2' || cleanVP === 'soprano2' || cleanVP === 'sopranoii' || cleanVP === 'sop2') {
        voicePart = 'S2';
      } else if (cleanVP === 'a1' || cleanVP === 'alto1' || cleanVP === 'altoi' || cleanVP === 'alt1') {
        voicePart = 'A1';
      } else if (cleanVP === 'a2' || cleanVP === 'alto2' || cleanVP === 'altoii' || cleanVP === 'alt2') {
        voicePart = 'A2';
      } else if (cleanVP === 't1' || cleanVP === 'tenor1' || cleanVP === 'tenori' || cleanVP === 'ten1') {
        voicePart = 'T1';
      } else if (cleanVP === 't2' || cleanVP === 'tenor2' || cleanVP === 'tenorii' || cleanVP === 'ten2') {
        voicePart = 'T2';
      } else if (cleanVP === 'b1' || cleanVP === 'bass1' || cleanVP === 'bassi' || cleanVP === 'bas1') {
        voicePart = 'B1';
      } else if (cleanVP === 'b2' || cleanVP === 'bass2' || cleanVP === 'bassii' || cleanVP === 'bas2') {
        voicePart = 'B2';
      } else {
        warnings.push(`Unrecognized voice part "${rawVoicePart}", leaving blank.`);
      }
    }

    // 4. Status normalization
    let globalStatus: MappedSinger['data']['globalStatus'] = 'Active (Current)';
    if (rawStatus) {
      const cleanStatus = rawStatus.toLowerCase().replace(/\s+/g, '');
      if (cleanStatus.includes('future')) {
        globalStatus = 'Active (Future)';
      } else if (cleanStatus.includes('inactive')) {
        globalStatus = 'Inactive';
      } else if (cleanStatus.includes('current') || cleanStatus === 'active') {
        globalStatus = 'Active (Current)';
      } else {
        warnings.push(`Unrecognized status "${rawStatus}", defaulting to "Active (Current)".`);
        globalStatus = 'Active (Current)';
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

