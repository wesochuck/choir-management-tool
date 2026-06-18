// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { SetListInlineCreator } from '../../../src/components/admin/SetListInlineCreator';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function renderCreator(props: Record<string, unknown> = {}) {
  const onAddItem = mock.fn();
  const result = render(<SetListInlineCreator library={[]} onAddItem={onAddItem} {...props} />);
  return { onAddItem };
}

describe('SetListInlineCreator', () => {
  it('renders Song and Intermission buttons', () => {
    renderCreator();
    assert.ok(screen.getByText(/Song/));
    assert.ok(screen.getByText(/Intermission/));
  });

  it('active type Song is visually selected', () => {
    renderCreator();
    const songBtn = screen.getByText(/Song/);
    const intermissionBtn = screen.getByText(/Intermission/);
    assert.ok(songBtn.className.includes('bg-primary text-white'));
    assert.equal(intermissionBtn.className.includes('bg-primary text-white'), false);
  });

  it('no standalone magnifying glass is rendered', () => {
    renderCreator();
    assert.equal(screen.queryByText('🔍'), null);
  });

  it('search input renders with song placeholder by default', () => {
    renderCreator();
    const input = screen.getByPlaceholderText(/Search music library/);
    assert.ok(input);
  });

  it('intermission mode shows intermission placeholder', () => {
    renderCreator();
    const intermissionBtn = screen.getByText(/Intermission/);
    fireEvent.click(intermissionBtn);
    const input = screen.getByPlaceholderText(/Intermission title/);
    assert.ok(input);
  });

  it('renders duration input', () => {
    renderCreator();
    assert.ok(screen.getByPlaceholderText('Duration'));
  });

  it('renders Add button', () => {
    renderCreator();
    const addButton = screen.getByRole('button', { name: '+ Add' });
    assert.ok(addButton);
  });

  it('Add button is disabled when query is empty', () => {
    renderCreator();
    const addButton = screen.getByRole('button', { name: '+ Add' });
    assert.ok(addButton.hasAttribute('disabled'));
  });

  it('renders helper tip in song mode', () => {
    renderCreator();
    assert.ok(screen.getByText(/Tip:/));
  });

  it('hides helper tip in intermission mode', () => {
    renderCreator();
    fireEvent.click(screen.getByText(/Intermission/));
    assert.equal(screen.queryByText(/Tip:/), null);
  });

  it('no dashed border outline on the container', () => {
    renderCreator();
    const container = document.querySelector('.rounded-xl');
    assert.ok(container);
    assert.ok(container.className.includes('bg-slate-50'));
    const allDashed = document.querySelectorAll('.border-dashed');
    assert.equal(allDashed.length, 0);
  });
});
