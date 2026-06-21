// @vitest-environment jsdom
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { DialogContext, type DialogContextValue } from '../contexts/DialogContext';
import { useEventRosterData } from './useEventRosterData';
import { eventService } from '../services/eventService';
import { profileService } from '../services/profileService';
import { rosterService } from '../services/rosterService';
import * as settingsService from '../services/settingsService';

function mockRosterQueryDependencies() {
  mock.method(profileService, 'getActiveProfiles', async () => []);
  mock.method(rosterService, 'getEventRoster', async () => []);
  mock.method(settingsService, 'getVoicePartsAndSections', async () => ({
    voiceParts: [],
    sections: [],
  }));
  mock.method(settingsService.settingsService, 'getRosterSettings', async () => ({
    defaultStatus: 'Active',
    defaultSort: 'lastName' as const,
    defaultRsvpSort: 'lastName' as const,
    maxRehearsalMisses: 3,
  }));
}

function createHarness() {
  const showMessage = mock.fn(async () => {});
  const showToast = mock.fn(() => {});
  const dialog: DialogContextValue = {
    showMessage: showMessage as unknown as DialogContextValue['showMessage'],
    confirm: async () => false,
    prompt: async () => null,
    showToast,
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(DialogContext.Provider, { value: dialog }, children)
      )
    );
  return { wrapper, showMessage, showToast, client };
}

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

test('useEventRosterData shows the error dialog once when the query fails', async () => {
  const { wrapper, showMessage } = createHarness();
  mockRosterQueryDependencies();
  mock.method(eventService, 'getEventById', async () => {
    throw new Error('Event not found');
  });

  const { result } = renderHook(
    ({ eventId, isInline }) => useEventRosterData({ eventId, isInline }),
    { wrapper, initialProps: { eventId: 'evt1', isInline: false } }
  );

  await waitFor(() => {
    assert.ok(result.current.loadError);
  });

  assert.equal(showMessage.mock.callCount(), 1);
  assert.deepEqual(showMessage.mock.calls[0].arguments[0], {
    title: 'Event Not Found',
    message: 'The requested event or its RSVP roster could not be loaded.',
    variant: 'danger',
  });
});

test('useEventRosterData does not re-fire the error dialog on re-render with the same error', async () => {
  const { wrapper, showMessage } = createHarness();
  mockRosterQueryDependencies();
  mock.method(eventService, 'getEventById', async () => {
    throw new Error('Event not found');
  });

  const { result, rerender } = renderHook(
    ({ eventId, isInline }) => useEventRosterData({ eventId, isInline }),
    { wrapper, initialProps: { eventId: 'evt1', isInline: false } }
  );

  await waitFor(() => {
    assert.ok(result.current.loadError);
  });
  assert.equal(showMessage.mock.callCount(), 1);

  rerender({ eventId: 'evt1', isInline: false });
  rerender({ eventId: 'evt1', isInline: false });
  rerender({ eventId: 'evt1', isInline: true });
  rerender({ eventId: 'evt1', isInline: false });

  assert.equal(showMessage.mock.callCount(), 1);
});

test('useEventRosterData re-fires the error dialog when a new error replaces the previous one', async () => {
  const { wrapper, showMessage } = createHarness();
  mockRosterQueryDependencies();
  const getEventById = mock.method(eventService, 'getEventById', async () => {
    throw new Error('First failure');
  });

  const { result, rerender } = renderHook(
    ({ eventId, isInline }) => useEventRosterData({ eventId, isInline }),
    { wrapper, initialProps: { eventId: 'evt1', isInline: false } }
  );

  await waitFor(() => {
    assert.ok(result.current.loadError);
  });
  assert.equal(showMessage.mock.callCount(), 1);

  getEventById.mock.mockImplementation(async () => {
    throw new Error('Second failure');
  });

  rerender({ eventId: 'evt2', isInline: false });

  await waitFor(() => {
    assert.equal(showMessage.mock.callCount(), 2);
  });
});
