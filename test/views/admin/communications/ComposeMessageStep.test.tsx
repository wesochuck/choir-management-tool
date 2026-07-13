// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

afterEach(() => mock.restoreAll());

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
    handleSaveDraft: mock.fn(async () => {}),
    isSavingDraft: false,
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

    const backButtons = screen.getAllByRole('button', { name: /Back to Template Selection/i });
    fireEvent.click(backButtons[0]!);

    assert.strictEqual(onBack.mock.callCount(), 1);
  });

  it('calls onContinue when Next is clicked', () => {
    const onContinue = mock.fn();
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft()}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={onContinue}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Next: Review & Send/i })[0]!);

    assert.strictEqual(onContinue.mock.callCount(), 1);
  });

  it('calls draft.handleSaveDraft when Save Draft is clicked', () => {
    const handleSaveDraft = mock.fn(async () => {});
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft({ handleSaveDraft })}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Save Draft/i })[0]!);

    assert.strictEqual(handleSaveDraft.mock.callCount(), 1);
  });

  it('disables Save Draft while isSavingDraft is true', () => {
    renderWithRouter(
      <ComposeMessageStep
        draft={makeDraft({ isSavingDraft: true })}
        editorRef={makeEditorRef()}
        onInsertPlaceholder={mock.fn()}
        selectedEvent={null}
        onBack={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    const saveButtons = screen.getAllByRole('button', { name: /Saving\.\.\./i });
    assert.ok(saveButtons.length > 0);
    saveButtons.forEach((btn) => assert.strictEqual((btn as HTMLButtonElement).disabled, true));
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
