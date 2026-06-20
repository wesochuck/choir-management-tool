// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { AddToSetListModal } from '../../../../src/views/admin/music-library/AddToSetListModal';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const mockPieces = [
  {
    id: 'p1',
    title: 'Ave Maria',
    composer: 'Gounod',
  },
  {
    id: 'p2',
    title: 'Hallelujah',
    composer: 'Handel',
  },
];

const mockPerformances = [
  {
    id: 'e1',
    title: 'Spring Concert',
    date: '2026-06-01T00:00:00Z',
    type: 'Performance' as const,
  },
  {
    id: 'e2',
    title: 'Holiday Show',
    date: '2026-12-15T00:00:00Z',
    type: 'Performance' as const,
  },
];

function renderModal(props: Record<string, unknown> = {}) {
  const onClose = mock.fn();
  const onConfirm = mock.fn();
  const result = render(
    <AddToSetListModal
      isOpen={true}
      selectedPieces={mockPieces}
      performances={mockPerformances}
      isSaving={false}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onClose, onConfirm };
}

describe('AddToSetListModal', () => {
  it('renders selected piece count', () => {
    renderModal();
    assert.ok(screen.getByText(/Selected titles \(2\)/));
  });

  it('renders performance options', () => {
    renderModal();
    assert.ok(screen.getByText(/Spring Concert/));
    assert.ok(screen.getByText(/Holiday Show/));
    const options = screen.getAllByRole('option');
    // default blank + 2 performance options
    assert.equal(options.length, 3);
  });

  it('confirm button is disabled until a performance is selected', () => {
    renderModal();
    const addButton = screen.getByRole('button', { name: /Add to Set List$/ });
    assert.ok(addButton.hasAttribute('disabled'));
  });

  it('confirm button is enabled when a performance is selected', () => {
    renderModal();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'e1' } });
    const addButton = screen.getByRole('button', { name: /Add to Set List$/ });
    assert.equal(addButton.hasAttribute('disabled'), false);
  });

  it('calls onConfirm with selected event id', () => {
    const { onConfirm } = renderModal();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'e1' } });
    fireEvent.click(screen.getByRole('button', { name: /Add to Set List$/ }));
    assert.equal(onConfirm.mock.callCount(), 1);
    assert.equal(onConfirm.mock.calls[0].arguments[0], 'e1');
  });

  it('disables confirm button while saving', () => {
    renderModal({ isSaving: true });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'e1' } });
    const addButton = screen.getByRole('button', { name: /Adding/ });
    assert.ok(addButton.hasAttribute('disabled'));
  });

  it('shows empty state when no performances', () => {
    renderModal({ performances: [] });
    assert.ok(screen.getByText(/No performances found/));
  });

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    assert.equal(onClose.mock.callCount(), 1);
  });
});
