import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  exportMusicToCSV, 
  findDuplicates, 
  appendPieceToSetList, 
  resolveCatalogLookupUrl, 
  resolveRecommendedTracks, 
  parseDurationToSeconds, 
  isValidDurationString,
  pieceAppliesToSectionBucket,
  getSectionBucketApplicabilityLabel,
  filterPiecesBySectionBucket
} from '../src/lib/musicPieceUtils.ts';
import type { SectionDef } from '../src/services/settingsService';
import { createMusicPieceFixture, createSectionDefFixture } from './helpers.ts';

describe('section-bucket applicability', () => {
  const sections: SectionDef[] = [
    createSectionDefFixture({ code: 'S', name: 'Sopranos' }),
    createSectionDefFixture({ code: 'A', name: 'Altos' })
  ];

  it('pieceAppliesToSectionBucket handles missing/empty', () => {
    assert.strictEqual(pieceAppliesToSectionBucket(createMusicPieceFixture({ sectionBuckets: undefined }), 'S'), true);
    assert.strictEqual(pieceAppliesToSectionBucket(createMusicPieceFixture({ sectionBuckets: [] }), 'S'), true);
  });

  it('pieceAppliesToSectionBucket handles restrictions', () => {
    assert.strictEqual(pieceAppliesToSectionBucket(createMusicPieceFixture({ sectionBuckets: ['S'] }), 'S'), true);
    assert.strictEqual(pieceAppliesToSectionBucket(createMusicPieceFixture({ sectionBuckets: ['S'] }), 'A'), false);
    assert.strictEqual(pieceAppliesToSectionBucket(createMusicPieceFixture({ sectionBuckets: ['S', 'A'] }), 'S'), true);
    assert.strictEqual(pieceAppliesToSectionBucket(createMusicPieceFixture({ sectionBuckets: ['S', 'A'] }), 'A'), true);
  });

  it('getSectionBucketApplicabilityLabel formats correctly', () => {
    assert.strictEqual(getSectionBucketApplicabilityLabel(createMusicPieceFixture({ sectionBuckets: undefined }), sections), 'All section buckets');
    assert.strictEqual(getSectionBucketApplicabilityLabel(createMusicPieceFixture({ sectionBuckets: ['S'] }), sections), 'Sopranos');
    assert.strictEqual(getSectionBucketApplicabilityLabel(createMusicPieceFixture({ sectionBuckets: ['S', 'A'] }), sections), 'Sopranos, Altos');
    assert.strictEqual(getSectionBucketApplicabilityLabel(createMusicPieceFixture({ sectionBuckets: ['S', 'UNKNOWN'] }), sections), 'Sopranos, UNKNOWN');
  });

  it('filterPiecesBySectionBucket works', () => {
    const pieces = [
      createMusicPieceFixture({ id: '1', title: 'All' }), // unrestricted
      createMusicPieceFixture({ id: '2', title: 'S Only', sectionBuckets: ['S'] }),
      createMusicPieceFixture({ id: '3', title: 'A Only', sectionBuckets: ['A'] })
    ];

    // Filter by empty/All
    assert.strictEqual(filterPiecesBySectionBucket(pieces, '').length, 3);
    
    // Filter by S
    const filteredS = filterPiecesBySectionBucket(pieces, 'S');
    assert.strictEqual(filteredS.length, 2);
    assert.ok(filteredS.find(p => p.id === '1'));
    assert.ok(filteredS.find(p => p.id === '2'));
    assert.ok(!filteredS.find(p => p.id === '3'));
  });
});

