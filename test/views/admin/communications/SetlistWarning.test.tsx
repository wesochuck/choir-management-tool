// @vitest-environment jsdom
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { SetlistWarning } from '../../../../src/views/admin/communications/SetlistWarning';
import type { Event } from '../../../../src/services/eventService';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Spring Concert',
    setListApproved: false,
    ...overrides,
  } as Event;
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('SetlistWarning', () => {
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
