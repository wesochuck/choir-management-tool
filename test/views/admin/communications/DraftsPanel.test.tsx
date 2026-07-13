// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DraftsPanel } from '../../../../src/views/admin/communications/DraftsPanel';
import type { MessageRecord } from '../../../../src/services/communicationService';

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

const mockDrafts: MessageRecord[] = [
  {
    id: 'draft-1',
    subject: 'Spring concert reminder',
    content:
      'Hello singers, this is a friendly reminder for our spring concert rehearsal on Saturday.',
    type: 'Email',
    recipients: [],
    filters: {},
    status: 'Draft',
    created: new Date().toISOString(),
    updated: new Date(Date.now() - 3600_000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'draft-2',
    subject: 'Emergency delay',
    content: 'Rehearsal is delayed by 30 mins tonight.',
    type: 'SMS',
    recipients: [],
    filters: {},
    status: 'Draft',
    created: new Date().toISOString(),
    updated: new Date(Date.now() - 10000).toISOString(), // Just now
  },
];

describe('DraftsPanel', () => {
  it('renders list of drafts with badges, snippets, and relative times', () => {
    render(
      <DraftsPanel
        drafts={mockDrafts}
        onResumeDraft={mock.fn()}
        onDeleteDraft={mock.fn(async () => {})}
      />
    );

    // Subject checks
    assert.ok(screen.getAllByText('Spring concert reminder').length >= 1);
    assert.ok(screen.getAllByText('Emergency delay').length >= 1);

    // Badges
    assert.ok(screen.getAllByText('Email').length >= 1);
    assert.ok(screen.getAllByText('SMS').length >= 1);

    // Snippets
    assert.ok(screen.getAllByText(/Hello singers, this is a friendly reminder/).length >= 1);
    assert.ok(screen.getAllByText(/Rehearsal is delayed by/).length >= 1);

    // Relative times
    assert.ok(screen.getAllByText(/2h ago/i).length >= 1);
    assert.ok(screen.getAllByText(/Just now/i).length >= 1);
  });

  it('renders empty state with call-to-action button', () => {
    const onStartNew = mock.fn();
    render(
      <DraftsPanel
        drafts={[]}
        onResumeDraft={mock.fn()}
        onDeleteDraft={mock.fn(async () => {})}
        onStartNew={onStartNew}
      />
    );

    assert.ok(screen.getByText('No saved drafts.'));
    const ctaButton = screen.getByRole('button', { name: '+ Create New Draft' });
    assert.ok(ctaButton);

    fireEvent.click(ctaButton);
    assert.strictEqual(onStartNew.mock.callCount(), 1);
  });

  it('triggers callbacks for actions', async () => {
    const onResumeDraft = mock.fn();
    const onDeleteDraft = mock.fn(async () => {});

    render(
      <DraftsPanel
        drafts={mockDrafts}
        onResumeDraft={onResumeDraft}
        onDeleteDraft={onDeleteDraft}
      />
    );

    // Resume click (2 desktop, 2 mobile)
    const resumeButtons = screen.getAllByRole('button', { name: 'Resume' });
    assert.strictEqual(resumeButtons.length, 4);
    fireEvent.click(resumeButtons[0]);
    assert.strictEqual(onResumeDraft.mock.callCount(), 1);
    assert.deepEqual(onResumeDraft.mock.calls[0].arguments, [mockDrafts[0]]);

    // Save as copy click (2 desktop, 2 mobile)
    const copyButtons = screen.getAllByRole('button', { name: 'Save as copy' });
    assert.strictEqual(copyButtons.length, 4);
    fireEvent.click(copyButtons[0]);
    assert.strictEqual(onResumeDraft.mock.callCount(), 2);
    assert.deepEqual(onResumeDraft.mock.calls[1].arguments, [mockDrafts[0], { asCopy: true }]);

    // Delete click (2 desktop, 2 mobile)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    assert.strictEqual(deleteButtons.length, 4);
    await fireEvent.click(deleteButtons[0]);
    assert.strictEqual(onDeleteDraft.mock.callCount(), 1);
    assert.deepEqual(onDeleteDraft.mock.calls[0].arguments, [mockDrafts[0]]);
  });
});
