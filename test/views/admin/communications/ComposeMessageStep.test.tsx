// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type EasyMDE from 'easymde';

import { ComposeMessageStep } from '../../../../src/views/admin/communications/ComposeMessageStep';
import type { UseCommunicationDraftReturn } from '../../../../src/views/admin/communications/useCommunicationDraft';
import type { Event } from '../../../../src/services/eventService';
import { SetupProvider } from '../../../../src/contexts/SetupContext';
import * as moduleService from '../../../../src/services/moduleService';

function renderWithRouter(ui: React.ReactElement) {
  mock.method(moduleService, 'getPublicModuleState', async () => ({
    version: 1,
    enabled: ['setLists'],
  }));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SetupProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </SetupProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

function makeDraft(
  overrides: Partial<UseCommunicationDraftReturn> = {}
): UseCommunicationDraftReturn {
  return {
    filters: { eventId: 'evt-1', rsvp: 'All', voiceParts: [], globalStatus: 'Active' },
    subject: '',
    setSubject: mock.fn(),
    content: '',
    setContent: mock.fn(),
    messageType: 'Email',
    setMessageType: mock.fn(),
    warnings: [],
    draftSaveStatus: 'saved',
    draftSaveError: null,
    saveDraftNow: mock.fn(async () => {}),
    retryDraftSave: mock.fn(async () => {}),
    reloadLatestDraft: mock.fn(),
    saveDraftAsCopy: mock.fn(async () => {}),
    isSending: false,
    isSendingTest: false,
    selectedRecipients: [],
    recipientCounts: { total: 0, hasEmail: 0, hasPhone: 0 },
    ...overrides,
  } as unknown as UseCommunicationDraftReturn;
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Spring Concert',
    setListApproved: true,
    ...overrides,
  } as Event;
}

function makeEditorRef() {
  return { current: null } as React.MutableRefObject<EasyMDE | null>;
}

describe('ComposeMessageStep', () => {
  it('associates composer labels with their controls', () => {
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft()}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByLabelText('Subject'));
    assert.ok(screen.getByLabelText('Channel'));
    assert.ok(screen.getByLabelText('Message Body (Markdown Supported)'));
  });

  it('renders the action bar after all compose content', () => {
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft()}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    const placeholders = screen.getByRole('heading', { name: 'Placeholders' });
    const reviewBtn = screen.getByRole('button', { name: 'Review Message' });
    assert.ok(
      placeholders.compareDocumentPosition(reviewBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the action bar should follow the placeholder panel in DOM order'
    );
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = mock.fn();
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft()}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={onBack}
        onContinue={mock.fn()}
      />
    );

    const backButton = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backButton);

    assert.strictEqual(onBack.mock.callCount(), 1);
  });

  it('calls onContinue after flushing saveDraftNow when Review Message is clicked', async () => {
    const saveDraftNow = mock.fn(async () => {});
    const onContinue = mock.fn();
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft({ saveDraftNow })}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={onContinue}
      />
    );

    await fireEvent.click(screen.getByRole('button', { name: /Review Message/i }));

    assert.strictEqual(saveDraftNow.mock.callCount(), 1);
    assert.strictEqual(onContinue.mock.callCount(), 1);
  });

  it('renders DraftSaveStatus with current save status', () => {
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft({ draftSaveStatus: 'saving' })}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByText('Saving…'));
  });

  it('shows the setlist warning when content has {setlist} and event is unapproved', () => {
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft({ content: 'Hello {setlist}' })}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={makeEvent({ setListApproved: false })}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByText(/Set list not approved/i));
  });

  it('does not show the setlist warning when set list is approved', () => {
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft({ content: 'Hello {setlist}' })}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={makeEvent({ setListApproved: true })}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.strictEqual(screen.queryByText(/Set list not approved/i), null);
  });
});
