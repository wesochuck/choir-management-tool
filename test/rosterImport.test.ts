import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, suggestFieldMapping, validateAndMapSingers } from '../src/lib/rosterImportUtils.ts';

test('parseCSV parses standard CSV text with header and rows', () => {
  const csvText = `Name,Email,Voice Part
John Doe,john@example.com,S1
Jane Smith,jane@example.com,A2`;

  const parsed = parseCSV(csvText);

  assert.deepEqual(parsed.headers, ['Name', 'Email', 'Voice Part']);
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(parsed.rows[0], ['John Doe', 'john@example.com', 'S1']);
  assert.deepEqual(parsed.rows[1], ['Jane Smith', 'jane@example.com', 'A2']);
});

test('parseCSV handles double-quoted cells containing commas', () => {
  const csvText = `Name,Email,Notes
"Doe, John",john@example.com,"Needs folder, wants S1"
"Smith, Jane",jane@example.com,Standard Notes`;

  const parsed = parseCSV(csvText);

  assert.deepEqual(parsed.headers, ['Name', 'Email', 'Notes']);
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(parsed.rows[0], ['Doe, John', 'john@example.com', 'Needs folder, wants S1']);
  assert.deepEqual(parsed.rows[1], ['Smith, Jane', 'jane@example.com', 'Standard Notes']);
});

test('suggestFieldMapping matches headers intelligently', () => {
  const headers = ['Singer Name', 'E-mail Address', 'Phone Number', 'Part', 'Global Status', 'Notes & Comments'];
  const mapping = suggestFieldMapping(headers);

  assert.equal(mapping.name, 0);       // 'Singer Name'
  assert.equal(mapping.email, 1);      // 'E-mail Address'
  assert.equal(mapping.phone, 2);      // 'Phone Number'
  assert.equal(mapping.voicePart, 3);  // 'Part'
  assert.equal(mapping.globalStatus, 4); // 'Global Status'
  assert.equal(mapping.notes, 5);      // 'Notes & Comments'
});

test('suggestFieldMapping handles case insensitivity and whitespace', () => {
  const headers = ['   NAME ', 'e-Mail', '  TELEPHONE  ', ' VoicePart ', '  Active  ', ' COMment '];
  const mapping = suggestFieldMapping(headers);

  assert.equal(mapping.name, 0);
  assert.equal(mapping.email, 1);
  assert.equal(mapping.phone, 2);
  assert.equal(mapping.voicePart, 3);
  assert.equal(mapping.globalStatus, 4);
  assert.equal(mapping.notes, 5);
});

test('suggestFieldMapping handles all keyword aliases for each field', () => {
  const headers = ['fullname', 'mail', 'cell', 'section', 'status', 'note'];
  const mapping = suggestFieldMapping(headers);

  assert.equal(mapping.name, 0);
  assert.equal(mapping.email, 1);
  assert.equal(mapping.phone, 2);
  assert.equal(mapping.voicePart, 3);
  assert.equal(mapping.globalStatus, 4);
  assert.equal(mapping.notes, 5);
});

test('suggestFieldMapping respects first-match priority', () => {
  // If there are multiple headers that could match 'name', the first one wins
  const headers = ['singer', 'name', 'fullname'];
  const mapping = suggestFieldMapping(headers);

  assert.equal(mapping.name, 0); // 'singer' gets mapped
  assert.equal(mapping.email, -1);
  assert.equal(mapping.phone, -1);
});

test('suggestFieldMapping handles empty and undefined-like string fields', () => {
  const headers = ['', ' ', '   '];
  const mapping = suggestFieldMapping(headers);

  assert.equal(mapping.name, -1);
  assert.equal(mapping.email, -1);
  assert.equal(mapping.phone, -1);
  assert.equal(mapping.voicePart, -1);
  assert.equal(mapping.globalStatus, -1);
  assert.equal(mapping.notes, -1);
});

test('suggestFieldMapping returns -1 for unmappable fields', () => {
  const headers = ['Random Column', 'Another Column'];
  const mapping = suggestFieldMapping(headers);

  assert.equal(mapping.name, -1);
  assert.equal(mapping.email, -1);
  assert.equal(mapping.phone, -1);
  assert.equal(mapping.voicePart, -1);
  assert.equal(mapping.globalStatus, -1);
  assert.equal(mapping.notes, -1);
});

test('validateAndMapSingers validates name and normalizes voice parts and statuses', () => {
  const csvData = {
    headers: ['Singer', 'E-mail', 'Phone', 'Voice', 'Status', 'Notes'],
    rows: [
      // 1. Valid row with normalizable voice part and status
      ['John Doe', 'john@example.com', '123-456-7890', 'Soprano 1', 'Active', 'New member'],
      // 2. Row with missing name (invalid)
      ['', 'jane@example.com', '', 'A2', 'Idle', ''],
      // 3. Row with unmapped fields and unrecognized voice part (warning)
      ['Bob Smith', 'bob@example.com', '', 'Soloist', 'Inactive', ''],
    ]
  };

  const mapping = {
    name: 0,
    email: 1,
    phone: 2,
    voicePart: 3,
    globalStatus: 4,
    notes: 5
  };

  const mapped = validateAndMapSingers(csvData, mapping);

  assert.equal(mapped.length, 3);

  // Row 1 checks
  assert.equal(mapped[0].rowNumber, 2); // 1-indexed, header is row 1
  assert.equal(mapped[0].data.name, 'John Doe');
  assert.equal(mapped[0].data.email, 'john@example.com');
  assert.equal(mapped[0].data.voicePart, 'S1'); // normalized
  assert.equal(mapped[0].data.globalStatus, 'Active'); // normalized
  assert.equal(mapped[0].isValid, true);
  assert.equal(mapped[0].errors.length, 0);

  // Row 2 checks (missing name)
  assert.equal(mapped[1].rowNumber, 3);
  assert.equal(mapped[1].isValid, false);
  assert.ok(mapped[1].errors.includes('Name is required.'));

  // Row 3 checks (unrecognized voice part)
  assert.equal(mapped[2].rowNumber, 4);
  assert.equal(mapped[2].isValid, true); // Still valid even with warning
  assert.equal(mapped[2].data.voicePart, '');
  assert.ok(mapped[2].warnings.includes('Unrecognized voice part "Soloist", leaving blank.'));
});
