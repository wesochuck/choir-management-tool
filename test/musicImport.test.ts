import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestMusicFieldMapping, validateAndMapMusicPieces } from '../src/lib/musicImportUtils.ts';

test('suggestMusicFieldMapping matches headers intelligently', () => {
  const headers = ['Song Title', 'Composer', 'Arranger', 'Copies On Hand', 'Cat No', 'Length', 'Admin Notes', 'Date Acquired'];
  const mapping = suggestMusicFieldMapping(headers);

  assert.equal(mapping.title, 0);       // 'Song Title'
  assert.equal(mapping.composer, 1);    // 'Composer'
  assert.equal(mapping.arranger, 2);    // 'Arranger'
  assert.equal(mapping.copies, 3);      // 'Copies On Hand'
  assert.equal(mapping.catalogId, 4);   // 'Cat No'
  assert.equal(mapping.duration, 5);    // 'Length'
  assert.equal(mapping.notes, 6);       // 'Admin Notes'
  assert.equal(mapping.purchaseDate, 7); // 'Date Acquired'
});

test('suggestMusicFieldMapping returns -1 for unmappable fields', () => {
  const headers = ['Random Column', 'Another Column'];
  const mapping = suggestMusicFieldMapping(headers);

  assert.equal(mapping.title, -1);
  assert.equal(mapping.composer, -1);
  assert.equal(mapping.arranger, -1);
  assert.equal(mapping.copies, -1);
  assert.equal(mapping.catalogId, -1);
  assert.equal(mapping.duration, -1);
  assert.equal(mapping.notes, -1);
  assert.equal(mapping.purchaseDate, -1);
});

test('validateAndMapMusicPieces validates title and parses copies', () => {
  const csvData = {
    headers: ['Title', 'Composer', 'Copies', 'Catalog', 'Duration', 'Notes'],
    rows: [
      // 1. Valid row
      ['Hallelujah Chorus', 'G.F. Handel', '45', 'H-101', '4:30', 'Messiah'],
      // 2. Row with missing title (invalid)
      ['', 'Unknown', '10', '', '', ''],
      // 3. Row with invalid copies number (warning)
      ['Amazing Grace', 'Traditional', 'forty', 'A-202', '3:15', 'Standard arranger'],
      // 4. Combined composer/arranger row that should be auto-split
      ['Spring', 'Antonio Vivaldi, arr. Richard Shaw', '20', 'V-200', '3:00', 'Four Seasons']
    ]
  };

  const mapping = {
    title: 0,
    composer: 1,
    arranger: -1,
    copies: 2,
    catalogId: 3,
    duration: 4,
    notes: 5,
    purchaseDate: -1
  };

  const mapped = validateAndMapMusicPieces(csvData, mapping);

  assert.equal(mapped.length, 4);

  // Row 1 checks
  assert.equal(mapped[0].rowNumber, 2); // 1-indexed, header is row 1
  assert.equal(mapped[0].data.title, 'Hallelujah Chorus');
  assert.equal(mapped[0].data.composer, 'G.F. Handel');
  assert.equal(mapped[0].data.copies, 45);
  assert.equal(mapped[0].data.catalogId, 'H-101');
  assert.equal(mapped[0].data.duration, '4:30');
  assert.equal(mapped[0].data.notes, 'Messiah');
  assert.equal(mapped[0].isValid, true);
  assert.equal(mapped[0].errors.length, 0);

  // Row 2 checks (missing title)
  assert.equal(mapped[1].rowNumber, 3);
  assert.equal(mapped[1].isValid, false);
  assert.ok(mapped[1].errors.includes('Title is required.'));

  // Row 3 checks (invalid copies)
  assert.equal(mapped[2].rowNumber, 4);
  assert.equal(mapped[2].isValid, true); // Still valid even with warning
  assert.equal(mapped[2].data.copies, undefined);
  assert.ok(mapped[2].warnings.includes('Unrecognized copies count "forty", leaving blank.'));

  // Row 4 checks (auto-splitting combined composer/arranger)
  assert.equal(mapped[3].rowNumber, 5);
  assert.equal(mapped[3].data.title, 'Spring');
  assert.equal(mapped[3].data.composer, 'Antonio Vivaldi');
  assert.equal(mapped[3].data.arranger, 'Richard Shaw');
  assert.equal(mapped[3].isValid, true);
});

test('validateAndMapMusicPieces keeps separate composer and arranger if both columns mapped', () => {
  const csvData = {
    headers: ['Title', 'ComposerCol', 'ArrangerCol', 'Copies'],
    rows: [
      ['Title A', 'Comp A', 'Arr A', '20']
    ]
  };

  const mapping = {
    title: 0,
    composer: 1,
    arranger: 2,
    copies: 3,
    catalogId: -1,
    duration: -1,
    notes: -1,
    purchaseDate: -1
  };

  const mapped = validateAndMapMusicPieces(csvData, mapping);
  assert.equal(mapped[0].data.composer, 'Comp A');
  assert.equal(mapped[0].data.arranger, 'Arr A');
});

test('validateAndMapMusicPieces parses and validates purchaseDate formats correctly', () => {
  const csvData = {
    headers: ['Title', 'Acquired'],
    rows: [
      ['Date YYYY-MM-DD', '2026-05-15'],
      ['Date YYYY-MM', '2026-06'],
      ['Date MM/YYYY', '12/2025'],
      ['Date MM/YY', '03/24'],
      ['Date YYYY', '2023'],
      ['Date Month Name Year', 'May 2026'],
      ['Date Invalid', 'invalid-date-string']
    ]
  };

  const mapping = {
    title: 0,
    composer: -1,
    arranger: -1,
    copies: -1,
    catalogId: -1,
    duration: -1,
    notes: -1,
    purchaseDate: 1
  };

  const mapped = validateAndMapMusicPieces(csvData, mapping);

  assert.equal(mapped.length, 7);

  // YYYY-MM-DD -> YYYY-MM-01
  assert.equal(mapped[0].data.purchaseDate, '2026-05-01');
  assert.equal(mapped[0].isValid, true);
  assert.equal(mapped[0].warnings.length, 0);

  // YYYY-MM -> YYYY-MM-01
  assert.equal(mapped[1].data.purchaseDate, '2026-06-01');
  assert.equal(mapped[1].isValid, true);

  // MM/YYYY -> YYYY-MM-01
  assert.equal(mapped[2].data.purchaseDate, '2025-12-01');
  assert.equal(mapped[2].isValid, true);

  // MM/YY -> YYYY-MM-01 (assume 21st century)
  assert.equal(mapped[3].data.purchaseDate, '2024-03-01');
  assert.equal(mapped[3].isValid, true);

  // YYYY -> YYYY-01-01
  assert.equal(mapped[4].data.purchaseDate, '2023-01-01');
  assert.equal(mapped[4].isValid, true);

  // Month Name Year -> YYYY-MM-01
  assert.equal(mapped[5].data.purchaseDate, '2026-05-01');
  assert.equal(mapped[5].isValid, true);

  // Invalid Date
  assert.equal(mapped[6].data.purchaseDate, undefined);
  assert.equal(mapped[6].isValid, true); // Still valid but with warning
  assert.ok(mapped[6].warnings[0].includes('Unrecognized purchase date format "invalid-date-string"'));
});

