const TIMEOUT_MS = 30_000;

export function extractAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('error', onError);
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
