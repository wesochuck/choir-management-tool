// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ReviewStep } from '../../../../src/views/admin/communications/ReviewStep';
import type { UseCommunicationDraftReturn } from '../../../../src/views/admin/communications/useCommunicationDraft';
import type { UseCommunicationPreviewReturn } from '../../../../src/views/admin/communications/useCommunicationPreview';
import type { Event } from '../../../../src/services/eventService';
import type { CommunicationSettings } from '../../../../src/services/settingsService';
import type { CommunicationRecipient } from '../../../../src/services/communicationService';
import { SetupProvider } from '../../../../src/contexts/SetupContext';
import * as moduleService from '../../../../src/services/moduleService';

function makeRecipient(
  id: string,
  overrides: Partial<CommunicationRecipient> = {}
): CommunicationRecipient {
  return {
    id,
    name: `Singer ${id}`,
    email: `${id}@example.com`,
    phone: '',
    voicePart: 'Soprano',
    globalStatus: 'Active',
    ...overrides,
  };
}

function makeDraft(
  overrides: Partial<UseCommunicationDraftReturn> = {}
): UseCommunicationDraftReturn {
  return {
    subject: 'Test Subject',
    content: 'Test content',
    messageType: 'Email',
    selectedRecipients: [makeRecipient('1')],
    recipientCounts: { total: 1, hasEmail: 1, hasPhone: 0 },
    filters: { eventId: '', rsvp: 'All', voiceParts: [], globalStatus: 'Active' },
    isSending: false,
    isSendingTest: false,
    sendMessage: mock.fn(async () => {}),
    handleSendTest: mock.fn(async () => {}),
    ...overrides,
  } as unknown as UseCommunicationDraftReturn;
}

function makePreview(
  overrides: Partial<UseCommunicationPreviewReturn> = {}
): UseCommunicationPreviewReturn {
  return {
    previewHtml: '<p>preview</p>',
    renderedSubject: 'Test Subject',
    renderedSmsBody: 'Test content',
    previewRecipient: makeRecipient('1'),
    selectedEvent: null,
    ...overrides,
  } as UseCommunicationPreviewReturn;
}

const mockCommSettings: CommunicationSettings = {
  reminderSubjectTemplate: '',
  reminderBodyTemplate: '',
  rsvpSubjectTemplate: '',
  rsvpBodyTemplate: '',
  ticketPurchaseConfirmationSubjectTemplate: '',
  ticketPurchaseConfirmationBodyTemplate: '',
  bundleTicketPurchaseConfirmationSubjectTemplate: '',
  bundleTicketPurchaseConfirmationBodyTemplate: '',
  mailingAddress: '',
} as unknown as CommunicationSettings;

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

describe('ReviewStep', () => {
  it('disables Send when there are zero selected recipients', () => {
    renderWithRouter(
      <ReviewStep
        draft={makeDraft({
          selectedRecipients: [],
          recipientCounts: { total: 0, hasEmail: 0, hasPhone: 0 },
        })}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const sendButton = screen.getByRole('button', { name: /Send Email to 0 Performers/i });
    assert.strictEqual((sendButton as HTMLButtonElement).disabled, true);
  });

  it('disables Send while isSending is true', () => {
    renderWithRouter(
      <ReviewStep
        draft={makeDraft({ isSending: true })}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const sendButton = screen.getByRole('button', { name: /Sending\.\.\./i });
    assert.strictEqual((sendButton as HTMLButtonElement).disabled, true);
  });

  it('calls draft.sendMessage when Send is clicked', () => {
    const sendMessage = mock.fn(async () => {});
    renderWithRouter(
      <ReviewStep
        draft={makeDraft({ sendMessage })}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Send Email to 1 Performer/i }));

    assert.strictEqual(sendMessage.mock.callCount(), 1);
  });

  it('calls draft.handleSendTest when Send Test is clicked', () => {
    const handleSendTest = mock.fn(async () => {});
    renderWithRouter(
      <ReviewStep
        draft={makeDraft({ handleSendTest })}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const testButton = screen.getByRole('button', { name: /Send Test to Me/i });
    fireEvent.click(testButton);

    assert.strictEqual(handleSendTest.mock.callCount(), 1);
  });

  it('uses compact mobile labels while preserving full accessible action names', () => {
    renderWithRouter(
      <ReviewStep
        draft={makeDraft()}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const testButton = screen.getByRole('button', { name: 'Send Test to Me' });
    const sendButton = screen.getByRole('button', { name: /Send Email to 1 Performer/i });

    assert.equal(testButton.querySelector('.sm\\:hidden')?.textContent, 'Test');
    assert.equal(sendButton.querySelector('.sm\\:hidden')?.textContent, 'Send 1');
  });

  it('disables Send Test while isSendingTest is true', () => {
    renderWithRouter(
      <ReviewStep
        draft={makeDraft({ isSendingTest: true })}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const testButton = screen.getByRole('button', { name: /Sending test\.\.\./i });
    assert.strictEqual((testButton as HTMLButtonElement).disabled, true);
  });

  it('calls onBack when the Back button is clicked', () => {
    const onBack = mock.fn();
    renderWithRouter(
      <ReviewStep
        draft={makeDraft()}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={onBack}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const backButton = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backButton);

    assert.strictEqual(onBack.mock.callCount(), 1);
  });

  it('reports only recipients unreachable by every selected channel as excluded', () => {
    const selectedRecipients = [
      makeRecipient('both', { phone: '5551234567' }),
      makeRecipient('email-only'),
      makeRecipient('neither', { email: '', phone: '' }),
    ];

    renderWithRouter(
      <ReviewStep
        draft={makeDraft({
          messageType: 'Both',
          selectedRecipients,
          recipientCounts: { total: 3, hasEmail: 2, hasPhone: 1 },
        })}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    assert.ok(screen.getByText(/1 performer will be excluded/i));
    assert.strictEqual(screen.queryByText(/2 performers will be excluded/i), null);
  });

  it('orders recipients, preview, and checklist for the mobile reading flow', () => {
    renderWithRouter(
      <ReviewStep
        draft={makeDraft()}
        preview={makePreview()}
        commSettings={mockCommSettings}
        selectedEvent={null}
        user={null}
        choirName="Test Choir"
        senderEmail="test@choir.com"
        onBack={mock.fn()}
        onViewRecipients={mock.fn()}
        setTab={mock.fn()}
        setEditingTemplate={mock.fn()}
      />
    );

    const summary = document.querySelector<HTMLElement>('[data-review-section="recipients"]');
    const preview = document.querySelector<HTMLElement>('[data-review-section="preview"]');
    const checklist = document.querySelector<HTMLElement>('[data-review-section="checklist"]');
    assert.ok(summary && preview && checklist);
    assert.ok(summary.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING);
    assert.ok(preview.compareDocumentPosition(checklist) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
