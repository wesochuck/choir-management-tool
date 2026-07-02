# Duration Mismatch Detection — Implementation Plan

## Overview

Detect when a music piece's `duration` field doesn't match the duration that would be derived from its learning tracks (tutti precedence, else max of all parts). Surface the mismatch as a non-blocking inline flag under the duration field with an "Update" button. This handles stale durations, cleared durations, and tracks that were replaced — for both session-uploaded tracks and DB-existing tracks.

## Constraints

- **Parent piece only.** Mismatch detection runs for the parent piece's duration/tracks. Movement (child piece) duration fields are not checked — they're separate pieces with their own tracks.
- **Edit mode only for server fetch.** Track metadata is fetched from the server when the form opens for an existing piece with `audioTrackMapping` entries. For new pieces (creation mode), there are no server-side tracks to fetch — the auto-fill from upload (existing feature) handles that.
- **Network safety.** Uses `mapWithConcurrency` (limit 3) and `audio.preload = 'metadata'` (headers only, ~few KB per file). Silent failure on fetch errors — no flag, no blocking.

## Behavior Rules

1. On form open (edit mode, piece has `audioTrackMapping` entries), fetch each track's audio metadata from the server, compute the expected duration, and compare with the piece's `duration` field.
2. If the expected duration differs from the current `duration` (compared in seconds), show an inline flag: `Tracks suggest {m:ss}. Current: {m:ss}. [Update]`.
3. If the `duration` field is empty and tracks exist, the flag shows: `Tracks suggest {m:ss}. [Update]` (no "Current" text).
4. If the `duration` matches the expected, no flag.
5. If all track fetches fail, no flag (silent, non-blocking).
6. The comparison re-runs reactively whenever `details.duration` or the track duration cache changes.
7. Clicking "Update" sets `details.duration` to the suggested value and clears the flag.
8. On track upload, the newly extracted duration is added to the cache (no re-fetch needed — we already have it from `extractAudioDuration`).
9. On track deletion, the deleted entry is removed from the cache and the comparison re-runs.

## Tasks

### Task 1: Refactor `audioUtils.ts`

**File: `src/lib/audioUtils.ts`** (modify)

Split the existing `extractAudioDuration` into a URL-based core + File wrapper:

```ts
export function extractAudioDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('error', onError);
      audio.src = ''; // explicitly cancel the in-flight network request
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
```

Key difference from the original: the URL-based variant sets `audio.preload = 'metadata'` so the browser fetches only headers (not the full file), and there's no `URL.createObjectURL`/`revokeObjectURL` — the URL is used directly.

### Task 2: Add `computeExpectedDuration` to `durationAutoFillLogic.ts`

**File: `src/views/admin/music-library/hooks/durationAutoFillLogic.ts`** (modify)

```ts
export function computeExpectedDuration(
  trackDurations: Record<string, number | null>
): number | null {
  const entries = Object.entries(trackDurations);
  if (entries.length === 0) return null;

  // Tutti takes precedence if present and valid
  if (trackDurations['tutti'] != null) return trackDurations['tutti'];

  // Otherwise, max of all non-null durations
  const valid = Object.values(trackDurations).filter(
    (d): d is number => d != null
  );
  if (valid.length === 0) return null;
  return Math.max(...valid);
}
```

This is a pure function — separate from `computeAutoFillDecision` (which handles the auto-fill update logic with manual-edit guards and tutti locking). `computeExpectedDuration` simply computes what the duration *should* be from the tracks, without any state guards.

### Task 3: Track duration cache + mismatch detection in `useMusicPieceForm`

**File: `src/views/admin/music-library/useMusicPieceForm.ts`** (modify)

**New imports:**
```ts
import { pb } from '../../../lib/pocketbase';
import { mapWithConcurrency } from '../../../lib/networkSafety';
import { parseDurationToSeconds, formatSecondsToDuration } from '../../../lib/musicPieceUtils';
import { computeExpectedDuration } from './hooks/durationAutoFillLogic';
import { extractAudioDurationFromUrl } from '../../../lib/audioUtils';
```

**New state:**
```ts
const trackDurationCache = useRef<Map<string, number | null>>(new Map());
const [durationMismatch, setDurationMismatch] = useState<{
  suggested: string;
  current: string;
} | null>(null);
```

