/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getOfflineTrackUrl } from '../src/services/offlineMediaStore.ts';

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

  it('getOfflineTrackUrl should return a URL for a downloaded track', async () => {
    const url = await getOfflineTrackUrl('track-1');
    assert.ok(url, 'Should return a url for track-1');
    assert.strictEqual(objectURLMock.mock.callCount(), 1, 'createObjectURL should have been called once');
  });
});
