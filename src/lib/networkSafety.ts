export interface Retry429Options {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export interface MapWithConcurrencyOptions {
  concurrency?: number;
}

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 4000;
const DEFAULT_JITTER_RATIO = 0.2;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const readNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const getHttpStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const asRecord = error as Record<string, unknown>;

  const directStatus = readNumber(asRecord.status);
  if (directStatus !== null) return directStatus;

  const dataStatus =
    asRecord.data && typeof asRecord.data === 'object'
      ? readNumber((asRecord.data as Record<string, unknown>).status)
      : null;
  if (dataStatus !== null) return dataStatus;

  const responseStatus =
    asRecord.response && typeof asRecord.response === 'object'
      ? readNumber((asRecord.response as Record<string, unknown>).status)
      : null;
  if (responseStatus !== null) return responseStatus;

  return null;
};

export const isRateLimitError = (error: unknown): boolean => {
  const status = getHttpStatus(error);
  if (status === 429) return true;

  if (error instanceof Error) {
    return /\b429\b|rate\s*limit/i.test(error.message);
  }

  return false;
};

const jitterDelay = (delayMs: number, jitterRatio: number, random: () => number): number => {
  if (jitterRatio <= 0) return delayMs;
  const spread = Math.max(0, delayMs * jitterRatio);
  const offset = (random() * 2 - 1) * spread;
  return Math.max(0, Math.round(delayMs + offset));
};

export async function retryOn429<T>(
  run: () => Promise<T>,
  options: Retry429Options = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;
  const shouldRetry = options.shouldRetry ?? isRateLimitError;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  let attempt = 0;

  // @allow-sequential-await - Retry loops are inherently sequential by design.
  while (true) {
    try {
      return await run();
    } catch (error: unknown) {
      if (!shouldRetry(error) || attempt >= maxRetries) {
        throw error;
      }

      const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delayMs = jitterDelay(expDelay, jitterRatio, random);
      attempt += 1;
      options.onRetry?.(attempt, delayMs, error);
      await sleep(delayMs);
    }
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  options: MapWithConcurrencyOptions = {}
): Promise<R[]> {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 4));
  const results: R[] = new Array(items.length);

  let nextIndex = 0;

  const worker = async () => {
    // @allow-sequential-await - Concurrency worker queues sequentially process items one by one.
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += safeChunkSize) {
    chunks.push(items.slice(i, i + safeChunkSize));
  }

  return chunks;
}
