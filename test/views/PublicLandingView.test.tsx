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
});
