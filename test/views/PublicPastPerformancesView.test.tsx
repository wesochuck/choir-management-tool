// @vitest-environment jsdom
import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { eventService } from '../../src/services/eventService';
import { settingsService } from '../../src/services/settingsService';
import { SetupProvider } from '../../src/contexts/SetupContext';
import * as moduleService from '../../src/services/moduleService';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SetupProvider>{children}</SetupProvider>
      </QueryClientProvider>
    );
  };
}

describe('PublicPastPerformancesView', () => {
  let PublicPastPerformancesView: React.ComponentType;

  before(async () => {
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getPastPerformancesPaginated', async () => ({
      items: [
        {
          id: '1',
          collectionId: 'test',
          collectionName: 'events',
          created: '',
          updated: '',
          title: 'Spring Concert',
          date: '2025-05-15',
          publicDetails: 'A wonderful evening of music.',
          eventGraphic: null as string | undefined,
          expand: {
            venue: {
              id: 'v1',
              collectionId: '',
              collectionName: 'venues',
              created: '',
              updated: '',
              name: 'Concert Hall',
            },
          },
        },
        {
          id: '2',
          collectionId: 'test',
          collectionName: 'events',
          created: '',
          updated: '',
          title: 'Holiday Show',
          date: '2024-12-20',
          publicDetails: '',
          eventGraphic: 'image.jpg',
          expand: { venue: undefined },
        },
      ],
      totalPages: 1,
      totalItems: 2,
    }));
    mock.method(moduleService, 'getPublicModuleState', async () => ({
      version: 1,
      enabled: ['ticketSales', 'donations', 'auditions'],
    }));

    const mod = await import('../../src/views/PublicPastPerformancesView');
    PublicPastPerformancesView = mod.default;
  });

  after(() => {
    mock.restoreAll();
  });

  it('renders without crashing and shows performances', async () => {
    const { container } = render(
      <MemoryRouter>
        <PublicPastPerformancesView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        assert.ok(container.querySelector('h1'));
        assert.strictEqual(container.textContent?.includes('Spring Concert'), true);
        assert.strictEqual(container.textContent?.includes('Holiday Show'), true);
      },
      { timeout: 5000 }
    );
  });

  it('renders empty state when no performances', async () => {
    mock.restoreAll();
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getPastPerformancesPaginated', async () => ({
      items: [],
      totalPages: 0,
      totalItems: 0,
    }));

    const mod = await import('../../src/views/PublicPastPerformancesView');
    const EmptyView = mod.default;

    const { container } = render(
      <MemoryRouter>
        <EmptyView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        assert.strictEqual(
          container.textContent?.includes('No past performances to show yet.'),
          true
        );
      },
      { timeout: 5000 }
    );
  });
});
