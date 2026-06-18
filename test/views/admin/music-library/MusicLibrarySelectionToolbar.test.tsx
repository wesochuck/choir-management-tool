// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import { MusicLibrarySelectionToolbar } from '../../../../src/views/admin/music-library/MusicLibrarySelectionToolbar';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function renderToolbar(props: Record<string, unknown> = {}) {
  const onAddToSetList = mock.fn();
  const onDeleteSelected = mock.fn();
  const result = render(
    <MusicLibrarySelectionToolbar
      selectedCount={3}
      isBulkDeleting={false}
      onAddToSetList={onAddToSetList}
      onDeleteSelected={onDeleteSelected}
      {...props}
    />
  );
  return { onAddToSetList, onDeleteSelected };
}

describe('MusicLibrarySelectionToolbar', () => {
  it('renders nothing when selectedCount is 0', () => {
    renderToolbar({ selectedCount: 0 });
    assert.equal(screen.queryByText(/selected/), null);
    assert.equal(screen.queryByRole('button'), null);
  });

  it('renders singular copy for 1 selected title', () => {
    renderToolbar({ selectedCount: 1 });
    assert.ok(screen.getByText('1'));
    assert.ok(screen.getByText('title selected'));
  });

  it('renders plural copy for multiple selected titles', () => {
    renderToolbar({ selectedCount: 5 });
    assert.ok(screen.getByText('5'));
    assert.ok(screen.getByText('titles selected'));
  });

  it('renders Add to Set List and Delete Selected buttons', () => {
    renderToolbar();
    assert.ok(screen.getByRole('button', { name: 'Add to Set List' }));
    assert.ok(screen.getByRole('button', { name: 'Delete Selected' }));
  });

  it('calls onAddToSetList when Add to Set List clicked', () => {
    const { onAddToSetList } = renderToolbar();
    screen.getByRole('button', { name: 'Add to Set List' }).click();
    assert.equal(onAddToSetList.mock.callCount(), 1);
  });

  it('calls onDeleteSelected when Delete Selected clicked', () => {
    const { onDeleteSelected } = renderToolbar();
    screen.getByRole('button', { name: 'Delete Selected' }).click();
    assert.equal(onDeleteSelected.mock.callCount(), 1);
  });

  it('delete button shows Deleting while bulk deleting', () => {
    renderToolbar({ isBulkDeleting: true });
    const btn = screen.getByRole('button', { name: /Deleting/ });
    assert.ok(btn);
    assert.ok(btn.hasAttribute('disabled'));
  });

  it('Add to Set List disables while adding', () => {
    renderToolbar({ isAddingToSetList: true });
    const btn = screen.getByRole('button', { name: 'Add to Set List' });
    assert.ok(btn.hasAttribute('disabled'));
  });

  it('renders clear button when onClearSelection is provided', () => {
    const onClearSelection = mock.fn();
    renderToolbar({ onClearSelection });
    assert.ok(screen.getByText('Clear'));
    screen.getByText('Clear').click();
    assert.equal(onClearSelection.mock.callCount(), 1);
  });

  it('does not render clear button when onClearSelection is not provided', () => {
    renderToolbar();
    assert.equal(screen.queryByText('Clear'), null);
  });
});
