import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  createSetListItemFromCustomInput,
  createSetListItemFromMusicPiece,
  updateSetListItem,
  resolveSetListDisplayRows,
  calculateSetListDurationTotals,
  getDefaultPlayableTrackKey
} from '../src/lib/setList/setListItems';
import { createMusicPieceFixture } from './helpers';

describe('Set List Utilities (Phase 1)', () => {
  describe('createSetListItemFromCustomInput', () => {
    it('creates unlinked song item from custom input', () => {
      const input = { title: 'My Custom Song', composer: 'Me', duration: '3:00', type: 'song' as const };
      const item = createSetListItemFromCustomInput(input);
      
      assert.strictEqual(item.title, 'My Custom Song');
      assert.strictEqual(item.composer, 'Me');
      assert.strictEqual(item.duration, '3:00');
      assert.strictEqual(item.type, 'song');
      assert.ok(item.id);
      assert.ok(!item.pieceId);
    });

    it('creates unlinked intermission item', () => {
      const input = { title: 'Break', duration: '15:00', type: 'intermission' as const };
      const item = createSetListItemFromCustomInput(input);
      
      assert.strictEqual(item.title, 'Break');
      assert.strictEqual(item.duration, '15:00');
      assert.strictEqual(item.type, 'intermission');
      assert.ok(!item.composer);
    });

    it('rejects empty title', () => {
      assert.throws(() => createSetListItemFromCustomInput({ title: '', type: 'song' }));
      assert.throws(() => createSetListItemFromCustomInput({ title: '  ', type: 'song' }));
    });

    it('rejects invalid duration', () => {
      assert.throws(() => createSetListItemFromCustomInput({ title: 'Song', duration: 'invalid', type: 'song' }));
    });
  });

  describe('createSetListItemFromMusicPiece', () => {
    it('creates linked item from Music Library piece', () => {
      const piece = createMusicPieceFixture({
        id: 'p1',
        title: 'Hallelujah',
        composer: 'Handel',
        duration: '3:45'
      });
      const item = createSetListItemFromMusicPiece(piece);
      
      assert.strictEqual(item.pieceId, 'p1');
      assert.strictEqual(item.title, 'Hallelujah');
      assert.strictEqual(item.composer, 'Handel');
      assert.strictEqual(item.duration, '3:45');
      assert.strictEqual(item.type, 'song');
    });

    it('allows overriding fields when linking', () => {
      const piece = createMusicPieceFixture({
        id: 'p1',
        title: 'Hallelujah',
        composer: 'Handel',
        duration: '3:45'
      });
      const item = createSetListItemFromMusicPiece(piece, { title: 'Hallelujah Chorus' });
      
      assert.strictEqual(item.title, 'Hallelujah Chorus');
      assert.strictEqual(item.pieceId, 'p1');
    });
  });

  describe('updateSetListItem', () => {
    it('applies patches to existing item', () => {
      const item = { id: '1', title: 'Old Title', type: 'song' as const };
      const updated = updateSetListItem(item, { title: 'New Title' });
      assert.strictEqual(updated.title, 'New Title');
      assert.strictEqual(updated.id, '1');
    });
  });

  describe('resolveSetListDisplayRows', () => {
    const library = [
      createMusicPieceFixture({ id: 'p1', title: 'Lib Title', composer: 'Lib Composer', duration: '4:00' })
    ];

    it('prefers item field over library field for linked pieces', () => {
      const items = [
        { id: '1', pieceId: 'p1', title: 'Override Title', type: 'song' as const }
      ];
      const rows = resolveSetListDisplayRows(items, library);
      
      assert.strictEqual(rows[0].displayTitle, 'Override Title');
      assert.strictEqual(rows[0].displayComposer, 'Lib Composer');
      assert.strictEqual(rows[0].displayDuration, '4:00');
    });

    it('handles unlinked custom items', () => {
      const items = [
        { id: '1', title: 'Custom Title', composer: 'Custom Comp', duration: '2:30', type: 'song' as const }
      ];
      const rows = resolveSetListDisplayRows(items, library);
      
      assert.strictEqual(rows[0].displayTitle, 'Custom Title');
      assert.strictEqual(rows[0].displayComposer, 'Custom Comp');
      assert.strictEqual(rows[0].displayDuration, '2:30');
    });

    it('calculates correct cumulative timestamps', () => {
      const items = [
        { id: '1', duration: '3:00', type: 'song' as const },
        { id: '2', duration: '2:00', type: 'song' as const }
      ];
      const rows = resolveSetListDisplayRows(items, []);
      
      assert.strictEqual(rows[0].cumulativeStart, '0:00');
      assert.strictEqual(rows[0].cumulativeEnd, '3:00');
      assert.strictEqual(rows[1].cumulativeStart, '3:00');
      assert.strictEqual(rows[1].cumulativeEnd, '5:00');
    });
  });

  describe('calculateSetListDurationTotals', () => {
    it('splits songs and intermissions correctly', () => {
      const items = [
        { id: '1', duration: '3:00', type: 'song' as const },
        { id: '2', duration: '15:00', type: 'intermission' as const },
        { id: '3', duration: '2:30', type: 'song' as const }
      ];
      const totals = calculateSetListDurationTotals(items, []);
      
      assert.strictEqual(totals.songs, '5:30');
      assert.strictEqual(totals.intermissions, '15:00');
      assert.strictEqual(totals.total, '20:30');
    });
  });

  describe('buildSetListPlainText', () => {
    it('formats a set list as plain text with song numbering', async () => {
      const { buildSetListPlainText } = await import('../src/lib/setList/setListItems');
      const items = [
        {
          id: '1', type: 'song' as const, title: 'Song A', composer: 'Comp A',
          displayTitle: 'Song A', displayComposer: 'Comp A', displayDuration: '',
          cumulativeStart: '', cumulativeEnd: '',
        },
        {
          id: '2', type: 'intermission' as const, title: 'Break',
          displayTitle: 'Break', displayComposer: '', displayDuration: '15:00',
          cumulativeStart: '', cumulativeEnd: '',
        },
        {
          id: '3', type: 'song' as const, title: 'Song B', composer: 'Comp B',
          displayTitle: 'Song B', displayComposer: 'Comp B', displayDuration: '',
          cumulativeStart: '', cumulativeEnd: '',
        },
      ];

      const text = buildSetListPlainText('Concert', '2026-12-25T19:00:00.000Z', 'America/New_York', 'Main Hall', items);

      assert.match(text, /Set List: Concert/);
      assert.match(text, /December 25.*2026/);
      assert.match(text, /Main Hall/);
      assert.match(text, /1\. Song A ~ Comp A/);
      assert.match(text, /2\. Song B ~ Comp B/);
      assert.match(text, /Break/);
      assert.ok(text.indexOf('1.') < text.indexOf('Break'));
      assert.ok(text.indexOf('Break') < text.indexOf('2.'));
    });
  });

  describe('getDefaultPlayableTrackKey', () => {
    it('prefers tutti if available', () => {
      const piece = createMusicPieceFixture({
        audioTrackMapping: {
          tutti: 'tutti.mp3',
          soprano: 's.mp3'
        }
      });
      assert.strictEqual(getDefaultPlayableTrackKey(piece), 'tutti');
    });

    it('falls back to first available track if no tutti', () => {
      const piece = createMusicPieceFixture({
        audioTrackMapping: {
          soprano: 's.mp3',
          alto: 'a.mp3'
        }
      });
      assert.strictEqual(getDefaultPlayableTrackKey(piece), 'soprano');
    });

    it('returns null if no tracks', () => {
      const piece = createMusicPieceFixture({ audioTrackMapping: {} });
      assert.strictEqual(getDefaultPlayableTrackKey(piece), null);
    });
  });
});
