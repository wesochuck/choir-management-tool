/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getOfflineTrackUrl, revokeAllOfflineTrackUrls, clearAllDownloads } from '../src/services/offlineMediaStore.ts';

describe('offlineMediaStore', () => {
  let objectURLMock: any;
  let revokeURLMock: any;
  let getRequestMock: any;

  beforeEach(() => {
    mock.restoreAll();

    // Create a mock for URL.createObjectURL and URL.revokeObjectURL
    objectURLMock = mock.fn((blob: Blob) => {
      // Return a dummy url string based on blob size or something
      return `blob:http://localhost/${blob.size}`;
    });
    revokeURLMock = mock.fn();

    global.URL.createObjectURL = objectURLMock;
    global.URL.revokeObjectURL = revokeURLMock;

    // Create mocks for indexedDB
    getRequestMock = {
      onsuccess: null,
      onerror: null,
      result: undefined
    };

    const objectStoreMock = {
      get: mock.fn((trackId: string) => {
        // Return our mock request. In the test, we'll manually trigger onsuccess
        // using setTimeout to simulate async behavior of IDBRequest
        setTimeout(() => {
          // Setup result
          getRequestMock.result = {
            id: trackId,
            blob: new Blob(['dummy audio data'], { type: 'audio/mpeg' }),
          };
          if (getRequestMock.onsuccess) getRequestMock.onsuccess();
        }, 0);
        return getRequestMock;
      })
    };

    const transactionMock = {
      objectStore: mock.fn(() => objectStoreMock)
    };

    const dbMock = {
      transaction: mock.fn(() => transactionMock),
      objectStoreNames: { contains: () => true }
    };

    const openRequestMock = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: dbMock
    };

    global.indexedDB = {
      open: mock.fn(() => {
        setTimeout(() => {
          if (openRequestMock.onsuccess) (openRequestMock as any).onsuccess();
        }, 0);
        return openRequestMock;
      })
    } as any;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('revokeAllOfflineTrackUrls should revoke all active blob URLs and clear the cache', async () => {
    // 1. Populate activeUrls
    const url1 = await getOfflineTrackUrl('track-1');
    const url2 = await getOfflineTrackUrl('track-2');

    assert.ok(url1, 'Should return a url for track-1');
    assert.ok(url2, 'Should return a url for track-2');
    assert.strictEqual(objectURLMock.mock.callCount(), 2, 'createObjectURL should have been called twice');

    // 2. Call the function under test
    revokeAllOfflineTrackUrls();

    // 3. Verify revokes were called
    assert.strictEqual(revokeURLMock.mock.callCount(), 2, 'revokeObjectURL should have been called for each URL');
    assert.ok(revokeURLMock.mock.calls.some((call: any) => call.arguments[0] === url1), 'Should have revoked url1');
    assert.ok(revokeURLMock.mock.calls.some((call: any) => call.arguments[0] === url2), 'Should have revoked url2');

    // 4. Verify cache was cleared by getting again and checking if createObjectURL is called anew
    objectURLMock.mock.resetCalls();
    await getOfflineTrackUrl('track-1');
    assert.strictEqual(objectURLMock.mock.callCount(), 1, 'Should create a new object URL, meaning cache was cleared');
  });

  it('clearAllDownloads should clear both object stores and revoke URLs', async () => {
    // The activeUrls map maintains state between tests in this module
    // We should mock out revokeURLMock to 0
    revokeURLMock.mock.resetCalls();

    // Call getOfflineTrackUrl BEFORE we override global.indexedDB.open, so it uses the original getRequestMock
    await getOfflineTrackUrl('track-clear');

    // We need to override the indexedDB mock specifically for this test to handle clear()
    const clearReqTracks = { onsuccess: null as any, onerror: null as any };
    const clearReqPlaylists = { onsuccess: null as any, onerror: null as any };

    const tracksStoreMock = { clear: mock.fn(() => clearReqTracks) };
    const playlistsStoreMock = { clear: mock.fn(() => clearReqPlaylists) };

    const transactionMock = {
      objectStore: mock.fn((storeName) => {
        if (storeName === 'tracks') return tracksStoreMock;
        if (storeName === 'playlists') return playlistsStoreMock;
        return null;
      })
    };

    const dbMock = { transaction: mock.fn(() => transactionMock), objectStoreNames: { contains: () => true } };
    global.indexedDB.open = mock.fn(() => {
      const req = { onsuccess: null as any, result: dbMock };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req as any;
    });


    const clearPromise = clearAllDownloads();

    // Wait for event loop to process so the transaction and clear calls happen
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.strictEqual(tracksStoreMock.clear.mock.callCount(), 1);
    assert.strictEqual(playlistsStoreMock.clear.mock.callCount(), 1);

    // Simulate success of both clear requests
    if (clearReqTracks.onsuccess) clearReqTracks.onsuccess();
    if (clearReqPlaylists.onsuccess) clearReqPlaylists.onsuccess();

    await clearPromise;

    // Verify revokeAllOfflineTrackUrls was called
    // (revokeURLMock callCount will be >0 because there were URLs populated in this test and the previous test)
    assert.ok(revokeURLMock.mock.callCount() > 0);
  });

  it('clearAllDownloads should reject if clear fails', async () => {
    const clearReqTracks = { onsuccess: null as any, onerror: null as any, error: new Error('Clear failed') };
    const clearReqPlaylists = { onsuccess: null as any, onerror: null as any };

    const tracksStoreMock = { clear: mock.fn(() => clearReqTracks) };
    const playlistsStoreMock = { clear: mock.fn(() => clearReqPlaylists) };

    const transactionMock = {
      objectStore: mock.fn((storeName) => {
        if (storeName === 'tracks') return tracksStoreMock;
        if (storeName === 'playlists') return playlistsStoreMock;
        return null;
      })
    };

    const dbMock = { transaction: mock.fn(() => transactionMock), objectStoreNames: { contains: () => true } };
    global.indexedDB.open = mock.fn(() => {
      const req = { onsuccess: null as any, result: dbMock };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req as any;
    });

    const clearPromise = clearAllDownloads();

    await new Promise((resolve) => setTimeout(resolve, 0));

    if (clearReqTracks.onerror) clearReqTracks.onerror();

    try {
      await clearPromise;
      assert.fail('Should have rejected');
    } catch (err: any) {
      assert.strictEqual(err.message, 'Clear failed');
    }
  });
});