**On form open — fetch track durations from server:**

Add a `useEffect` keyed on `piece` and `isOpen`, guarded by a ref to avoid re-fetching for the same piece ID:

```ts
const lastFetchedPieceId = useRef<string | null>(null);

useEffect(() => {
  if (!piece || !isOpen) return;
  // Guard: only fetch once per piece ID, even if the piece object reference changes
  if (lastFetchedPieceId.current === piece.id) return;
  lastFetchedPieceId.current = piece.id;

  const mapping = piece.audioTrackMapping || {};
  const entries = Object.entries(mapping).filter(([_, filename]) => filename);
  if (entries.length === 0) {
    trackDurationCache.current = new Map();
    return;
  }

  let cancelled = false;
  const urls = entries.map(([voicePart, filename]) => ({
    voicePart,
    url: pb.files.getURL(piece, filename),
  }));

  mapWithConcurrency(
    urls,
    async ({ voicePart, url }) => {
      const duration = await extractAudioDurationFromUrl(url);
      if (!cancelled) {
        trackDurationCache.current.set(voicePart, duration);
      }
    },
    { concurrency: 3 }
  ).then(() => {
    if (!cancelled) {
      // Trigger re-comparison by updating a tick state
      setMismatchCheckTick((t) => t + 1);
    }
  });

  return () => {
    cancelled = true;
  };
}, [piece, isOpen]);
```

Note: `mapWithConcurrency` signature is `(items, mapper, options?: { concurrency?: number })` — concurrency goes in the options object, not as a positional arg. The `lastFetchedPieceId` ref guard prevents re-fetching when the parent re-renders with a new `piece` object reference for the same piece. Cache updates from uploads/deletes are handled separately, so the initial fetch only needs to run once per piece. A `setMismatchCheckTick` state counter forces re-evaluation of the `useMemo`/`useEffect` below.

**Mismatch comparison** (`useMemo` for the pure computation, `useEffect` for the side-effectful state update):

```ts
const [mismatchCheckTick, setMismatchCheckTick] = useState(0); // forces re-eval after async fetch

// Pure: compute expected duration from cache
const expectedDurationSeconds = useMemo(() => {
  const cacheObj: Record<string, number | null> = {};
  trackDurationCache.current.forEach((v, k) => {
    cacheObj[k] = v;
  });
  return computeExpectedDuration(cacheObj);
}, [mismatchCheckTick, details.duration]); // re-eval on tick or duration change

// Side-effect: update mismatch state when expected vs. current changes
useEffect(() => {
  if (expectedDurationSeconds === null) {
    setDurationMismatch(null);
    return;
  }
  const currentSeconds = parseDurationToSeconds(details.duration);
  const currentStr = details.duration.trim();
  const suggestedStr = formatSecondsToDuration(expectedDurationSeconds);

  if (currentSeconds === expectedDurationSeconds) {
    setDurationMismatch(null);
    return;
  }

  setDurationMismatch({
    suggested: suggestedStr,
    current: currentStr,
  });
}, [expectedDurationSeconds, details.duration]);
```

Using `useEffect` (not `useMemo`) for the state update — `useMemo` is for pure computation only; React may call it multiple times during render and calling `setState` inside it is an anti-pattern that can cause warnings or render loops.

**On track upload — update cache:**

In `handleTrackDurationLoaded`, after setting the duration (or even when skipping the auto-fill), add the extracted duration to the cache so the mismatch check has the latest data:

```ts
const handleTrackDurationLoaded = useCallback(
  (voicePart: string, durationSeconds: number | null) => {
    // Update cache regardless of whether we auto-fill
    trackDurationCache.current.set(voicePart, durationSeconds);
    setMismatchCheckTick((t) => t + 1);

    // ... existing auto-fill logic ...
  },
  [/* existing deps */]
);
```

**On track deletion — remove from cache:**

Add an `onTrackDeleted` callback to `useMusicPieceTracks` params, or watch `localPiece.audioTrackMapping` changes. The simplest approach: add an `onTrackDeleted?: (voicePart: string) => void` callback to `UseMusicPieceTracksParams`, called in `handleFileDelete` after the deletion mutation succeeds:

```ts
// In useMusicPieceTracks.ts handleFileDelete:
onTrackDeleted?.(voicePart);
```

Then in `useMusicPieceForm`:

```ts
const handleTrackDeleted = useCallback((voicePart: string) => {
  trackDurationCache.current.delete(voicePart);
  setMismatchCheckTick((t) => t + 1);
}, []);

// Pass to useMusicPieceTracks:
const tracks = useMusicPieceTracks({
  ...,
  onTrackDurationLoaded: handleTrackDurationLoaded,
  onTrackDeleted: handleTrackDeleted,
});
```

**On piece change — clear cache:**

In the existing `resetDurationAutoFill` or the piece-change `useEffect`:

```ts
useEffect(() => {
  resetDurationAutoFill();
  trackDurationCache.current = new Map();
  setDurationMismatch(null);
  lastFetchedPieceId.current = null; // allow re-fetch when reopening the same piece
}, [piece?.id, resetDurationAutoFill]);
```

**"Update" button handler:**

```ts
const handleAcceptMismatchDuration = useCallback(() => {
  if (durationMismatch) {
    setDuration(durationMismatch.suggested);
    setDurationMismatch(null);
  }
}, [durationMismatch, setDuration]);
```

**Expose in return object:**

Add `durationMismatch` and `handleAcceptMismatchDuration` to the `details` namespace.

### Task 4: UI flag in `MusicPieceModal.tsx`

**File: `src/views/admin/music-library/MusicPieceModal.tsx`** (modify)

Destructure `durationMismatch` and `handleAcceptMismatchDuration` from `details`.

Under the duration field, after the auto-fill hint, add the mismatch flag:

```tsx
{durationAutoFillLabel && (
  <span className="text-text-muted text-[11px]">
    Auto-detected from &ldquo;{durationAutoFillLabel}&rdquo; track
  </span>
)}
{durationMismatch && (
  <span className="text-amber-600 text-[11px]">
    Tracks suggest {durationMismatch.suggested}.
    {durationMismatch.current && ` Current: ${durationMismatch.current}.`}{' '}
    <button
      type="button"
      className="text-primary font-bold underline"
      onClick={handleAcceptMismatchDuration}
    >
      Update
    </button>
  </span>
)}
```

### Task 5: Tests

**File: `src/views/admin/music-library/hooks/durationAutoFillLogic.test.ts`** (new or appended to existing form test file)

Test `computeExpectedDuration`:
- Tutti present + valid → returns tutti duration (ignores others).
- Tutti present but null → falls through to max of others.
- No tutti, multiple parts → returns max.
- No tutti, one part → returns that part.
- Empty record → returns `null`.
- All values null → returns `null`.

**File: `test/lib/audioUtils.test.tsx`** (append)

Test `extractAudioDurationFromUrl`:
- Resolves with rounded duration on `loadedmetadata`.
- Resolves `null` on `error` event.
- Resolves `null` on timeout.
- Sets `preload = 'metadata'` on the audio element.

## Verification

### Manual

1. Open an existing piece with tracks and a matching duration (e.g., tracks suggest 3:10, duration is 3:10). Verify no mismatch flag.
2. Open an existing piece with tracks and a non-matching duration (e.g., tracks suggest 3:10, duration is 3:45). Verify the amber flag shows: `Tracks suggest 3:10. Current: 3:45. [Update]`.
3. Click "Update". Verify the duration field changes to `3:10` and the flag disappears.
4. Clear the duration field entirely. Verify the flag shows: `Tracks suggest 3:10. [Update]` (no "Current" text).
5. Click "Update". Verify the duration is re-populated to `3:10`.
6. Upload a new track with a different duration. Verify the cache updates and the flag re-evaluates.
7. Delete a track. Verify the cache updates and the flag re-evaluates (e.g., if tutti was deleted, the suggested duration falls back to max of remaining parts).
8. Open a piece with no tracks. Verify no flag.
9. Open a piece with tracks but all fetches fail (e.g., network error). Verify no flag (silent failure).

### Automated

```bash
rtk npx vitest run test/lib/audioUtils.test.tsx
rtk npx vitest run test/views/admin/music-library/useMusicPieceForm.test.tsx
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
```
