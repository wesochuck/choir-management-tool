/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getOfflineTrackUrl, revokeAllOfflineTrackUrls, downloadTrack } from '../src/services/offlineMediaStore.ts';

describe('offlineMediaStore', () => {
  let objectURLMock: any;
  let revokeURLMock: any;
  let getRequestMock: any;
  let putRequestMock: any;
  let fetchMock: any;
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;

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
      put: mock.fn(() => {
        setTimeout(() => {
          if (putRequestMock.onsuccess) putRequestMock.onsuccess();
        }, 0);
        return putRequestMock;
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
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  describe('downloadTrack', () => {
    it('should throw an error if track has no streamUrl', async () => {
      const track = { id: 'test', name: 'Test', streamUrl: '' } as any;
      await assert.rejects(
        () => downloadTrack(track),
        /Track has no streamUrl/
      );
    });

    it('should throw an error if fetch fails', async () => {
      const track = { id: 'test', name: 'Test', streamUrl: 'http://test.url' } as any;
      global.fetch = mock.fn(() => Promise.resolve({
        ok: false,
        statusText: 'Not Found'
      } as Response));

      await assert.rejects(
        () => downloadTrack(track),
        /Failed to fetch audio stream: Not Found/
      );
    });

    it('should download track using response.blob() when no reader is available and call onProgress', async () => {
      const track = { id: 'test', name: 'Test', streamUrl: 'http://test.url' } as any;
      const progressMock = mock.fn();

      const dummyBlob = new Blob(['dummy'], { type: 'audio/mpeg' });
      global.fetch = mock.fn(() => Promise.resolve({
        ok: true,
        headers: new Headers({
          'content-length': '5',
          'content-type': 'audio/mpeg'
        }),
        body: null, // no reader
        blob: () => Promise.resolve(dummyBlob)
      } as any));

      await downloadTrack(track, progressMock);

      assert.strictEqual(progressMock.mock.callCount(), 1, 'onProgress should be called once');
      assert.deepStrictEqual(progressMock.mock.calls[0].arguments, [100], 'onProgress should be called with 100');
    });

    it('should download track using reader when available and trigger onProgress', async () => {
      const track = { id: 'test', name: 'Test', streamUrl: 'http://test.url' } as any;
      const progressMock = mock.fn();

      const chunks = [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4, 5])
      ];

      let chunkIndex = 0;
      const readerMock = {
        read: mock.fn(() => {
          if (chunkIndex < chunks.length) {
            return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
          }
          return Promise.resolve({ done: true, value: undefined });
        })
      };

      global.fetch = mock.fn(() => Promise.resolve({
        ok: true,
        headers: new Headers({
          'content-length': '5',
          'content-type': 'audio/mpeg'
        }),
        body: {
          getReader: () => readerMock
        }
      } as any));

      await downloadTrack(track, progressMock);

      assert.strictEqual(readerMock.read.mock.callCount(), 3, 'reader.read should be called 3 times (2 chunks + 1 done)');
      assert.strictEqual(progressMock.mock.callCount(), 2, 'onProgress should be called for each chunk');
      assert.deepStrictEqual(progressMock.mock.calls[0].arguments, [40], 'onProgress should report 40% after first chunk');
      assert.deepStrictEqual(progressMock.mock.calls[1].arguments, [100], 'onProgress should report 100% after second chunk');
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
