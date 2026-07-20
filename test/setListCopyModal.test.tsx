// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event } from '../src/services/eventService.ts';
import { SetListCopyModal } from '../src/views/admin/setlists/SetListCopyModal.tsx';

afterEach(() => {
  cleanup();
});

const sourceEvent = {
  id: 'source',
  title: 'Source Concert',
  type: 'Performance',
  date: '2026-01-01T19:00:00Z',
} as Event;
const targetEvent = {
  id: 'target',
  title: 'Target Concert',
  type: 'Performance',
  date: '2026-02-01T19:00:00Z',
} as Event;

describe('SetListCopyModal', () => {
  it('includes performer credits by default', async () => {
    const onCopy = mock.fn(async () => {});
    render(
      <SetListCopyModal
        sourceEvent={sourceEvent}
        targetEvent={targetEvent}
        onClose={() => {}}
        onCopy={onCopy}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copy and Replace' }));
    assert.deepEqual(onCopy.mock.calls[0].arguments, ['source', 'include']);
  });

  it('allows credits to be reset to TBA', async () => {
    const onCopy = mock.fn(async () => {});
    render(
      <SetListCopyModal
        sourceEvent={sourceEvent}
        targetEvent={targetEvent}
        onClose={() => {}}
        onCopy={onCopy}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Reset to Performers TBA/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy and Replace' }));
    assert.deepEqual(onCopy.mock.calls[0].arguments, ['source', 'reset']);
  });
});
