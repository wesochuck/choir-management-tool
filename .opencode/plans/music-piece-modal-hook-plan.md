# MusicPieceModal Hook Extraction Plan

**File**: `src/views/admin/music-library/MusicPieceModal.tsx` (1669 lines)

## Strategy

Separate form behavior from render JSX by extracting into a feature-local hook with grouped return values.

Avoid a flat god hook — use sub-objects to group related state, handlers, and derived values. This makes future internal split into smaller hooks easier.

## Hook Location

`src/views/admin/music-library/useMusicPieceForm.ts`

Feature-local, not global `src/hooks/`. Tightly coupled to this modal.

## Hook Parameters

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

`onDelete` and `isSaving` stay in the component (footer render concerns).

## Hook Return Shape (grouped)

```ts
{
  refs: {
    titleInputRef;
  }
  state: {
    (activeTab, setActiveTab, isDirty);
  }
  details: {
    (title,
      setTitle,
      composer,
      setComposer,
      arranger,
      setArranger,
      duration,
      setDuration,
      copies,
      setCopies,
      catalogId,
      setCatalogId,
      sectionBuckets,
      setSectionBuckets,
      selectedGenres,
      setSelectedGenres,
      notes,
      setNotes,
      purchaseDateInput,
      setPurchaseDateInput,
      suggestedDuration,
      setSuggestedDuration,
      uniqueComposers,
      uniqueArrangers,
      parentPiece,
      handleCreateGenreInline);
  }
  tracks: {
    (localPiece,
      voiceParts,
      sections,
      uploadingParts,
      manuallyAddedParts,
      setManuallyAddedParts,
      handleFileUpload,
      handleFileDelete,
      handleMovementFileUpload,
      handleMovementFileDelete,
      handleAddPart);
  }
  performances: {
    (allPerformances,
      venues,
      selectedPerformanceIds,
      selectedPerformances,
      availablePerformances,
      showQuickAdd,
      setShowQuickAdd,
      quickTitle,
      setQuickTitle,
      quickDate,
      setQuickDate,
      quickVenue,
      setQuickVenue,
      handleQuickAddPerformance,
      togglePerformance);
  }
  movements: {
    (movements,
      isMultiMovement,
      setIsMultiMovement,
      newMovementTitle,
      setNewMovementTitle,
      newMovementDuration,
      setNewMovementDuration,
      expandedMovementId,
      setExpandedMovementId,
      isMultiMovementInput,
      setIsMultiMovementInput,
      localMovementsList,
      stagingMovTitle,
      setStagingMovTitle,
      stagingMovDuration,
      setStagingMovDuration,
      tuttiFile,
      setTuttiFile,
      isTuttiDraggedOver,
      setIsTuttiDraggedOver,
      handleAddStagingMovement,
      handleRemoveStagingMovement,
      handleAddMovement,
      handleDeleteMovement);
  }
  actions: {
    (handleClose, handleSubmit, handleSaveAndAddAnother);
  }
}
```

## Moves Into the Hook

### State (~30 useState vars)

- Basic fields: title, composer, arranger, duration, copies, catalogId, sectionBuckets, selectedGenres, selectedPerformanceIds, notes, purchaseDateInput, suggestedDuration
- Tab: activeTab
- Audio: localPiece, voiceParts, sections, uploadingParts, manuallyAddedParts
- Performances: allPerformances, venues, showQuickAdd
- Quick-add: quickTitle, quickDate, quickVenue
- Movements: movements, isMultiMovement, newMovementTitle, newMovementDuration, expandedMovementId
- New-piece staging: isMultiMovementInput, localMovementsList, tuttiFile, isTuttiDraggedOver, stagingMovTitle, stagingMovDuration

### Queries

- `useEvents()` (via `modalEvents`)
- `venuesQuery`, `voicePartsQuery`
- `quickAddPerformanceMutation`, `updateEventMutation`

### Effects

- Load performances from modalEvents
- Load venues/voice parts from query data
- Auto-set movement numbering
- Load movements on piece change
- Form init/reset on piece/isOpen/initialTitle/initialTab/modalEvents
- Focus title input (hook owns the ref)

### Memos

- uniquePeople, uniqueComposers, uniqueArrangers
- parentPiece
- isDirty
- selectedPerformances, availablePerformances

### Handlers

handleClose, handleAddStagingMovement, handleRemoveStagingMovement, handleFileUpload, handleFileDelete, handleMovementFileUpload, handleMovementFileDelete, handleAddPart, handleDeleteMovement, handleAddMovement, handleCreateGenreInline, parsePurchaseDateInput, buildSavePayload, handleSubmit, resetFormToEmpty, handleSaveAndAddAnother, handleQuickAddPerformance, togglePerformance

## Stays in the Component

- `MusicPieceModalProps` (public API)
- `MusicPieceModal` function + Modal wrapper
- Footer buttons + conditional footer variants
- Tab bar
- All 4 tab JSX sections
- `onDelete` (used inline in footer delete button)
- `isSaving` (controls footer button loading/disabled state)

## Future Split Roadmap

If `useMusicPieceForm` grows too large internally, split into:

- `useMusicPieceDetailsForm`
- `useMusicPieceTracks` / `useMusicPieceAudio`
- `useMusicPiecePerformances`
- `useMusicPieceMovements`
- `useMusicPieceDirtyState`

The grouped return shape is designed to make this straightforward.

## Verification (18 manual checks)

1. Add new piece
2. Edit existing piece
3. Close with unsaved changes → confirm discard
4. Close with unsaved changes → keep editing
5. Save existing piece
6. Save new piece
7. Save and add another
8. Add staged movement to new piece
9. Remove staged movement
10. Upload tutti file for new piece
11. Upload learning track for existing piece
12. Delete learning track
13. Add movement to existing piece
14. Delete movement
15. Upload movement learning track
16. Delete movement learning track
17. Quick-add performance
18. Link/unlink performance, create genre inline
