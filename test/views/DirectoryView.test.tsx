// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { profileService, type Profile } from '../../src/services/profileService';
import DirectoryView from '../../src/views/singer/DirectoryView';
import { DirectoryRoute } from '../../src/App';
import DashboardView from '../../src/views/singer/DashboardView';
import * as useMyEventsModule from '../../src/hooks/useMyEvents';
import { AuthContext } from '../../src/contexts/AuthContext';
import { settingsService } from '../../src/services/settingsService';
import { resourceService } from '../../src/services/resourceService';
import { communicationService } from '../../src/services/communicationService';
import { pollService } from '../../src/services/pollService';
import { DialogProvider } from '../../src/contexts/DialogProvider';
import { ChoirNameProvider } from '../../src/hooks/useDocumentTitle';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ChoirNameProvider>{children}</ChoirNameProvider>
      </QueryClientProvider>
    );
  };
}

const sampleProfiles = [
  {
    id: 'p1',
    name: 'Alice Soprano',
    voicePart: 'S1',
    phone: '555-0001',
    photo: '',
    globalStatus: 'Active',
    expand: {
      user: {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice Soprano',
        role: 'singer',
      },
    },
  },
  {
    id: 'p2',
    name: 'Bob Bass',
    voicePart: 'B1',
    phone: '555-0002',
    photo: '',
    globalStatus: 'Active',
    expand: {
      user: {
        id: 'u2',
        email: 'bob@example.com',
        name: 'Bob Bass',
        role: 'singer',
      },
    },
  },
] as unknown as Profile[];

describe('DirectoryView', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('renders loading state initially and then directory list', async () => {
    mock.method(profileService, 'getDirectoryProfiles', async () => sampleProfiles);

    const { container, getByPlaceholderText } = render(
      <MemoryRouter>
        <DirectoryView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    // Verify loading state is visible
      assert.ok(container.textContent?.includes('Loading performer directory...'));

    // Wait for profiles to load
    await waitFor(() => {
      assert.ok(container.textContent?.includes('Alice Soprano'));
      assert.ok(container.textContent?.includes('Bob Bass'));
      assert.ok(container.textContent?.includes('S1'));
      assert.ok(container.textContent?.includes('B1'));
      assert.ok(container.textContent?.includes('alice@example.com'));
      assert.ok(container.textContent?.includes('bob@example.com'));
    });

    const searchInput = getByPlaceholderText(/Search by name/i);
    assert.ok(searchInput);
  });

  it('filters profiles by text search query', async () => {
    mock.method(profileService, 'getDirectoryProfiles', async () => sampleProfiles);

    const { container, getByPlaceholderText } = render(
      <MemoryRouter>
        <DirectoryView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Alice Soprano'));
    });

    const searchInput = getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    // Alice should still be visible, Bob should be hidden
    assert.ok(container.textContent?.includes('Alice Soprano'));
    assert.equal(container.textContent?.includes('Bob Bass'), false);
  });

  it('displays EmptyState when search query yields no matches', async () => {
    mock.method(profileService, 'getDirectoryProfiles', async () => sampleProfiles);

    const { container, getByPlaceholderText } = render(
      <MemoryRouter>
        <DirectoryView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Alice Soprano'));
    });

    const searchInput = getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-singer-name' } });

    await waitFor(() => {
      assert.ok(container.textContent?.includes('No Matching Performers'));
    });
  });

  it('allows singers to access directory when enabled', async () => {
    mock.method(profileService, 'getDirectoryProfiles', async () => sampleProfiles);
    mock.method(settingsService, 'getDirectorySettings', async () => ({ enabled: true }));

    const authValue = {
      user: { id: 'u1', role: 'singer' },
      isLoading: false,
    };

    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/directory']}>
          <Routes>
            <Route path="/directory" element={<DirectoryRoute />} />
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Alice Soprano'));
    });
  });

  it('redirects singers to dashboard when directory is disabled', async () => {
    mock.method(profileService, 'getDirectoryProfiles', async () => sampleProfiles);
    mock.method(settingsService, 'getDirectorySettings', async () => ({ enabled: false }));

    const authValue = {
      user: { id: 'u1', role: 'singer' },
      isLoading: false,
    };

    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/directory']}>
          <Routes>
            <Route path="/directory" element={<DirectoryRoute />} />
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Dashboard View'));
      assert.equal(container.textContent?.includes('Alice Soprano'), false);
    });
  });

  it('allows admins to access directory even when disabled', async () => {
    mock.method(profileService, 'getDirectoryProfiles', async () => sampleProfiles);
    mock.method(settingsService, 'getDirectorySettings', async () => ({ enabled: false }));

    const authValue = {
      user: { id: 'u_admin', role: 'admin' },
      isLoading: false,
    };

    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/directory']}>
          <Routes>
            <Route path="/directory" element={<DirectoryRoute />} />
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Alice Soprano'));
    });
  });

  it('shows Performer Directory button on dashboard when enabled', async () => {
    mock.method(settingsService, 'getDirectorySettings', async () => ({ enabled: true }));
    mock.method(resourceService, 'getResources', async () => []);
    mock.method(communicationService, 'getMessages', async () => []);
    mock.method(pollService, 'getActivePollsForSinger', async () => []);
    mock.method(useMyEventsModule, 'useMyEvents', () => ({
      events: [],
      myRosters: {},
      myProfile: { id: 'p1' },
      isLoading: false,
      error: null,
      updateRSVP: async () => {},
      refresh: async () => {},
    }));

    const authValue = {
      user: { id: 'u1', role: 'singer' },
      isLoading: false,
    };

    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <DialogProvider>
          <MemoryRouter>
            <DashboardView />
          </MemoryRouter>
        </DialogProvider>
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Performer Directory'));
    });
  });

  it('hides Performer Directory button on dashboard for singers when disabled', async () => {
    mock.method(settingsService, 'getDirectorySettings', async () => ({ enabled: false }));
    mock.method(resourceService, 'getResources', async () => []);
    mock.method(communicationService, 'getMessages', async () => []);
    mock.method(pollService, 'getActivePollsForSinger', async () => []);
    mock.method(useMyEventsModule, 'useMyEvents', () => ({
      events: [],
      myRosters: {},
      myProfile: { id: 'p1' },
      isLoading: false,
      error: null,
      updateRSVP: async () => {},
      refresh: async () => {},
    }));

    const authValue = {
      user: { id: 'u1', role: 'singer' },
      isLoading: false,
    };

    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <DialogProvider>
          <MemoryRouter>
            <DashboardView />
          </MemoryRouter>
        </DialogProvider>
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.equal(container.textContent?.includes('Singer Directory'), false);
    });
  });

  it('shows Performer Directory button on dashboard for admins even when disabled', async () => {
    mock.method(settingsService, 'getDirectorySettings', async () => ({ enabled: false }));
    mock.method(resourceService, 'getResources', async () => []);
    mock.method(communicationService, 'getMessages', async () => []);
    mock.method(pollService, 'getActivePollsForSinger', async () => []);
    mock.method(useMyEventsModule, 'useMyEvents', () => ({
      events: [],
      myRosters: {},
      myProfile: { id: 'p1' },
      isLoading: false,
      error: null,
      updateRSVP: async () => {},
      refresh: async () => {},
    }));

    const authValue = {
      user: { id: 'u_admin', role: 'admin' },
      isLoading: false,
    };

    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <DialogProvider>
          <MemoryRouter>
            <DashboardView />
          </MemoryRouter>
        </DialogProvider>
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.textContent?.includes('Performer Directory'));
    });
  });
});
