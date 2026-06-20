// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { profileService, type Profile } from '../../src/services/profileService';
import DirectoryView from '../../src/views/singer/DirectoryView';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
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
    assert.ok(container.textContent?.includes('Loading singer directory...'));

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
      assert.ok(container.textContent?.includes('No Matching Singers'));
    });
  });
});
