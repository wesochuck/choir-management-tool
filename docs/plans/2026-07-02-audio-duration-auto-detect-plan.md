# Automatically Detect Music Piece Duration from Uploaded Tracks — Implementation Plan

## Overview

When an audio practice track is uploaded for a music piece, extract its duration from the browser and auto-populate the piece's `duration` field. Respect manual edits and prioritize tutti tracks. A non-blocking toast and an inline hint under the field surface the auto-fill so the user knows it happened.

## Constraints

- Per-part learning tracks (`handleFileUpload` via `LearningTracksEditor`) can only be uploaded when **editing an existing, saved piece**. `MusicPieceModal.tsx:779` shows "Please save this piece first to enable learning track uploads" when `localPiece` is null — the `LearningTracksEditor` is not rendered for unsaved pieces.
- **Exception:** the **Tutti Practice Track** drop zone (`MusicPieceModal.tsx:580-620`, backed by `useMusicPieceMovements.tuttiFile`) works during **creation** (`piece === null`). `buildMusicPieceSavePayload` includes `tuttiFile` only when `!piece`. This is a valid track upload path during creation and must trigger auto-fill too.

## Behavior Rules

1. Duration auto-fill applies to **two upload paths**: (a) parent-piece track uploads via `handleFileUpload` (edit mode only), and (b) the Tutti Practice Track drop zone via `useMusicPieceMovements.tuttiFile` (works during creation). It does not apply to movement/child uploads (`handleMovementFileUpload`) — movements are separate pieces with their own duration fields.
2. Auto-fill only fires when the duration field is **currently empty** (`!duration.trim()`). If the piece already has a DB-stored duration, it is left alone unless the user clears it.
3. Once auto-filled, subsequent track uploads update the value using the rules below **until the user manually edits** the field (tracked by a `durationManuallyEdited` boolean). After a manual edit, auto-fill is skipped entirely.
4. If a **tutti** track (`voicePart === 'tutti'`) is uploaded, its duration always takes precedence over any other track's duration and **locks** the value — subsequent non-tutti tracks will not override it.
5. Otherwise, the duration is set to the **maximum** of all non-tutti track durations uploaded since the form was opened (running max, reset on form mount/reset).
6. Extracted seconds are formatted using the existing `formatSecondsToDuration()` from `src/lib/music/duration.ts`.
7. On each successful auto-fill, fire a non-blocking toast: `Duration set to {m:ss} from "{label}" track.` (label = `Tutti` when `voicePart === 'tutti'`, else the voice part string).
8. Show an inline hint under the duration field while the value is auto-filled: `Auto-detected from "{label}" track`. Clear the hint when the user manually edits the field.

## Tasks

### Task 1: Create Audio Duration Utility

**File: `src/lib/audioUtils.ts`** (new)

Extract the duration of a local audio `File` using `URL.createObjectURL()` + `HTMLAudioElement`. Returns seconds or `null` on failure (unsupported format, corrupted file). Does not throw.

```ts
export function extractAudioDuration(file: File): Promise<number | null>
```

Implementation notes:
- Resolve on the `loadedmetadata` event.
- Resolve `null` on the `error` event or timeout (30s safety).
- Call `URL.revokeObjectURL()` in both success and failure paths to avoid memory leaks.

### Task 2: Add `onTrackDurationLoaded` Callback to `useMusicPieceTracks`

**File: `src/views/admin/music-library/hooks/useMusicPieceTracks.ts`** (modify)

Add a new optional parameter to the hook (existing params at line 12-17):

```ts
export interface UseMusicPieceTracksParams {
  piece: MusicPiece | null;
  isOpen: boolean;
  onRefresh?: () => Promise<void>;
  onMovementsChanged?: () => Promise<void> | void;
  onTrackDurationLoaded?: (voicePart: string, durationSeconds: number | null) => void;
}
```

In `handleFileUpload` (line 232), fire duration extraction **in parallel** with the upload — do not `await` it before `mutateAsync`, since metadata loading would delay the upload:

```ts
const handleFileUpload = async (voicePart: string, file: File) => {
  setUploadingParts((prev) => ({ ...prev, [voicePart]: true }));
  // Fire-and-forget duration extraction alongside the upload
  extractAudioDuration(file)
    .then((d) => onTrackDurationLoaded?.(voicePart, d))
    .catch(() => onTrackDurationLoaded?.(voicePart, null));
  try {
    await uploadTrackMutation.mutateAsync({ voicePart, file });
  } finally {
    setUploadingParts((prev) => ({ ...prev, [voicePart]: false }));
  }
};
```

