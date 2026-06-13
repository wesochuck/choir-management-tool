/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getOfflineTrackUrl, revokeAllOfflineTrackUrls, savePlaylistOffline } from '../src/services/offlineMediaStore.ts';

describe('offlineMediaStore', () => {
  let objectURLMock: any;
  let revokeURLMock: any;
  let getRequestMock: any;
  let putRequestMock: any;
  let dbMock: any;
  let transactionMock: any;
  let objectStoreMock: any;

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

    putRequestMock = {
      onsuccess: null,
      onerror: null,
      error: undefined
    };

    objectStoreMock = {
      put: mock.fn((record: any) => {
        setTimeout(() => {
          if (putRequestMock.onerror && putRequestMock.error) {
            putRequestMock.onerror();
          } else if (putRequestMock.onsuccess) {
            putRequestMock.onsuccess();
          }
        }, 0);
        return putRequestMock;
      }),
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

    transactionMock = {
      objectStore: mock.fn(() => objectStoreMock)
    };

    dbMock = {
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

  describe('savePlaylistOffline', () => {
    it('should save playlist data with the correct structure and resolve on success', async () => {
      const key = 'test-playlist-key';
      const files: any[] = [{ id: 'file-1' }, { id: 'file-2' }];

      // mock Date.now so we can verify savedAt
      const now = 1234567890;
      const originalDateNow = Date.now;
      Date.now = () => now;

      try {
        await savePlaylistOffline(key, files);

        assert.strictEqual(dbMock.transaction.mock.callCount(), 1, 'Should create one transaction');
        assert.strictEqual(dbMock.transaction.mock.calls[0].arguments[0], 'playlists');
        assert.strictEqual(dbMock.transaction.mock.calls[0].arguments[1], 'readwrite');

        assert.strictEqual(transactionMock.objectStore.mock.callCount(), 1);
        assert.strictEqual(transactionMock.objectStore.mock.calls[0].arguments[0], 'playlists');

        const putCall = objectStoreMock.put.mock.calls[0];
        assert.ok(putCall, 'Should call store.put');

        const record = putCall.arguments[0];
        assert.strictEqual(record.key, key);
        assert.deepStrictEqual(record.files, files);
        assert.strictEqual(record.savedAt, now);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should reject if the put request fails', async () => {
      const key = 'test-playlist-key';
      const files: any[] = [];
      const errorMsg = new Error('Put failed');

      // configure put to fail
      putRequestMock.error = errorMsg;
      putRequestMock.onerror = null;

      await assert.rejects(
        savePlaylistOffline(key, files),
        (err) => err === errorMsg,
        'Should reject with the error from the request'
      );
    });
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
});
