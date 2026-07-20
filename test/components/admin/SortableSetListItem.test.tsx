// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SortableSetListItem } from '../../../src/components/admin/SortableSetListItem';
import type { SetListItem } from '../../../src/services/eventService';
import type { MusicPiece } from '../../../src/types/musicLibrary';

afterEach(() => {
  cleanup();
});

const linkedItem: SetListItem = {
  id: 'set-list-item-1',
  title: 'Four Freedoms',
  pieceId: 'music-piece-1',
  type: 'song',
};

const linkedPiece: MusicPiece = {
  id: 'music-piece-1',
  collectionId: 'music-library',
  collectionName: 'musicLibrary',
  created: '',
  updated: '',
  title: 'Four Freedoms',
  audioTrackMapping: { tutti: 'four-freedoms.mp3' },
};

function renderItem(item: SetListItem = linkedItem) {
  const onEdit = mock.fn();
  const onDelete = mock.fn();
  const onPieceClick = mock.fn();
  const onPlayTrack = mock.fn();

  render(
    <SortableSetListItem
      item={item}
      linkedPiece={item.pieceId ? linkedPiece : undefined}
      onEdit={onEdit}
      onDelete={onDelete}
      onPieceClick={onPieceClick}
      onPlayTrack={onPlayTrack}
    />
  );

  return { onEdit, onDelete, onPieceClick, onPlayTrack };
}

describe('SortableSetListItem', () => {
  it('keeps the title as text and uses a separate Music Library action', () => {
    const { onPieceClick } = renderItem();

    assert.equal(screen.queryByRole('button', { name: 'Four Freedoms' }), null);
    assert.ok(screen.getByText('Four Freedoms'));

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Four Freedoms in the Music Library' })
    );

    assert.strictEqual(onPieceClick.mock.callCount(), 1);
    assert.deepStrictEqual(onPieceClick.mock.calls[0].arguments, ['music-piece-1']);
  });

  it('labels the event-specific editor as Set List Details', () => {
    const { onEdit } = renderItem();

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit set list details for Four Freedoms' })
    );

    assert.strictEqual(onEdit.mock.callCount(), 1);
    assert.deepStrictEqual(onEdit.mock.calls[0].arguments, [linkedItem]);
  });

  it('does not show a library action for an unlinked item', () => {
    renderItem({ ...linkedItem, pieceId: undefined });

    assert.equal(screen.queryByText('Edit Library Piece'), null);
    assert.ok(screen.getByRole('button', { name: 'Edit set list details for Four Freedoms' }));
  });

  it('provides an accessible remove action', () => {
    const { onDelete } = renderItem();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Four Freedoms from the set list' })
    );

    assert.strictEqual(onDelete.mock.callCount(), 1);
    assert.deepStrictEqual(onDelete.mock.calls[0].arguments, ['set-list-item-1']);
  });

  it('provides an accessible play action when audio is available', () => {
    const { onPlayTrack } = renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Play Four Freedoms' }));

    assert.strictEqual(onPlayTrack.mock.callCount(), 1);
    assert.deepStrictEqual(onPlayTrack.mock.calls[0].arguments, [linkedPiece]);
  });
});