Do **not** add this to `handleMovementFileUpload`.

### Task 3: Implement Duration Auto-Fill Logic in `useMusicPieceForm`

**File: `src/views/admin/music-library/useMusicPieceForm.ts`** (modify)

Add state and refs for auto-fill tracking. All of this lives in `useMusicPieceForm` — **do not modify `useMusicPieceDetails`** (Task 4 from the previous draft is eliminated):

```ts
const [durationManuallyEdited, setDurationManuallyEdited] = useState(false);
const [durationAutoFillLabel, setDurationAutoFillLabel] = useState<string | null>(null);
const runningMaxDuration = useRef<number | null>(null);
const tuttiDurationLocked = useRef(false);
```

Destructure the stable setter from `details` (avoids per-render `useCallback` recreation — `details` is a fresh object every render, but `setDuration` is a stable `useState` setter):

```ts
const { setDuration } = details;
```

Expose a `handleDurationChange` wrapper for the view's `onChange` (sets value + marks manual edit + clears hint):

```ts
const handleDurationChange = useCallback(
  (value: string) => {
    setDuration(value);
    setDurationManuallyEdited(true);
    setDurationAutoFillLabel(null);
  },
  [setDuration]
);
```

Implement the auto-fill callback. Note the empty-field guard (rule 2), tutti lock (rule 4), and running max (rule 5):

```ts
const handleTrackDurationLoaded = useCallback(
  (voicePart: string, durationSeconds: number | null) => {
    if (durationManuallyEdited || durationSeconds === null) return;
    // Only auto-fill when the field is empty (rule 2)
    if (details.duration.trim() && durationAutoFillLabel === null) return;

    const isTutti = voicePart === 'tutti';
    const label = isTutti ? 'Tutti' : voicePart;

    if (isTutti) {
      setDuration(formatSecondsToDuration(durationSeconds));
      setDurationAutoFillLabel(label);
      runningMaxDuration.current = durationSeconds;
      tuttiDurationLocked.current = true;
      dialog.showToast(`Duration set to ${formatSecondsToDuration(durationSeconds)} from "${label}" track.`);
      return;
    }

    // Non-tutti: skip if a tutti has already locked the duration
    if (tuttiDurationLocked.current) return;

    const currentMax = runningMaxDuration.current ?? 0;
    if (durationSeconds > currentMax) {
      runningMaxDuration.current = durationSeconds;
      setDuration(formatSecondsToDuration(durationSeconds));
      setDurationAutoFillLabel(label);
      dialog.showToast(`Duration set to ${formatSecondsToDuration(durationSeconds)} from "${label}" track.`);
    }
  },
  [durationManuallyEdited, details.duration, durationAutoFillLabel, setDuration, dialog]
);
```

Pass `handleTrackDurationLoaded` as `onTrackDurationLoaded` to the `useMusicPieceTracks` hook call (line 140).

**Tutti-on-creation wiring:** wrap `movements.setTuttiFile` so the dropped/browsed tutti file also triggers auto-fill. The tutti file is a tutti track, so it follows rule 4 (precedence + lock):

```ts
const handleTuttiFileSelected = useCallback(
  (file: File | null) => {
    movements.setTuttiFile(file);
    if (file) {
      extractAudioDuration(file)
        .then((d) => handleTrackDurationLoaded('tutti', d))
        .catch(() => handleTrackDurationLoaded('tutti', null));
    }
  },
  [movements, handleTrackDurationLoaded]
);
```

Expose `handleTuttiFileSelected` in the returned `movements` namespace in place of the raw `setTuttiFile` for the drop zone's `onDrop` / file input's `onChange`:

```ts
movements: {
  // ... existing ...
  setTuttiFile: handleTuttiFileSelected,  // view calls this; wraps raw setter + auto-fill
  // keep raw movements.setTuttiFile internal if needed elsewhere
},
```

Reset all auto-fill state in `resetFormToEmpty` (line 205) and on piece change. Add a reset helper:

```ts
const resetDurationAutoFill = useCallback(() => {
  setDurationManuallyEdited(false);
  setDurationAutoFillLabel(null);
  runningMaxDuration.current = null;
  tuttiDurationLocked.current = false;
}, []);
```

Call `resetDurationAutoFill()` inside `resetFormToEmpty`. For piece-change reset, add a `useEffect` keyed on `piece?.id`:

```ts
useEffect(() => {
  resetDurationAutoFill();
}, [piece?.id, resetDurationAutoFill]);
```

Expose `handleDurationChange` and `durationAutoFillLabel` in the returned `details` namespace:

