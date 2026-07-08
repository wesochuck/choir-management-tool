// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import MusicLibraryView from '../../../../src/views/admin/MusicLibraryView';
import * as musicPieceModalModule from '../../../../src/views/admin/music-library/MusicPieceModal';
import * as musicImportModalModule from '../../../../src/components/admin/MusicImportModal';

import { musicLibraryService } from '../../../../src/services/musicLibraryService';
import { eventService } from '../../../../src/services/eventService';
import { settingsService } from '../../../../src/services/settingsService';
import { pb } from '../../../../src/lib/pocketbase';
import { DialogProvider } from '../../../../src/contexts/DialogProvider';

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
        <DialogProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </DialogProvider>
      </QueryClientProvider>
    );
  };
}

const originalCollection = pb.collection;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  mock.restoreAll();
  pb.collection = originalCollection;
});

describe('MusicLibraryView integration', () => {
  it('renders table rows with performance count and last performed date from perfMap', async () => {
    // Mock the modals only to avoid JSDOM side effects or hangs from portals and event listeners
    mock.method(musicPieceModalModule, 'MusicPieceModal', () => (
      <div data-testid="mock-piece-modal" />
    ));
    mock.method(musicImportModalModule, 'MusicImportModal', () => (
      <div data-testid="mock-import-modal" />
    ));

    // Overwrite pb.collection to avoid real network requests
    pb.collection = function (name: string) {
      if (name === 'appSettings') {
        return {
          getFirstListItem: async () => ({
            key: 'voiceParts',
            value: {
              voiceParts: [],
              sections: [],
            },
          }),
        } as any;
      }
      return originalCollection.call(pb, name);
    };

    // Mock the data returned by the service layers
    mock.method(musicLibraryService, 'getLibrary', async () => [
      {
        id: 'piece-1',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        collectionId: 'col1',
        collectionName: 'musicPieces',
        title: 'Ave Maria Test Repertoire',
        composer: 'Gounod',
        duration: '3:00',
        audioTrackMapping: {},
      },
    ]);

    mock.method(eventService, 'getEvents', async () => [
      {
        id: 'event-1',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        collectionId: 'col2',
        collectionName: 'events',
        title: 'Spring Concert Performance',
        date: '2026-06-20T19:30:00.000Z',
        type: 'Performance',
        details: '',
        setList: [{ pieceId: 'piece-1' }],
      },
    ]);

    mock.method(settingsService, 'getMusicLibrarySettings', async () => ({
      catalogLookupUrlTemplate: '',
      genres: [],
    }));

    render(<MusicLibraryView />, { wrapper: createWrapper() });

    // Yield to the event loop so that query promises resolve and React commits updates to DOM
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify performance metrics render in the table (both desktop table and mobile card view elements exist in JSDOM)
    // 1. Verify piece title renders
    const titleElements = screen.getAllByText('Ave Maria Test Repertoire');
    assert.ok(titleElements.length > 0, 'Piece title not found in document');

    // 2. Verify performance count is '1' (from setList)
    const countElements = screen.getAllByText('1');
    assert.ok(countElements.length > 0, 'Performance count not found in document');

    // 3. Verify last performed date is '2026-06-20'
    const dateElements = screen.getAllByText('2026-06-20');
    assert.ok(dateElements.length > 0, 'Last performed date not found in document');
  });
});