test('exportMusicToCSV maps music pieces to CSV format correctly', () => {
  const pieces = [
    createMusicPieceFixture({ id: '1', title: 'Hallelujah', composer: 'Handel', voicing: 'SATB', purchaseDate: '2026-05-01' }),
    createMusicPieceFixture({ id: '2', title: 'Restricted', composer: 'Comp', voicing: 'S', sectionBuckets: ['S', 'A'] })
  ];
  const csv = exportMusicToCSV(pieces);
  assert.ok(csv.includes('Title,Composer,Arranger,Copies,Catalog ID,Duration,Voicing,Applies To,Genres,Purchase Date,Notes'));
  assert.ok(csv.includes('"Hallelujah","Handel","","","","","SATB","All","","2026-05-01",""'));
  assert.ok(csv.includes('"Restricted","Comp","","","","","S","S;A","","",""'));
});

test('findDuplicates returns pieces with identical title and composer', () => {
  const pieces = [
    createMusicPieceFixture({ id: '1', title: 'Song A', composer: 'Comp A' }),
    createMusicPieceFixture({ id: '2', title: 'Song B', composer: 'Comp B' }),
    createMusicPieceFixture({ id: '3', title: 'Song A', composer: 'Comp A' })
  ];
  const duplicates = findDuplicates(pieces);
  assert.equal(duplicates.length, 2);
  assert.deepEqual(duplicates.map(p => p.id).sort(), ['1', '3']);
});

test('appendPieceToSetList appends to undefined or empty set list', () => {
  const piece = createMusicPieceFixture({ id: 'p1', title: 'Hallelujah', composer: 'Handel', duration: '3:45' });
  
  // Undefined set list
  const result1 = appendPieceToSetList(undefined, piece);
  assert.equal(result1.updated, true);
  assert.equal(result1.setList.length, 1);
  assert.equal(result1.setList[0].pieceId, 'p1');
  assert.equal(result1.setList[0].title, 'Hallelujah');
  assert.equal(result1.setList[0].composer, 'Handel');
  assert.equal(result1.setList[0].duration, '3:45');
  assert.ok(result1.setList[0].id);

  // Empty set list
  const result2 = appendPieceToSetList([], piece);
  assert.equal(result2.updated, true);
  assert.equal(result2.setList.length, 1);
  assert.equal(result2.setList[0].pieceId, 'p1');
});

test('appendPieceToSetList appends to the end of a non-empty set list', () => {
  const existingSetList = [
    { id: 'item1', title: 'Ode to Joy', composer: 'Beethoven', duration: '5:00', type: 'song' as const }
  ];
  const piece = createMusicPieceFixture({ id: 'p2', title: 'Messiah', composer: 'Handel', duration: '4:20' });

  const result = appendPieceToSetList(existingSetList, piece);
  assert.equal(result.updated, true);
  assert.equal(result.setList.length, 2);
  assert.equal(result.setList[0].id, 'item1');
  assert.equal(result.setList[1].pieceId, 'p2');
  assert.equal(result.setList[1].title, 'Messiah');
});

test('appendPieceToSetList returns updated: false and original/copied set list if pieceId already exists', () => {
  const existingSetList = [
    { id: 'item1', pieceId: 'p1', title: 'Hallelujah', composer: 'Handel', duration: '3:45', type: 'song' as const }
  ];
  const piece = createMusicPieceFixture({ id: 'p1', title: 'Hallelujah (Updated)', composer: 'Handel', duration: '3:45' });

  const result = appendPieceToSetList(existingSetList, piece);
  assert.equal(result.updated, false);
  assert.equal(result.setList.length, 1);
  assert.equal(result.setList[0].id, 'item1');
});

test('resolveCatalogLookupUrl replaces placeholder and handles URI encoding', () => {
  const template = 'https://www.jwpepper.com/s?q={catalogId}&sort=score_desc';
  
  // Basic replacement
  const url1 = resolveCatalogLookupUrl(template, '100456');
  assert.equal(url1, 'https://www.jwpepper.com/s?q=100456&sort=score_desc');

  // Encoding special chars
  const url2 = resolveCatalogLookupUrl(template, 'JW-999 / AB');
  assert.equal(url2, 'https://www.jwpepper.com/s?q=JW-999%20%2F%20AB&sort=score_desc');
});

