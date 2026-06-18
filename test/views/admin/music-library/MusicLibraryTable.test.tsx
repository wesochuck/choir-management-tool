// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { MusicLibraryTable } from '../../../../src/views/admin/music-library/MusicLibraryTable';
import type { MusicPiece } from '../../../../src/types/musicLibrary';
import type { MusicGenreDef } from '../../../../src/services/settingsService';

const makePiece = (overrides: Partial<MusicPiece> = {}): MusicPiece => ({
  id: `piece-${Math.random().toString(36).slice(2, 8)}`,
  created: '2025-01-01T00:00:00Z',
  updated: '2025-01-01T00:00:00Z',
  collectionId: 'test',
  collectionName: 'musicPieces',
  title: 'Test Piece',
  ...overrides,
});

const samplePieces: MusicPiece[] = [
  makePiece({ title: 'Aardvark Anthem', composer: 'Adams', arranger: 'Baker' }),
  makePiece({ title: 'Bear Blues', composer: 'Chen' }),
  makePiece({ title: 'Cat Cantata', arranger: 'Davis' }),
  makePiece({
    title: 'Dragon Dance',
    composer: 'Erikson',
    arranger: 'Frank',
    duration: '4:30',
    audioTrackMapping: { soprano: 'soprano.mp3' },
  }),
  makePiece({ title: 'Eagle Echo', composer: 'Garcia', duration: '3:15' }),
];

const mockGenres: MusicGenreDef[] = [{ id: 'g1', name: 'Classical', color: '#123456', icon: '🎵' }];

function renderTable(props: Partial<React.ComponentProps<typeof MusicLibraryTable>> = {}) {
  const onSortChange = mock.fn();
  const onToggleSelection = mock.fn();
  const onEditPiece = mock.fn();
  const onPlayTrack = mock.fn();
  const onPageChange = mock.fn();

  const result = render(
    <MusicLibraryTable
      pieces={samplePieces}
      filteredPieces={samplePieces}
      genres={mockGenres}
      isLoading={false}
      duplicateIds={new Set()}
      selectedIds={new Set()}
      onToggleSelection={onToggleSelection}
      onEditPiece={onEditPiece}
      onPlayTrack={onPlayTrack}
      catalogLookupTemplate="https://example.com/{catalogId}"
      currentPage={1}
      pageSize={20}
      totalParentCount={samplePieces.length}
      onPageChange={onPageChange}
      sortField="title"
      sortDirection="asc"
      onSortChange={onSortChange}
      {...props}
    />
  );

  return { ...result, onSortChange, onToggleSelection, onEditPiece, onPlayTrack, onPageChange };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MusicLibraryTable sorting', () => {
  it('renders active sort on Title header with aria-sort and title', () => {
    renderTable();

    const titleTh = screen.getByText('Title').closest('th');
    assert.ok(titleTh);

    assert.equal(titleTh.getAttribute('aria-sort'), 'ascending');

    assert.equal(titleTh.getAttribute('title'), 'Click to sort');
  });

  it('clicking Composer/Arranger calls onSortChange with composer asc', () => {
    const { onSortChange } = renderTable();

    const composerTh = screen.getByText('Composer/Arranger').closest('th');
    assert.ok(composerTh);

    act(() => {
      composerTh.click();
    });

    assert.equal(onSortChange.mock.callCount(), 1);
    assert.deepStrictEqual(onSortChange.mock.calls[0].arguments, ['composer', 'asc']);
  });

  it('Link header is not sortable', () => {
    renderTable();

    const linkTh = screen.getByText('Link').closest('th');
    assert.ok(linkTh);

    assert.equal(linkTh.className.includes('cursor-pointer'), false);

    assert.equal(linkTh.getAttribute('aria-sort'), null);

    assert.equal(linkTh.getAttribute('title'), null);
  });

  it('Actions header is not sortable', () => {
    renderTable();

    const actionsTh = screen.getByText('Actions').closest('th');
    assert.ok(actionsTh);

    assert.equal(actionsTh.className.includes('cursor-pointer'), false);

    assert.equal(actionsTh.getAttribute('aria-sort'), null);

    assert.equal(actionsTh.getAttribute('title'), null);
  });
});
