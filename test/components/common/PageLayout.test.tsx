// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext } from '../../../src/contexts/AuthContext';

import { PageLayout } from '../../../src/components/common/PageLayout';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function renderLayout(
  userRole: 'admin' | 'singer' | null = 'admin',
  overrides: Record<string, unknown> = {}
) {
  const logout = mock.fn();
  const authValue = {
    user: userRole ? { role: userRole } : null,
    isLoading: false,
    updatePreferences: async () => {},
    logout,
  };

  return {
    ...render(
      <AuthContext.Provider value={authValue as never}>
        <MemoryRouter>
          <PageLayout title="Test Page" {...overrides}>
            <div>Content</div>
          </PageLayout>
        </MemoryRouter>
      </AuthContext.Provider>
    ),
    logout,
  };
}

describe('PageLayout', () => {
  it('renders children', () => {
    renderLayout();
    assert.ok(screen.getByText('Content'));
  });

  it('renders Home link with decorative hidden icon', () => {
    renderLayout();
    const homeLink = screen.getByRole('link', { name: 'Home' });
    assert.ok(homeLink);
    assert.equal(homeLink.getAttribute('href'), '/dashboard');

    const icon = within(homeLink).getByText('🏠');
    assert.ok(icon.hasAttribute('aria-hidden'));
  });

  it('renders My Profile and Logout for admin users', () => {
    renderLayout();
    assert.ok(screen.getByRole('link', { name: 'My Profile' }));
    assert.ok(screen.getByRole('button', { name: 'Logout' }));
  });

  it('hides admin buttons for non-admin users', () => {
    renderLayout('singer');
    assert.equal(screen.queryByRole('link', { name: 'My Profile' }), null);
    assert.equal(screen.queryByRole('button', { name: 'Logout' }), null);
  });

  it('logging out calls logout', () => {
    const { logout } = renderLayout();
    screen.getByRole('button', { name: 'Logout' }).click();
    assert.equal(logout.mock.callCount(), 1);
  });
});
