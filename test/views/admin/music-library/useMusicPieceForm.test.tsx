// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

import {
  useMusicPieceForm,
  type UseMusicPieceFormParams,
} from '../../../../src/views/admin/music-library/useMusicPieceForm';
import { DialogContext } from '../../../../src/contexts/DialogContext';
import { ChoirNameProvider } from '../../../../src/hooks/useDocumentTitle';
import { venueService } from '../../../../src/services/venueService';
import * as settingsServiceModule from '../../../../src/services/settingsService';
import { eventService } from '../../../../src/services/eventService';
import { musicLibraryService, type MusicPiece } from '../../../../src/services/musicLibraryService';

const mockDialog = {
  showMessage: mock.fn(async () => {}),
  confirm: mock.fn(async () => true),
  prompt: mock.fn(async () => ''),
  showToast: mock.fn(() => {}),
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DialogContext.Provider value={mockDialog}>
        <QueryClientProvider client={client}>
          <ChoirNameProvider>{children}</ChoirNameProvider>
        </QueryClientProvider>
      </DialogContext.Provider>
    );
  };
}

const mockGenres: settingsServiceModule.MusicGenreDef[] = [
  { id: 'genre_1', label: 'Classical' },
  { id: 'genre_2', label: 'Sacred' },
];

const samplePiece: MusicPiece = {
  id: 'piece_1',
  collectionId: 'pbc_music_001',
  collectionName: 'musicPieces',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  title: 'Messiah',
  composer: 'G.F. Handel',
  arranger: '',
  duration: '2:30:00',
  copies: 50,
  catalogId: 'H-101',
  purchaseDate: '2020-05-01',
  sectionBuckets: ['S', 'A'],
  genres: ['genre_2'],
  notes: 'Oratorio',
  audioFiles: [],
  audioTrackMapping: {},
};

describe('useMusicPieceForm hook', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('initializes default empty states when piece is null', async () => {
    mock.method(settingsServiceModule.settingsService, 'getChoirName', async () => 'Test Choir');
    mock.method(
      settingsServiceModule.settingsService,
      'getTimezone',
      async () => 'America/New_York'
    );
    mock.method(settingsServiceModule, 'getVoicePartsAndSections', async () => ({
      sections: [],
      voiceParts: [],
    }));
    mock.method(venueService, 'getVenues', async () => []);
    mock.method(eventService, 'getEvents', async () => []);

    const onClose = mock.fn();
    const onSave = mock.fn(async () => {});

    const { result } = renderHook(
      () =>
        useMusicPieceForm({
          isOpen: true,
          piece: null,
          onClose,
          onSave,
          allGenres: mockGenres,
        }),
      { wrapper: createWrapper() }
    );

    // Assert initial states
    assert.strictEqual(result.current.details.title, '');
    assert.strictEqual(result.current.details.composer, '');
    assert.strictEqual(result.current.details.arranger, '');
    assert.strictEqual(result.current.state.isDirty, false);

    // Modify fields and verify isDirty
    act(() => {
      result.current.details.setTitle('New Title');
    });

    assert.strictEqual(result.current.details.title, 'New Title');
    assert.strictEqual(result.current.state.isDirty, true);
  });

  it('initializes details with piece values when piece is provided', async () => {
    mock.method(settingsServiceModule.settingsService, 'getChoirName', async () => 'Test Choir');
    mock.method(
      settingsServiceModule.settingsService,
      'getTimezone',
      async () => 'America/New_York'
    );
    mock.method(settingsServiceModule, 'getVoicePartsAndSections', async () => ({
      sections: [
        { code: 'S', name: 'Sopranos' },
        { code: 'A', name: 'Altos' },
      ],
      voiceParts: [],
    }));
    mock.method(venueService, 'getVenues', async () => []);
    mock.method(eventService, 'getEvents', async () => []);
    mock.method(musicLibraryService, 'getMovements', async () => []);

    const onClose = mock.fn();
    const onSave = mock.fn(async () => {});

    const { result } = renderHook(
      () =>
        useMusicPieceForm({
          isOpen: true,
          piece: samplePiece,
          onClose,
          onSave,
          allGenres: mockGenres,
        }),
      { wrapper: createWrapper() }
    );

    // Wait for async load effects
    await waitFor(() => {
      assert.strictEqual(result.current.details.title, 'Messiah');
    });

    assert.strictEqual(result.current.details.composer, 'G.F. Handel');
    assert.strictEqual(result.current.details.catalogId, 'H-101');
    assert.strictEqual(result.current.details.purchaseDateInput, '05/2020');
    assert.deepStrictEqual(result.current.details.sectionBuckets, ['S', 'A']);
    assert.strictEqual(result.current.state.isDirty, false);

    // Try modifying a field
    act(() => {
      result.current.details.setComposer('George Frideric Handel');
    });

    assert.strictEqual(result.current.state.isDirty, true);
  });

  it('submits onSave with buildSavePayload when handleSubmit is called', async () => {
    mock.method(settingsServiceModule.settingsService, 'getChoirName', async () => 'Test Choir');
    mock.method(
      settingsServiceModule.settingsService,
      'getTimezone',
      async () => 'America/New_York'
    );
    mock.method(settingsServiceModule, 'getVoicePartsAndSections', async () => ({
      sections: [],
      voiceParts: [],
    }));
    mock.method(venueService, 'getVenues', async () => []);
    mock.method(eventService, 'getEvents', async () => []);

    const onClose = mock.fn();
    const onSave = mock.fn(async (_data: Parameters<UseMusicPieceFormParams['onSave']>[0]) => {});

    const { result } = renderHook(
      () =>
        useMusicPieceForm({
          isOpen: true,
          piece: null,
          onClose,
          onSave,
          allGenres: mockGenres,
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.details.setTitle('Hallelujah Chorus');
      result.current.details.setComposer('Handel');
      result.current.details.setDuration('4:15');
      result.current.details.setPurchaseDateInput('12/2021');
    });

    await act(async () => {
      await result.current.actions.handleSubmit();
    });

    assert.strictEqual(onSave.mock.callCount(), 1);
    const call = onSave.mock.calls[0];
    assert.ok(call);
    const savedData = call.arguments[0];
    assert.ok(savedData);
    assert.strictEqual(savedData.title, 'Hallelujah Chorus');
    assert.strictEqual(savedData.composer, 'Handel');
    assert.strictEqual(savedData.duration, '4:15');
    assert.strictEqual(savedData.purchaseDate, '2021-12-01');
  });
});
