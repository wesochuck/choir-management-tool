import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pieceAppliesToSectionBucket,
  getSectionBucketApplicabilityLabel,
  filterPiecesBySectionBucket
} from '../src/lib/music/applicability.ts';
import type { SectionDef } from '../src/services/settingsService.ts';
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

    // Filter by undefined
    assert.strictEqual(filterPiecesBySectionBucket(pieces, undefined as unknown as string).length, 3);

    // Filter by S
    const filteredS = filterPiecesBySectionBucket(pieces, 'S');
    assert.strictEqual(filteredS.length, 2);
    assert.ok(filteredS.find(p => p.id === '1'));
    assert.ok(filteredS.find(p => p.id === '2'));
    assert.ok(!filteredS.find(p => p.id === '3'));
  });
});
