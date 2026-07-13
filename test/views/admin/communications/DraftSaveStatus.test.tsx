// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, render, screen } from '@testing-library/react';
import { DraftSaveStatus } from '../../../../src/views/admin/communications/DraftSaveStatus';

afterEach(() => {
  cleanup();
});

describe('DraftSaveStatus', () => {
  it('renders saving state', () => {
    render(
      <DraftSaveStatus
        status="saving"
        error={null}
        onSaveNow={mock.fn(async () => {})}
        onRetry={mock.fn(async () => {})}
        onReloadLatest={mock.fn()}
        onSaveAsCopy={mock.fn(async () => {})}
      />
    );
    assert.ok(screen.getByText('Saving…'));
  });

  it('renders saved state', () => {
    render(
      <DraftSaveStatus
        status="saved"
        error={null}
        onSaveNow={mock.fn(async () => {})}
        onRetry={mock.fn(async () => {})}
        onReloadLatest={mock.fn()}
        onSaveAsCopy={mock.fn(async () => {})}
      />
    );
    assert.ok(screen.getByText('Saved just now'));
  });

  it('renders dirty state with save now button', () => {
    render(
      <DraftSaveStatus
        status="dirty"
        error={null}
        onSaveNow={mock.fn(async () => {})}
        onRetry={mock.fn(async () => {})}
        onReloadLatest={mock.fn()}
        onSaveAsCopy={mock.fn(async () => {})}
      />
    );
    assert.ok(screen.getByRole('button', { name: 'Save now' }));
  });

  it('renders error state with formatted message and retry button', () => {
    const rawError = new Error('Network unavailable');
    render(
      <DraftSaveStatus
        status="error"
        error={rawError}
        onSaveNow={mock.fn(async () => {})}
        onRetry={mock.fn(async () => {})}
        onReloadLatest={mock.fn()}
        onSaveAsCopy={mock.fn(async () => {})}
      />
    );
    assert.ok(screen.getByText(/Network unavailable/));
    assert.ok(screen.getByRole('button', { name: 'Retry saving draft' }));
  });

  it('renders conflict state with reload and save as copy buttons', () => {
    render(
      <DraftSaveStatus
        status="conflict"
        error={null}
        onSaveNow={mock.fn(async () => {})}
        onRetry={mock.fn(async () => {})}
        onReloadLatest={mock.fn()}
        onSaveAsCopy={mock.fn(async () => {})}
      />
    );
    assert.ok(screen.getByRole('button', { name: 'Reload latest draft' }));
    assert.ok(screen.getByRole('button', { name: 'Save local changes as a copy' }));
  });
});
