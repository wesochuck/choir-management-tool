// @vitest-environment jsdom
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AudienceStep } from '../../../../src/views/admin/communications/AudienceStep';
import type { UseCommunicationDraftReturn } from '../../../../src/views/admin/communications/useCommunicationDraft';
import type { CommunicationRecipient } from '../../../../src/services/communicationService';
import type { Event } from '../../../../src/services/eventService';
import type { SectionDef } from '../../../../src/services/settings/seatingSettings';

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
    filters: {
      eventId: '',
      rsvp: 'All',
      voiceParts: [],
      globalStatus: 'Active',
      targetAudiences: ['Members'],
    },
    updateFilter: mock.fn(),
    recipients: [],
    selectedRecipients: [],
    messageType: 'Email',
    recipientCounts: { total: 0, hasEmail: 0, hasPhone: 0 },
    ...overrides,
  } as unknown as UseCommunicationDraftReturn;
}

const mockEvents: Event[] = [
  {
    id: 'evt-1',
    title: 'Spring Concert',
    type: 'Performance',
  } as Event,
];

const mockSections: SectionDef[] = [{ code: 'S1', name: 'Soprano 1' }];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AudienceStep', () => {
  it('renders the audience filter UI', () => {
    renderWithRouter(
      <AudienceStep
        draft={makeDraft()}
        events={mockEvents}
        voicePartLabels={['Soprano', 'Alto']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByRole('heading', { name: /Step 1: Define Your Audience/i }));
  });

  it('calls updateFilter when RSVP changes', () => {
    const updateFilter = mock.fn();
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          filters: {
            eventId: 'evt-1',
            rsvp: 'All',
            voiceParts: [],
            globalStatus: 'Active',
            targetAudiences: ['Members'],
          },
          updateFilter,
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const rsvpSelect = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some((o) => o.text === 'Attending Only')
    );
    assert.ok(rsvpSelect, 'RSVP select not found');
    fireEvent.change(rsvpSelect!, { target: { value: 'Yes' } });

    const rsvpCall = updateFilter.mock.calls.find((call) => call.arguments[0] === 'rsvp');
    assert.ok(rsvpCall, 'Expected updateFilter to be called with rsvp');
    assert.strictEqual(rsvpCall?.arguments[1], 'Yes');
  });

  it('disables RSVP select when no event is selected', () => {
    renderWithRouter(
      <AudienceStep
        draft={makeDraft()}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    // Find the select that contains "Attending Only" (an RSVP-only option)
    const selects = screen.getAllByRole('combobox');
    const rsvpSelect = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some((o) => o.text === 'Attending Only')
    );
    assert.ok(rsvpSelect, 'RSVP select not found');
    assert.strictEqual((rsvpSelect as HTMLSelectElement).disabled, true);
  });

  it('calls onViewRecipients when View matched performers is clicked', () => {
    const onViewRecipients = mock.fn();
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          recipients: [makeRecipient('1')],
          recipientCounts: { total: 1, hasEmail: 1, hasPhone: 0 },
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={onViewRecipients}
        onContinue={mock.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /View matched performers/i }));

    assert.strictEqual(onViewRecipients.mock.callCount(), 1);
    assert.strictEqual(onViewRecipients.mock.calls[0]?.arguments[0].length, 1);
    assert.strictEqual(onViewRecipients.mock.calls[0]?.arguments[1], 'Matched Performers');
  });

  it('disables View matched performers when no recipients', () => {
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          recipients: [],
          recipientCounts: { total: 0, hasEmail: 0, hasPhone: 0 },
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /View matched performers/i });
    assert.strictEqual((button as HTMLButtonElement).disabled, true);
  });

  it('shows the SMS-unavailable banner when hasPhone is 0', () => {
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          recipients: [makeRecipient('1')],
          recipientCounts: { total: 1, hasEmail: 1, hasPhone: 0 },
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByText(/SMS is unavailable for this audience/i));
  });

  it('does not show the SMS-unavailable banner when hasPhone > 0', () => {
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          recipients: [makeRecipient('1', { phone: '555-1234' })],
          recipientCounts: { total: 1, hasEmail: 1, hasPhone: 1 },
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.strictEqual(screen.queryByText(/SMS is unavailable for this audience/i), null);
  });

  it('calls onContinue when Continue button is clicked', () => {
    const onContinue = mock.fn();
    renderWithRouter(
      <AudienceStep
        draft={makeDraft()}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={onContinue}
      />
    );

    const button = screen.getByRole('button', { name: /Continue to Templates/i });
    fireEvent.click(button);

    assert.strictEqual(onContinue.mock.callCount(), 1);
  });

  it('caps the singer preview at 5 and shows "and N more" footer', () => {
    const recipients = Array.from({ length: 8 }, (_, i) => makeRecipient(`${i + 1}`));
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          recipients,
          recipientCounts: { total: 8, hasEmail: 8, hasPhone: 0 },
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByText(/and 3 more performers\.\.\./i));
  });

  it('shows compact reach and exclusion information', () => {
    renderWithRouter(
      <AudienceStep
        draft={makeDraft({
          messageType: 'Email',
          recipients: [makeRecipient('email'), makeRecipient('missing', { email: '' })],
          selectedRecipients: [makeRecipient('email'), makeRecipient('missing', { email: '' })],
          recipientCounts: { total: 2, hasEmail: 1, hasPhone: 0 },
        })}
        events={mockEvents}
        voicePartLabels={['Soprano']}
        configSections={mockSections}
        onViewRecipients={mock.fn()}
        onContinue={mock.fn()}
      />
    );

    assert.ok(screen.getByText(/1 reachable by email/i));
    assert.ok(screen.getByText(/1 excluded/i));
    assert.ok(screen.getByRole('button', { name: 'Review recipients' }));
  });
});
