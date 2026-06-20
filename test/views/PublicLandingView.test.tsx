// @vitest-environment jsdom
import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { settingsService } from '../../src/services/settingsService';
import { eventService } from '../../src/services/eventService';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('PublicLandingView', () => {
  let PublicLandingView: React.ComponentType;

  before(async () => {
    mock.method(settingsService, 'getLandingSettings', async () => ({
      heroHeadline: 'Test Hero',
      heroSubtitle: 'Test Subtitle',
      aboutUsText: 'About our choir',
      historyText: 'Our history',
      contactEmail: 'test@example.com',
    }));
    mock.method(settingsService, 'getHeroImageUrl', async () => null);
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getRecentPerformances', async () => []);
    mock.method(eventService, 'getPublicEvents', async () => []);

    const mod = await import('../../src/views/PublicLandingView');
    PublicLandingView = mod.default;
  });

  after(() => {
    mock.restoreAll();
  });

  it('renders without crashing', async () => {
    const { container } = render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        assert.ok(container.querySelector('h1'));
      },
      { timeout: 5000 }
    );
  });

  it('renders navigation links', async () => {
    const { container } = render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        const links = container.querySelectorAll('a');
        const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
        assert.ok(hrefs.some((h) => h === '/tickets'));
        assert.ok(hrefs.some((h) => h === '/donate'));
        assert.ok(hrefs.some((h) => h === '/history'));
        assert.ok(hrefs.some((h) => h === '/auditions'));
        assert.ok(hrefs.some((h) => h === '/performances'));
      },
      { timeout: 5000 }
    );
  });

  it('renders See All Past Performances link', async () => {
    const { container } = render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        const links = container.querySelectorAll('a');
        const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
        assert.ok(hrefs.some((h) => h === '/performances'));
      },
      { timeout: 5000 }
    );
  });

  it('renders highlighted ticketed event with Buy Tickets button', async () => {
    mock.restoreAll();
    mock.method(settingsService, 'getLandingSettings', async () => ({
      heroHeadline: 'Test Hero',
      heroSubtitle: 'Test Subtitle',
      aboutUsText: '',
      historyText: '',
      contactEmail: '',
    }));
    mock.method(settingsService, 'getHeroImageUrl', async () => null);
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getRecentPerformances', async () => []);
    mock.method(eventService, 'getPublicEvents', async () => [
      {
        id: 'evt_future',
        collectionId: 'test',
        collectionName: 'events',
        created: '',
        updated: '',
        title: 'Upcoming Gala',
        date: new Date(Date.now() + 86400000).toISOString(),
        isTicketingEnabled: true,
        eventGraphic: null as string | undefined,
        expand: { venue: undefined },
      },
    ]);

    const mod = await import('../../src/views/PublicLandingView');
    const View = mod.default;

    const { container } = render(
      <MemoryRouter>
        <View />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        assert.ok(container.textContent?.includes('Upcoming Gala'));
        const buyLinks = Array.from(container.querySelectorAll('a')).filter(
          (a) => a.getAttribute('href') === '/tickets/evt_future'
        );
        assert.ok(buyLinks.length > 0);
      },
      { timeout: 5000 }
    );
  });

  it('renders past performances and highlighted event independently', async () => {
    mock.restoreAll();
    mock.method(settingsService, 'getLandingSettings', async () => ({
      heroHeadline: 'Test Hero',
      heroSubtitle: 'Test Subtitle',
      aboutUsText: '',
      historyText: '',
      contactEmail: '',
    }));
    mock.method(settingsService, 'getHeroImageUrl', async () => null);
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getRecentPerformances', async () => [
      {
        id: 'evt_past',
        collectionId: 'test',
        collectionName: 'events',
        created: '',
        updated: '',
        title: 'Spring Concert',
        date: new Date(Date.now() - 86400000).toISOString(),
        publicDetails: '',
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
    ]);
    mock.method(eventService, 'getPublicEvents', async () => [
      {
        id: 'evt_future',
        collectionId: 'test',
        collectionName: 'events',
        created: '',
        updated: '',
        title: 'Upcoming Gala',
        date: new Date(Date.now() + 86400000).toISOString(),
        isTicketingEnabled: true,
        eventGraphic: null as string | undefined,
        expand: { venue: undefined },
      },
    ]);

    const mod = await import('../../src/views/PublicLandingView');
    const View = mod.default;

    const { container } = render(
      <MemoryRouter>
        <View />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        assert.ok(container.textContent?.includes('Spring Concert'));
        assert.ok(container.textContent?.includes('Upcoming Gala'));
        const headings = container.querySelectorAll('h2');
        const hasPastHeading = Array.from(headings).some((h) =>
          h.textContent?.includes('Past Performances')
        );
        assert.ok(hasPastHeading);
      },
      { timeout: 5000 }
    );
  });
});
