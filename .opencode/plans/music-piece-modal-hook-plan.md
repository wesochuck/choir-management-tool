# MusicPieceModal Hook Extraction Plan

**File**: `src/views/admin/music-library/MusicPieceModal.tsx` (1669 lines)

## Strategy

Extract all form state, queries, effects, memos, and handlers into a single custom hook `useMusicPieceForm`. The component retains the props interface, Modal wrapper, tab bar, and render JSX.

Follows codebase convention: flat return, raw setters exposed, `is*` booleans, `handle*`/`toggle*`/`refresh` handlers.

## What Goes in the Hook (~700 lines)

### State (~30 `useState` vars)

| Group               | Variables                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic fields        | `title`, `composer`, `arranger`, `duration`, `copies`, `catalogId`, `sectionBuckets`, `selectedGenres`, `selectedPerformanceIds`, `notes`, `purchaseDateInput`, `suggestedDuration` |
| Tab                 | `activeTab`                                                                                                                                                                         |
| Audio               | `localPiece`, `voiceParts`, `sections`, `uploadingParts`, `manuallyAddedParts`                                                                                                      |
| Performances        | `allPerformances`, `venues`, `showQuickAdd`                                                                                                                                         |
| Quick add           | `quickTitle`, `quickDate`, `quickVenue`                                                                                                                                             |
| Movements           | `movements`, `isMultiMovement`, `newMovementTitle`, `newMovementDuration`, `expandedMovementId`                                                                                     |
| Staging (new piece) | `isMultiMovementInput`, `localMovementsList`, `tuttiFile`, `isTuttiDraggedOver`, `stagingMovTitle`, `stagingMovDuration`                                                            |

### Queries (lines 147–172)

- `quickAddPerformanceMutation`, `updateEventMutation`
- `venuesQuery`, `voicePartsQuery`

### Effects (lines 174–296)

- Load `allPerformances` from `modalEvents` on open
- Load venues/voice parts from query data
- Auto-set movement numbers
- `loadMovements` on piece change
- Focus title input on open
- Full form initialization on `piece`/`isOpen` change

### Memos (lines 86–96, 298–380, 878–888)

- `uniquePeople`, `uniqueComposers`, `uniqueArrangers`
- `isDirty` (~80 lines)
- `selectedPerformances`, `availablePerformances`
- `parentPiece`

### Handlers (lines 382–888, ~510 lines)

- `handleClose` (dialog confirm + `onClose()`)
- `handleAddStagingMovement`, `handleRemoveStagingMovement`
- `handleFileUpload` (~75 lines — audio upload + duration detection)
- `handleFileDelete`, `handleMovementFileUpload`, `handleMovementFileDelete`
- `handleAddPart`
- `handleDeleteMovement`, `handleAddMovement`
- `handleCreateGenreInline`
- `parsePurchaseDateInput`, `buildSavePayload`
- `handleSubmit`, `resetFormToEmpty`, `handleSaveAndAddAnother`
- `handleQuickAddPerformance`, `togglePerformance`

## What Stays in the Component (~800 lines)

### Render-only concerns

- `MusicPieceModalProps` interface (public API stays with component)
- Modal wrapper, tab bar, all 4 tab JSX sections
- `titleInputRef` (created in component, returned by hook)
- `isSaving` prop (passed directly to Modal footer buttons)

### Props the hook consumes directly

`isOpen`, `piece`, `onClose`, `onSave`, `onSaveAndAddAnother`, `onRefresh`, `allPieces`, `allGenres`, `initialTitle`, `onCreateGenre`, `initialTab`, `catalogLookupTemplate`

### Props that stay in the component only

`onDelete` (used in footer conditional + inline `onClick`), `isSaving` (button disabled/loading)

## Hook Interface

```ts
interface UseMusicPieceFormParams {
  isOpen: boolean;
  piece: MusicPiece | null;
  onClose: () => void;
  onSave: MusicPieceModalProps['onSave'];
  onSaveAndAddAnother?: MusicPieceModalProps['onSaveAndAddAnother'];
  onRefresh?: () => Promise<void>;
  allPieces?: MusicPiece[];
  allGenres: MusicGenreDef[];
  initialTitle?: string;
  onCreateGenre?: (label: string) => Promise<MusicGenreDef>;
  initialTab?: 'details' | 'tracks' | 'performances' | 'movements';
  catalogLookupTemplate?: string;
}
```

Returns flat object (~45 values) — state values, raw setters, `isDirty`, `handle*` handlers, query results.

## Result

| File                         | Before   | After     |
| ---------------------------- | -------- | --------- |
| `MusicPieceModal.tsx`        | 1669     | ~900      |
| `useMusicPieceForm.ts` (new) | —        | ~700      |
| **Total**                    | **1669** | **~1600** |

Net code ~neutral. Benefits:

- Form logic independently testable
- Component is render-only, easier to navigate
- Hook can be further sub-split later

## Implementation Order

1. Create `useMusicPieceForm.ts` in `src/hooks/` — extract state/effects/memos/handlers/queries
2. Update `MusicPieceModal.tsx` — call hook, destructure return, keep render JSX unchanged
3. Verify: `npm run typecheck`, `npm run lint`, check related test files
