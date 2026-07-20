import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SetListItem } from '../src/services/eventService.ts';
import {
  copySetListItems,
  formatFeaturedNumberCredit,
  getFeaturedNumberLabel,
  hasProfileCredit,
  isFeaturedNumber,
  migrateFeaturedNumberItem,
} from '../src/lib/setList/performerCredits.ts';

function item(overrides: Partial<SetListItem> = {}): SetListItem {
  return { id: 'item-1', title: 'Featured Song', type: 'song', ...overrides };
}

describe('featured performer credits', () => {
  it('derives featured state and labels from legacy and current data', () => {
    assert.equal(isFeaturedNumber(item()), false);
    assert.equal(isFeaturedNumber(item({ soloSmallGroup: true })), true);
    assert.equal(isFeaturedNumber(item({ type: 'intermission', isFeaturedNumber: true })), false);
    assert.equal(getFeaturedNumberLabel(item({ isFeaturedNumber: true })), 'Featured Number');
    assert.equal(
      getFeaturedNumberLabel(
        item({
          isFeaturedNumber: true,
          performerCredits: [{ kind: 'guest', displayName: 'Jane' }],
        })
      ),
      'Solo'
    );
    assert.equal(
      getFeaturedNumberLabel(
        item({
          isFeaturedNumber: true,
          performerCredits: [
            { kind: 'guest', displayName: 'Jane' },
            { kind: 'guest', displayName: 'John' },
          ],
        })
      ),
      'Group'
    );
  });

  it('formats TBA, solo, and ordered group credits', () => {
    assert.equal(
      formatFeaturedNumberCredit(item({ isFeaturedNumber: true })),
      'Featured Number — Performers TBA'
    );
    assert.equal(
      formatFeaturedNumberCredit(
        item({
          isFeaturedNumber: true,
          performerCredits: [{ kind: 'profile', profileId: 'p1', displayName: 'Jane Doe' }],
        })
      ),
      'Solo — Jane Doe'
    );
    assert.equal(
      formatFeaturedNumberCredit(
        item({
          isFeaturedNumber: true,
          performerCredits: [
            { kind: 'guest', displayName: 'First Guest' },
            { kind: 'profile', profileId: 'p2', displayName: 'Second Singer' },
          ],
        })
      ),
      'Group — First Guest, Second Singer'
    );
  });

  it('migrates a legacy item while preserving captured names', () => {
    const migrated = migrateFeaturedNumberItem(item({ soloSmallGroup: true }), true, [
      { kind: 'profile', profileId: 'p1', displayName: 'Captured Name' },
    ]);
    assert.equal(migrated.soloSmallGroup, undefined);
    assert.equal(migrated.isFeaturedNumber, true);
    assert.deepEqual(migrated.performerCredits, [
      { kind: 'profile', profileId: 'p1', displayName: 'Captured Name' },
    ]);
    assert.equal(hasProfileCredit(migrated, 'p1'), true);
  });

  it('copies credits or resets them to TBA without mutating the source', () => {
    const source = [
      item({
        isFeaturedNumber: true,
        performerCredits: [{ kind: 'guest', displayName: 'Guest' }],
      }),
    ];
    const included = copySetListItems(source, 'include', () => 'copy-1');
    const reset = copySetListItems(source, 'reset', () => 'copy-2');
    assert.deepEqual(included[0].performerCredits, source[0].performerCredits);
    assert.notEqual(included[0].performerCredits, source[0].performerCredits);
    assert.deepEqual(reset[0].performerCredits, []);
    assert.equal(reset[0].isFeaturedNumber, true);
    assert.equal(source[0].id, 'item-1');
  });
});