```ts
details: {
  // ... existing ...
  handleDurationChange,    // replaces setDuration for the input's onChange
  setDuration,             // keep for any non-input programmatic use
  durationAutoFillLabel,   // for the inline hint
},
```

### Task 4: Wire the Inline Hint and `onChange` in the Modal

**File: `src/views/admin/music-library/MusicPieceModal.tsx`** (modify)

At line 449-453, update the duration input to use `handleDurationChange` and render the hint:

```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-label">Duration</label>
  <Input
    value={duration}
    onChange={(e) => handleDurationChange(e.target.value)}
    placeholder="e.g. 3:30"
  />
  {durationAutoFillLabel && (
    <span className="text-text-muted text-[11px]">
      Auto-detected from "{durationAutoFillLabel}" track
    </span>
  )}
</div>
```

Destructure `handleDurationChange` and `durationAutoFillLabel` from the `details` namespace (around line 62-87).

The tutti drop zone (line 580-620) already calls `setTuttiFile` — since Task 3 replaces the exposed `setTuttiFile` with `handleTuttiFileSelected`, no change is needed in the drop handler itself; the wrapping happens at the form layer.

### Task 5: Tests

**File: `src/lib/audioUtils.test.ts`** (new)

- Valid audio file returns duration in seconds.
- Invalid/corrupted file returns `null`.
- Unsupported format returns `null`.
- Object URL is revoked in both success and failure paths.

**File: `test/views/admin/music-library/useMusicPieceForm.test.tsx`** (append to existing)

The existing file tests `buildMusicPieceSavePayload` and `useMusicPieceDetails` in isolation. To test the full auto-fill logic without mounting the heavy `useMusicPieceForm` hook (which requires `DialogContext`, `useEvents`, `QueryClientProvider`, and all sub-hooks), **extract the decision logic into a pure helper**:

**File: `src/views/admin/music-library/hooks/durationAutoFillLogic.ts`** (new)

```ts
export interface DurationAutoFillState {
  manuallyEdited: boolean;
  runningMax: number | null;
  tuttiLocked: boolean;
}

export function computeAutoFillDecision(
  state: DurationAutoFillState,
  currentDuration: string,
  voicePart: string,
  durationSeconds: number
): { shouldUpdate: boolean; newDuration: string; newState: DurationAutoFillState } | null;
```

Test the pure function covering:
- Empty field + non-tutti track → updates, sets running max.
- Empty field + shorter non-tutti track after a longer one → no update.
- Tutti track overrides current max even when shorter, and locks.
- After tutti lock, non-tutti track is ignored.
- `manuallyEdited === true` → returns `null` (no update).
- Non-empty DB duration (`currentDuration` non-empty, `manuallyEdited === false`, no prior auto-fill) → returns `null` (rule 2 guard).
- Tutti track on a fresh/empty field (creation flow) → updates and locks.

## Verification

### Manual

> Per-part learning tracks can only be uploaded when editing a saved piece. Create and save a piece with an empty duration first, then reopen it for editing. The Tutti Practice Track drop zone, however, works during creation.

1. **Creation flow:** Open "Add Piece" modal (empty duration). Go to the "Movements" tab and drop a Tutti MP3 (~3:10) into the "Tutti Practice Track (Optional)" zone. Verify a toast fires and the "Piece Details" tab shows `3:10` with the hint `Auto-detected from "Tutti" track`.
2. Reopen a saved piece (empty duration) for editing. Go to "Learning Tracks" tab, upload a Bass track (~2:30). Verify a toast appears, and "Piece Details" tab shows `2:30` with the hint `Auto-detected from "Bass" track`.
3. Upload a longer Tenor track (~2:35). Verify duration updates to `2:35`, hint label changes to `Tenor`, toast fires.
4. Upload a shorter Tutti track (~2:32). Verify duration snaps to `2:32` (tutti precedence), hint changes to `Tutti`, toast fires.
5. Upload another non-tutti track (~2:40). Verify duration stays `2:32` (tutti lock).
6. Manually type `4:00` into the duration field. Verify the hint disappears. Upload another track. Verify duration stays `4:00` and no toast fires (manual override respected).
7. Reopen a saved piece that already has a DB duration of `3:45`. Upload a track. Verify duration stays `3:45` and no toast fires (existing duration respected).
8. Close and reopen the modal for a different piece. Upload a track. Verify a fresh running max starts (no carryover from previous piece).

### Automated

```bash
rtk npx vitest run src/lib/audioUtils.test.ts
rtk npx vitest run test/views/admin/music-library/useMusicPieceForm.test.tsx
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
```
