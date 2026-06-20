import type { PlayerMediaFile } from '../services/playerService';

/**
 * Extracts the file extension from a URL path, defaulting to 'mp3'.
 */
export function getFileExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : 'mp3';
  } catch {
    return 'mp3';
  }
}

/**
 * Generates a safe, sanitized filename for downloading the track, preserving the original extension.
 */
export function getSafeDownloadFilename(track: PlayerMediaFile): string {
  const baseName = track.name || 'audio-track';

  // Filter out control characters (codes < 32) and illegal characters for OS filenames
  const illegalChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
  const sanitized = Array.from(baseName)
    .filter((char) => {
      const code = char.charCodeAt(0);
      if (code < 32) return false;
      return !illegalChars.includes(char);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  const extension = track.streamUrl ? getFileExtensionFromUrl(track.streamUrl) : 'mp3';

  return `${sanitized || 'audio-track'}.${extension}`;
}

/**
 * Triggers a browser download for a single track file.
 *
 * Browser note: the `download` attribute may be ignored for cross-origin URLs unless
 * the server allows it. In that case the browser may open the file instead. If we need
 * guaranteed attachment downloads later, route this through a backend endpoint that
 * sets Content-Disposition: attachment.
 */
export function downloadRawFile(track: PlayerMediaFile): void {
  if (!track.streamUrl) {
    console.warn('Cannot download file without streamUrl', track);
    return;
  }

  const link = document.createElement('a');
  link.href = track.streamUrl;
  link.download = getSafeDownloadFilename(track);
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers browser downloads for multiple track files sequentially.
 */
export async function downloadRawFiles(tracks: PlayerMediaFile[]): Promise<void> {
  const downloadableTracks = tracks.filter((track) => !track.isFolder && track.streamUrl);

  for (const track of downloadableTracks) {
    downloadRawFile(track);
    // @allow-sequential-await - Browser file downloads should be triggered one at a time to reduce popup/download blocking.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
