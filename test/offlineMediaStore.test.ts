/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getOfflineTrackUrl, revokeAllOfflineTrackUrls, hydrateOfflineStatus } from '../src/services/offlineMediaStore.ts';
import type { PlayerMediaFile } from '../src/services/playerService.ts';

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
      }),
      getAllKeys: mock.fn(() => {
        setTimeout(() => {
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

  describe('hydrateOfflineStatus', () => {
    it('should return empty array if given empty array', async () => {
      getRequestMock.result = []; // mock getAllKeys result to empty
      const result = await hydrateOfflineStatus([]);
      assert.deepStrictEqual(result, []);
    });

    it('should correctly hydrate offline status for files', async () => {
      // Mock listDownloadedTrackIds returning 'track-1'
      getRequestMock.result = ['track-1'];

      const files: PlayerMediaFile[] = [
        {
          id: 'track-1',
          name: 'Track 1',
          streamUrl: 'http://localhost/track-1.mp3',
          isFolder: false,
        },
        {
          id: 'track-2',
          name: 'Track 2',
          streamUrl: 'http://localhost/track-2.mp3',
          isFolder: false,
        }
      ];

      const result = await hydrateOfflineStatus(files);

      assert.strictEqual(result.length, 2);

      // Track 1 should be downloaded
      assert.strictEqual(result[0].isDownloaded, true);
      assert.strictEqual(result[0].downloadStatus, 'downloaded');
      assert.ok(result[0].offlineUrl, 'offlineUrl should be set for downloaded track');
      assert.ok(result[0].offlineUrl!.startsWith('blob:http://localhost/'), 'offlineUrl should be a blob URL');

      // Track 2 should not be downloaded
      assert.strictEqual(result[1].isDownloaded, false);
      assert.strictEqual(result[1].downloadStatus, 'idle');
      assert.strictEqual(result[1].offlineUrl, undefined);
    });

    it('should return original files and log error if indexdb throws', async () => {
      // Temporarily mock console.error to avoid test output noise
      const originalError = console.error;
      const consoleErrorMock = mock.fn();
      console.error = consoleErrorMock;

      try {
        const error = new Error('Database Error');

        // Ensure the error is returned for openDB mock
        global.indexedDB = {
          open: mock.fn(() => {
            const req = {
              onsuccess: null,
              onerror: null,
              error: error,
            };
            setTimeout(() => {
              if (req.onerror) (req as any).onerror();
            }, 0);
            return req;
          })
        } as any;

        const files: PlayerMediaFile[] = [
          {
            id: 'track-1',
            name: 'Track 1',
            streamUrl: 'http://localhost/track-1.mp3',
            isFolder: false,
          }
        ];

        const result = await hydrateOfflineStatus(files);

        // Should return exactly the original files
        assert.deepStrictEqual(result, files);

        // Verify console.error was called
        assert.strictEqual(consoleErrorMock.mock.callCount(), 1);
        assert.strictEqual(consoleErrorMock.mock.calls[0].arguments[0], 'Failed to hydrate offline status:');
        assert.strictEqual(consoleErrorMock.mock.calls[0].arguments[1], error);

      } finally {
        console.error = originalError;
      }
    });
  });
});
