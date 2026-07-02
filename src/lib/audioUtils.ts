const TIMEOUT_MS = 30_000;

export function extractAudioDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, TIMEOUT_MS);

    const onMetadata = () => {
      clearTimeout(timeout);
      const duration = audio.duration;
      cleanup();
      if (isFinite(duration) && duration > 0) {
        resolve(Math.round(duration));
      } else {
        resolve(null);
      }
    };

    const onError = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('error', onError);
    audio.src = url;
    audio.load();
  });
}

export function extractAudioDuration(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  return extractAudioDurationFromUrl(url).finally(() => URL.revokeObjectURL(url));
}