test('resolveCatalogLookupUrl returns null if inputs are empty or missing', () => {
  const template = 'https://www.jwpepper.com/s?q={catalogId}';
  
  assert.equal(resolveCatalogLookupUrl(undefined, '123'), null);
  assert.equal(resolveCatalogLookupUrl(template, undefined), null);
  assert.equal(resolveCatalogLookupUrl('', '123'), null);
  assert.equal(resolveCatalogLookupUrl(template, '   '), null);
});

test('resolveRecommendedTracks resolves exact, prefix, fallback and Tutti tracks correctly', () => {
  // Empty mapping handles safely
  assert.deepEqual(resolveRecommendedTracks('S1', undefined), []);
  assert.deepEqual(resolveRecommendedTracks('S1', {}), []);

  const mapping = {
    tutti: 'tutti.mp3',
    S: 'soprano.mp3',
    S1: 'soprano1.mp3',
    A1: 'alto1.mp3',
    B: 'bass.mp3'
  };

  // 1. Direct exact match
  assert.deepEqual(resolveRecommendedTracks('S1', mapping), ['S1', 'tutti']);
  assert.deepEqual(resolveRecommendedTracks('A1', mapping), ['A1', 'tutti']);

  // 2. Broad section prefix match (e.g. S2 -> matches base S and S1 via same-bucket fallback)
  assert.deepEqual(resolveRecommendedTracks('S2', mapping), ['S', 'S1', 'tutti']);

  // 3. Subpart fallback: e.g. B2 has no exact or general B, falls back to S1 or other non-tutti starting with base (if present)
  // Wait, let's test B2. It should match base "B", which is present in mapping.
  assert.deepEqual(resolveRecommendedTracks('B2', mapping), ['B', 'tutti']);

  // If base prefix is S (e.g. S3) and mapping has no S but has S1
  const s3Mapping = {
    tutti: 'tutti.mp3',
    S1: 'soprano1.mp3'
  };
  assert.deepEqual(resolveRecommendedTracks('S3', s3Mapping), ['S1', 'tutti']);

  // If no prefix matches at all, only Tutti is returned
  assert.deepEqual(resolveRecommendedTracks('Tenor', mapping), ['tutti']);
  assert.deepEqual(resolveRecommendedTracks(undefined, mapping), ['tutti']);

  // 4. Same-bucket fallback using custom voice parts configuration
  const customVoiceParts = [
    { label: 'HighSop', fullName: 'High Soprano', sectionCode: 'HighSopSection' },
    { label: 'LowSop', fullName: 'Low Soprano', sectionCode: 'HighSopSection' }
  ];
  const customMapping = {
    tutti: 'tutti.mp3',
    HighSop: 'high_sop.mp3'
  };
  assert.deepEqual(resolveRecommendedTracks('LowSop', customMapping, customVoiceParts), ['HighSop', 'tutti']);
});

test('duration parsing accepts supported formats and rejects polluted text', () => {
  assert.equal(isValidDurationString('3:45'), true);
  assert.equal(isValidDurationString('1:02:03'), true);
  assert.equal(isValidDurationString('15'), true);
  assert.equal(isValidDurationString('15m'), true);
  assert.equal(isValidDurationString('1h 5m 9s'), true);

  assert.equal(parseDurationToSeconds('3:45'), 225);
  assert.equal(parseDurationToSeconds('1:02:03'), 3723);
  assert.equal(parseDurationToSeconds('15'), 900);
  assert.equal(parseDurationToSeconds('15m'), 900);
  assert.equal(parseDurationToSeconds('1h 5m 9s'), 3909);

  assert.equal(isValidDurationString('ljkdsajklf;daz'), false);
  assert.equal(isValidDurationString('3abc'), false);
  assert.equal(isValidDurationString('3:99'), false);
  assert.equal(isValidDurationString('duration 3:45'), false);
  assert.equal(parseDurationToSeconds('ljkdsajklf;daz'), 0);
  assert.equal(parseDurationToSeconds('3abc'), 0);
});

