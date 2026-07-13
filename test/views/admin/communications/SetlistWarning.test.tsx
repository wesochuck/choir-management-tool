// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SetlistWarning } from '../../../../src/views/admin/communications/SetlistWarning';
import type { Event } from '../../../../src/services/eventService';
import { SetupProvider } from '../../../../src/contexts/SetupContext';
import * as moduleService from '../../../../src/services/moduleService';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Spring Concert',
    setListApproved: false,
    ...overrides,
  } as Event;
}

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

describe('SetlistWarning', () => {
  afterEach(() => mock.restoreAll());

  it('renders nothing when no event is selected', () => {
    const { container } = renderWithRouter(
      <SetlistWarning selectedEvent={null} content="hi {setlist}" />
    );
    assert.strictEqual(container.firstChild, null);
  });

  it('renders nothing when the set list is approved', () => {
    const { container } = renderWithRouter(
      <SetlistWarning selectedEvent={makeEvent({ setListApproved: true })} content="hi {setlist}" />
    );
    assert.strictEqual(container.firstChild, null);
  });

  it('renders nothing when content does not contain {setlist}', () => {
    const { container } = renderWithRouter(
      <SetlistWarning
        selectedEvent={makeEvent({ setListApproved: false })}
        content="regular content"
      />
    );
    assert.strictEqual(container.firstChild, null);
  });

  it('renders the warning when event is unapproved and content has {setlist}', () => {
    renderWithRouter(
      <SetlistWarning
        selectedEvent={makeEvent({ setListApproved: false })}
        content="Hi {setlist}"
      />
    );

    assert.ok(screen.getByText(/Set list not approved/i));
  });
});
