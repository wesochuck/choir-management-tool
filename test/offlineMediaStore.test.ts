/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

const originalCreateObjectURL = globalThis.URL?.createObjectURL;
const originalRevokeObjectURL = globalThis.URL?.revokeObjectURL;
const originalIndexedDB = globalThis.indexedDB;

const mockCreateObjectURL = mock.fn(() => 'blob:test-url');
const mockRevokeObjectURL = mock.fn();

(globalThis.URL as any).createObjectURL = mockCreateObjectURL;
(globalThis.URL as any).revokeObjectURL = mockRevokeObjectURL;

const mockObjectStore = {
  get: mock.fn(),
};

const mockTransaction = {
  objectStore: mock.fn(() => mockObjectStore),
};

const mockDB = {
  objectStoreNames: { contains: () => true },
  transaction: mock.fn(() => mockTransaction),
};

(globalThis as any).indexedDB = {
  open: mock.fn(() => {
    const request: any = {};
    setTimeout(() => {
      request.result = mockDB;
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }),
};

// Dynamic import so indexedDB is available at initialization
const { getOfflineTrackUrl, revokeOfflineTrackUrl, revokeAllOfflineTrackUrls } = await import('../src/services/offlineMediaStore.ts');

describe('offlineMediaStore - revokeOfflineTrackUrl', () => {
  after(() => {
    // Restore global variables
    if (originalCreateObjectURL !== undefined) {
      (globalThis.URL as any).createObjectURL = originalCreateObjectURL;
    } else {
      delete (globalThis.URL as any).createObjectURL;
    }

    if (originalRevokeObjectURL !== undefined) {
      (globalThis.URL as any).revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete (globalThis.URL as any).revokeObjectURL;
    }

    if (originalIndexedDB !== undefined) {
      (globalThis as any).indexedDB = originalIndexedDB;
    } else {
      delete (globalThis as any).indexedDB;
    }
  });

  beforeEach(() => {
    mockCreateObjectURL.mock.resetCalls();
    mockRevokeObjectURL.mock.resetCalls();
    mockObjectStore.get.mock.resetCalls();
    revokeAllOfflineTrackUrls();
    mockRevokeObjectURL.mock.resetCalls(); // reset again since revokeAllOfflineTrackUrls might call it if there were left overs
  });

  it('revokeOfflineTrackUrl should revoke URL and delete from map', async () => {
    // 1. Setup indexedDB get to return a record
    mockObjectStore.get.mock.mockImplementation(() => {
      const request: any = {};
      setTimeout(() => {
        request.result = { blob: new Blob(['test']) };
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    // 2. Fetch the URL to populate the activeUrls map
    const url = await getOfflineTrackUrl('track-1');
    assert.equal(url, 'blob:test-url');
    assert.equal(mockCreateObjectURL.mock.callCount(), 1);

    // 3. Call revokeOfflineTrackUrl
    revokeOfflineTrackUrl('track-1');

    // 4. Verify URL.revokeObjectURL was called with the correct url
    assert.equal(mockRevokeObjectURL.mock.callCount(), 1);
    assert.equal(mockRevokeObjectURL.mock.calls[0].arguments[0], 'blob:test-url');

    // 5. Verify the map was cleared by fetching again and checking it hits DB
    mockObjectStore.get.mock.resetCalls();
    mockCreateObjectURL.mock.resetCalls();

    await getOfflineTrackUrl('track-1');
    assert.equal(mockObjectStore.get.mock.callCount(), 1);
    assert.equal(mockCreateObjectURL.mock.callCount(), 1);
  });

  it('revokeOfflineTrackUrl should do nothing if trackId is not in map', () => {
    revokeOfflineTrackUrl('non-existent-track');
    assert.equal(mockRevokeObjectURL.mock.callCount(), 0);
  });
});
