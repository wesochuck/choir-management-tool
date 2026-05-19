import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestMusicFieldMapping, validateAndMapMusicPieces } from '../src/lib/musicImportUtils.ts';

test('suggestMusicFieldMapping matches headers intelligently', () => {
  const headers = ['Song Title', 'Arranger', 'Copies On Hand', 'Cat No', 'Length', 'Admin Notes'];
  const mapping = suggestMusicFieldMapping(headers);

  assert.equal(mapping.title, 0);       // 'Song Title'
  assert.equal(mapping.composer, 1);    // 'Arranger'
  assert.equal(mapping.copies, 2);      // 'Copies On Hand'
  assert.equal(mapping.catalogId, 3);   // 'Cat No'
  assert.equal(mapping.duration, 4);    // 'Length'
  assert.equal(mapping.notes, 5);       // 'Admin Notes'
});

test('suggestMusicFieldMapping returns -1 for unmappable fields', () => {
  const headers = ['Random Column', 'Another Column'];
  const mapping = suggestMusicFieldMapping(headers);

  assert.equal(mapping.title, -1);
  assert.equal(mapping.composer, -1);
  assert.equal(mapping.copies, -1);
  assert.equal(mapping.catalogId, -1);
  assert.equal(mapping.duration, -1);
  assert.equal(mapping.notes, -1);
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
    ]
  };

  const mapping = {
    title: 0,
    composer: 1,
    copies: 2,
    catalogId: 3,
    duration: 4,
    notes: 5
  };

  const mapped = validateAndMapMusicPieces(csvData, mapping);

  assert.equal(mapped.length, 3);

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
});
