import type { PlayerMediaFile } from './playerService';

interface OfflineTrackRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  downloadedAt: number;
  streamUrl: string;
}

interface OfflinePlaylistRecord {
  key: string; // token or eventId
  files: PlayerMediaFile[];
  savedAt: number;
}

const DB_NAME = 'choir-offline-db';
const DB_VERSION = 1;
const STORE_PLAYLISTS = 'playlists';
const STORE_TRACKS = 'tracks';

const activeUrls = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlaylistOffline(
  key: string,
  files: PlayerMediaFile[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = transaction.objectStore(STORE_PLAYLISTS);

    const record: OfflinePlaylistRecord = {
      key,
      files,
      savedAt: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflinePlaylist(
  key: string
): Promise<PlayerMediaFile[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = transaction.objectStore(STORE_PLAYLISTS);

    const request = store.get(key);
    request.onsuccess = () => {
      const record = request.result as OfflinePlaylistRecord | undefined;
      resolve(record ? record.files : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function downloadTrack(
  track: PlayerMediaFile,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (!track.streamUrl) {
    throw new Error('Track has no streamUrl');
  }

  const response = await fetch(track.streamUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio stream: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  const mimeType = response.headers.get('content-type') || 'audio/mpeg';

  const reader = response.body?.getReader();
  let blob: Blob;

  if (reader) {
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    // @allow-sequential-await - Reading chunk by chunk from the stream reader must be sequential.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (totalBytes > 0 && onProgress) {
          onProgress(Math.round((receivedBytes / totalBytes) * 100));
        }
      }
    }
    blob = new Blob(chunks as unknown as BlobPart[], { type: mimeType });
  } else {
    blob = await response.blob();
    if (onProgress) onProgress(100);
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readwrite');
    const store = transaction.objectStore(STORE_TRACKS);

    const record: OfflineTrackRecord = {
      id: track.id,
      name: track.name,
      mimeType,
      size: blob.size,
      blob,
      downloadedAt: Date.now(),
      streamUrl: track.streamUrl,
    };

    const request = store.put(record);
    request.onsuccess = () => {
      revokeOfflineTrackUrl(track.id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineTrackUrl(trackId: string): Promise<string | null> {
  if (activeUrls.has(trackId)) {
    return activeUrls.get(trackId)!;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readonly');
    const store = transaction.objectStore(STORE_TRACKS);

    const request = store.get(trackId);
    request.onsuccess = () => {
      const record = request.result as OfflineTrackRecord | undefined;
      if (!record || !record.blob) {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(record.blob);
      activeUrls.set(trackId, url);
      resolve(url);
    };
    request.onerror = () => reject(request.error);
  });
}

function revokeOfflineTrackUrl(trackId: string): void {
  const url = activeUrls.get(trackId);
  if (url) {
    URL.revokeObjectURL(url);
    activeUrls.delete(trackId);
  }
}

export function revokeAllOfflineTrackUrls(): void {
  for (const url of activeUrls.values()) {
    URL.revokeObjectURL(url);
  }
  activeUrls.clear();
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readwrite');
    const store = transaction.objectStore(STORE_TRACKS);

    const request = store.delete(trackId);
    request.onsuccess = () => {
      revokeOfflineTrackUrl(trackId);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

async function listDownloadedTrackIds(): Promise<Set<string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readonly');
    const store = transaction.objectStore(STORE_TRACKS);

    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result as string[];
      resolve(new Set(keys));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function hydrateOfflineStatus(files: PlayerMediaFile[]): Promise<PlayerMediaFile[]> {
  try {
    const downloadedIds = await listDownloadedTrackIds();
    const hydrated = await Promise.all(
      files.map(async (file) => {
        const isDownloaded = downloadedIds.has(file.id);
        const offlineUrl = isDownloaded ? (await getOfflineTrackUrl(file.id) || undefined) : undefined;
        
        return {
          ...file,
          isDownloaded,
          offlineUrl,
          downloadStatus: isDownloaded ? ('downloaded' as const) : ('idle' as const),
        };
      })
    );
    return hydrated;
  } catch (err: unknown) {
    console.error('Failed to hydrate offline status:', err);
    return files;
  }
}

export async function clearAllDownloads(): Promise<void> {
  revokeAllOfflineTrackUrls();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
    const tracksStore = transaction.objectStore(STORE_TRACKS);
    const playlistsStore = transaction.objectStore(STORE_PLAYLISTS);

    const req1 = tracksStore.clear();
    const req2 = playlistsStore.clear();

    let count = 0;
    const checkDone = () => {
      count++;
      if (count === 2) resolve();
    };

    req1.onsuccess = checkDone;
    req2.onsuccess = checkDone;

    req1.onerror = () => reject(req1.error);
    req2.onerror = () => reject(req2.error);
  });
}
