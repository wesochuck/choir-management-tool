// @vitest-environment jsdom
import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

import { settingsService } from '../../src/services/settingsService';
import { eventService } from '../../src/services/eventService';

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
    mock.method(eventService, 'getPastPerformances', async () => []);

    const mod = await import('../../src/views/PublicLandingView');
    PublicLandingView = mod.default;
  });

  after(() => {
    mock.restoreAll();
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>
    );
  });

  it('renders navigation links', async () => {
    const { container } = render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>
    );

    await waitFor(() => {
      const links = container.querySelectorAll('a');
      const hrefs = Array.from(links).map(a => a.getAttribute('href'));
      assert.ok(hrefs.some(h => h === '/tickets'));
      assert.ok(hrefs.some(h => h === '/donate'));
      assert.ok(hrefs.some(h => h === '/history'));
      assert.ok(hrefs.some(h => h === '/auditions'));
    }, { timeout: 5000 });
  });
});
