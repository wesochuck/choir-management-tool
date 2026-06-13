/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getOfflineTrackUrl, revokeAllOfflineTrackUrls, getOfflinePlaylist } from '../src/services/offlineMediaStore.ts';

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
      result: undefined,
      error: undefined,
      forceError: false
    };

    const objectStoreMock = {
      get: mock.fn((key: string) => {
        // Return our mock request. In the test, we'll manually trigger onsuccess
        // using setTimeout to simulate async behavior of IDBRequest
        setTimeout(() => {
          if (getRequestMock.forceError) {
            if (getRequestMock.onerror) getRequestMock.onerror();
            return;
          }
          // Setup default result for tracks if no custom result was provided by a test
          if (getRequestMock.result === undefined) {
            getRequestMock.result = {
              id: key,
              blob: new Blob(['dummy audio data'], { type: 'audio/mpeg' }),
            };
          }
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

  describe('getOfflinePlaylist', () => {
    it('should return files array when playlist exists', async () => {
      const mockFiles = [{ id: 'f1', name: 'File 1' }];
      getRequestMock.result = {
        key: 'playlist-1',
        files: mockFiles,
        savedAt: Date.now()
      };

      const result = await getOfflinePlaylist('playlist-1');
      assert.deepStrictEqual(result, mockFiles, 'Should return the files array from the record');
    });

    it('should return null when playlist does not exist', async () => {
      getRequestMock.result = null;

      const result = await getOfflinePlaylist('missing-playlist');
      assert.strictEqual(result, null, 'Should return null for missing record');
    });

    it('should reject with the request error when an error occurs', async () => {
      getRequestMock.forceError = true;
      const expectedError = new Error('IndexedDB read failed');
      getRequestMock.error = expectedError;

      await assert.rejects(
        getOfflinePlaylist('playlist-error'),
        expectedError,
        'Should reject with the error from the request'
      );
    });
  });
});
