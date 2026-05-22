import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  buildSetListItemFromFormState,
  applySetListItemSave,
  shouldSyncDurationToLibrary
} from '../src/lib/setList/setListForm';

describe('Set List Form Utilities (Phase 2)', () => {
  describe('buildSetListItemFromFormState', () => {
    it('builds a valid song item', () => {
      const state = {
        editingId: '1',
        title: 'Song',
        composer: 'Comp',
        duration: '3:00',
        notes: 'Some notes',
        pieceId: 'p1',
        type: 'song' as const
      };
      const item = buildSetListItemFromFormState(state);
      assert.strictEqual(item.id, '1');
      assert.strictEqual(item.title, 'Song');
      assert.strictEqual(item.composer, 'Comp');
      assert.strictEqual(item.pieceId, 'p1');
      assert.strictEqual(item.notes, 'Some notes');
    });

    it('clears composer and pieceId for intermissions', () => {
      const state = {
        editingId: null,
        title: 'Break',
        composer: 'Should be cleared',
        duration: '15:00',
        notes: '',
        pieceId: 'p1',
        type: 'intermission' as const
      };
      const item = buildSetListItemFromFormState(state);
      assert.ok(item.id);
      assert.strictEqual(item.composer, undefined);
      assert.strictEqual(item.pieceId, undefined);
    });

    it('sets optional blank strings to undefined', () => {
      const state = {
        editingId: '1',
        title: 'Song',
        composer: '  ',
        duration: '',
        notes: '',
        pieceId: '',
        type: 'song' as const
      };
      const item = buildSetListItemFromFormState(state);
      assert.strictEqual(item.composer, undefined);
      assert.strictEqual(item.duration, undefined);
      assert.strictEqual(item.notes, undefined);
      assert.strictEqual(item.pieceId, undefined);
    });
  });

  describe('applySetListItemSave', () => {
    const items = [{ id: '1', title: 'Existing', type: 'song' as const }];

    it('appends new item when editingId is null', () => {
      const newItem = { id: '2', title: 'New', type: 'song' as const };
      const result = applySetListItemSave(items, newItem, null);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[1].id, '2');
    });

    it('replaces existing item by id when editingId matches', () => {
      const updatedItem = { id: '1', title: 'Updated', type: 'song' as const };
      const result = applySetListItemSave(items, updatedItem, '1');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].title, 'Updated');
    });
  });

  describe('shouldSyncDurationToLibrary', () => {
    it('returns true for linked song', () => {
      assert.strictEqual(shouldSyncDurationToLibrary('song', 'p1'), true);
    });

    it('returns false if not a song', () => {
      assert.strictEqual(shouldSyncDurationToLibrary('intermission', 'p1'), false);
    });

    it('returns false if no pieceId', () => {
      assert.strictEqual(shouldSyncDurationToLibrary('song', ''), false);
    });
  });
});
