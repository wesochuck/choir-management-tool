import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDialog } from '../../../contexts/DialogContext';
import { useEvents } from '../../../hooks/useEvents';
import {
  isValidDurationString,
  formatSecondsToDuration,
  parseDurationToSeconds,
} from '../../../lib/musicPieceUtils';
import { parseFuzzyMonthYearInput } from '../../../lib/dateUtils';
import { extractAudioDuration, extractAudioDurationFromUrl } from '../../../lib/audioUtils';
import {
  computeAutoFillDecision,
  computeExpectedDuration,
  type DurationAutoFillState,
} from './hooks/durationAutoFillLogic';
import { useMusicPieceDetails } from './hooks/useMusicPieceDetails';
import { useMusicPieceTracks } from './hooks/useMusicPieceTracks';
import { useMusicPiecePerformances } from './hooks/useMusicPiecePerformances';
import { useMusicPieceMovements } from './hooks/useMusicPieceMovements';
import { pb } from '../../../lib/pocketbase';
import { mapWithConcurrency } from '../../../lib/networkSafety';

import type { MusicPiece, MusicPieceInput } from '../../../services/musicLibraryService';
import type { MusicGenreDef } from '../../../services/settingsService';

type MusicPieceDetailsForSave = Pick<
  ReturnType<typeof useMusicPieceDetails>,
  | 'title'
  | 'composer'
  | 'arranger'
  | 'purchaseDateInput'
  | 'duration'
  | 'copies'
  | 'catalogId'
  | 'sectionBuckets'
  | 'selectedGenres'
  | 'notes'
>;

type MusicPieceMovementsForSave = Pick<
  ReturnType<typeof useMusicPieceMovements>,
  'tuttiFile' | 'isMultiMovementInput' | 'localMovementsList'
>;

export function buildMusicPieceSavePayload({
  piece,
  details,
  movements,
}: {
  piece: MusicPiece | null;
  details: MusicPieceDetailsForSave;
  movements: MusicPieceMovementsForSave;
}): Partial<MusicPieceInput> & {
  tuttiFile?: File | null;
  movements?: { title: string; duration?: string }[];
} {
  const serializedPurchaseDate = parseFuzzyMonthYearInput(details.purchaseDateInput);
  return {
    title: details.title,
    composer: details.composer,
    arranger: details.arranger,
    purchaseDate: serializedPurchaseDate,
    duration: details.duration.trim(),
    copies: details.copies ? parseInt(details.copies, 10) : undefined,
    catalogId: details.catalogId,
    sectionBuckets: details.sectionBuckets,
    genres: details.selectedGenres,
    notes: details.notes,
    tuttiFile: !piece ? movements.tuttiFile : undefined,
    movements:
      !piece && movements.isMultiMovementInput
        ? movements.localMovementsList.map((m) => ({ title: m.title, duration: m.duration }))
        : undefined,
  };
}

export interface UseMusicPieceFormParams {
  isOpen: boolean;
  piece: MusicPiece | null;
  onClose: () => void;
  onSave: (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => Promise<void>;
  onSaveAndAddAnother?: (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => Promise<void>;
  onRefresh?: () => Promise<void>;
  allPieces?: MusicPiece[];
  allGenres: MusicGenreDef[];
  initialTitle?: string;
  onCreateGenre?: (label: string) => Promise<MusicGenreDef>;
  initialTab?: 'details' | 'tracks' | 'performances' | 'movements';
}

export function useMusicPieceForm({
  isOpen,
  piece,
  onClose,
  onSave,
  onSaveAndAddAnother,
  onRefresh,
  allPieces,
  allGenres,
  initialTitle,
  onCreateGenre,
  initialTab,
}: UseMusicPieceFormParams) {
  const dialog = useDialog();
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill duration state
  const [, setDurationAutoFillState] = useState<DurationAutoFillState>({
    manuallyEdited: false,
    runningMax: null,
    tuttiLocked: false,
  });
  const [durationAutoFillLabel, setDurationAutoFillLabel] = useState<string | null>(null);

  // Mismatch detection state
  const [trackDurationCache, setTrackDurationCache] = useState<Record<string, number | null>>({});
  const [durationMismatch, setDurationMismatch] = useState<{
    suggested: string;
    current: string;
  } | null>(null);
  const lastFetchedPieceId = useRef<string | null>(null);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'tracks' | 'performances' | 'movements'>(
    'details'
  );

  const { events: modalEvents } = useEvents();

  // 1. Details Hook
  const details = useMusicPieceDetails({
    piece,
    allPieces,
    allGenres,
    initialTitle,
    onCreateGenre,
  });

  // 2. Performances Hook
  const performances = useMusicPiecePerformances({
    piece,
    isOpen,
    modalEvents,
  });

  // 3. Movements Hook
  const movements = useMusicPieceMovements({
    piece,
    isOpen,
    composer: details.composer,
    arranger: details.arranger,
    copies: details.copies,
    catalogId: details.catalogId,
    sectionBuckets: details.sectionBuckets,
  });

  // Fetch track durations from server on form open
  useEffect(() => {
    if (!piece || !isOpen) return;
    if (lastFetchedPieceId.current === piece.id) return;
    lastFetchedPieceId.current = piece.id;

    const mapping = piece.audioTrackMapping || {};
    const entries = Object.entries(mapping).filter((entry): entry is [string, string] => {
      const [, filename] = entry;
      return !!filename;
    });
    if (entries.length === 0) {
      setTrackDurationCache({});
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
          setTrackDurationCache((prev) => ({ ...prev, [voicePart]: duration }));
        }
      },
      { concurrency: 3 }
    );

    return () => {
      cancelled = true;
    };
  }, [piece, isOpen]);

  const { setDuration } = details;

  const handleDurationChange = useCallback(
    (value: string) => {
      setDuration(value);
      setDurationAutoFillState((s) => ({ ...s, manuallyEdited: true }));
      setDurationAutoFillLabel(null);
    },
    [setDuration]
  );

  const resetDurationAutoFill = useCallback(() => {
    setDurationAutoFillState({
      manuallyEdited: false,
      runningMax: null,
      tuttiLocked: false,
    });
    setDurationAutoFillLabel(null);
  }, []);

  useEffect(() => {
    resetDurationAutoFill();
    setTrackDurationCache({});
    setDurationMismatch(null);
    lastFetchedPieceId.current = null;
  }, [piece?.id, resetDurationAutoFill]);

  // Expected duration: pure computation from cache
  const expectedDurationSeconds = useMemo(() => {
    return computeExpectedDuration(trackDurationCache);
  }, [trackDurationCache]);

  // Mismatch comparison: side-effectful state update
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

  const handleTrackDurationLoaded = useCallback(
    (voicePart: string, durationSeconds: number | null) => {
      // Update cache regardless of whether auto-fill fires
      setTrackDurationCache((prev) => ({ ...prev, [voicePart]: durationSeconds }));

      if (durationSeconds === null) return;

      setDurationAutoFillState((prevState) => {
        // computeAutoFillDecision needs the current duration from state.
        // Because handleTrackDurationLoaded is memoized and we use functional state updates,
        // details.duration will be captured from the render scope.
        const decision = computeAutoFillDecision(
          prevState,
          details.duration,
          voicePart,
          durationSeconds
        );

        if (decision) {
          const isTutti = voicePart === 'tutti';
          const label = isTutti ? 'Tutti' : voicePart;

          setDuration(decision.newDuration);
          setDurationAutoFillLabel(label);
          dialog.showToast(`Duration set to ${decision.newDuration} from "${label}" track.`);

          return decision.newState;
        }

        return prevState;
      });
    },
    [details.duration, setDuration, dialog]
  );

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

  const handleTrackDeleted = useCallback((voicePart: string) => {
    setTrackDurationCache((prev) => {
      const next = { ...prev };
      delete next[voicePart];
      return next;
    });
  }, []);

  // 4. Tracks Hook
  const tracks = useMusicPieceTracks({
    piece,
    isOpen,
    onRefresh,
    onMovementsChanged: movements.refetchMovements,
    onTrackDurationLoaded: handleTrackDurationLoaded,
    onTrackDeleted: handleTrackDeleted,
  });

  const handleAcceptMismatchDuration = useCallback(() => {
    if (durationMismatch) {
      setDuration(durationMismatch.suggested);
      setDurationMismatch(null);
    }
  }, [durationMismatch, setDuration]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveTab(initialTab || 'details');
  }, [piece, isOpen, initialTab]);

  const isDirty = useMemo(() => {
    return (
      details.isDirty || movements.tuttiFile !== null || movements.localMovementsList.length > 0
    );
  }, [details.isDirty, movements.tuttiFile, movements.localMovementsList]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: piece
          ? 'You have unsaved changes to this music piece. Do you want to discard them?'
          : 'You are adding a new music piece with unsaved details. Do you want to discard this piece?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const buildSavePayload = () => {
    return buildMusicPieceSavePayload({ piece, details, movements });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const normalizedDuration = details.duration.trim();
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      await dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger',
      });
      return;
    }
    if (!details.title.trim()) {
      await dialog.showMessage({
        title: 'Title Required',
        message: 'Please enter a title for the piece.',
        variant: 'warning',
      });
      return;
    }
    await onSave(buildSavePayload());
  };

  const resetFormToEmpty = () => {
    details.reset();
    tracks.reset();
    performances.reset();
    movements.reset();
    resetDurationAutoFill();
    setShowQuickAdd(false);
  };

  // Helper mapping specifically for Performances tab component compatibility
  const setShowQuickAdd = (show: boolean) => {
    performances.setShowQuickAdd(show);
  };

  const handleSaveAndAddAnother = async () => {
    if (!onSaveAndAddAnother) return;
    const normalizedDuration = details.duration.trim();
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      await dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger',
      });
      return;
    }
    if (!details.title.trim()) {
      await dialog.showMessage({
        title: 'Title Required',
        message: 'Please enter a title for the piece.',
        variant: 'warning',
      });
      return;
    }
    await onSaveAndAddAnother(buildSavePayload());
    resetFormToEmpty();
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  return {
    refs: {
      titleInputRef,
    },
    state: {
      activeTab,
      setActiveTab,
      isDirty,
    },
    details: {
      title: details.title,
      setTitle: details.setTitle,
      composer: details.composer,
      setComposer: details.setComposer,
      arranger: details.arranger,
      setArranger: details.setArranger,
      duration: details.duration,
      setDuration: details.setDuration,
      handleDurationChange,
      durationAutoFillLabel,
      durationMismatch,
      handleAcceptMismatchDuration,
      copies: details.copies,
      setCopies: details.setCopies,
      catalogId: details.catalogId,
      setCatalogId: details.setCatalogId,
      sectionBuckets: details.sectionBuckets,
      setSectionBuckets: details.setSectionBuckets,
      selectedGenres: details.selectedGenres,
      setSelectedGenres: details.setSelectedGenres,
      notes: details.notes,
      setNotes: details.setNotes,
      purchaseDateInput: details.purchaseDateInput,
      setPurchaseDateInput: details.setPurchaseDateInput,
      uniqueComposers: details.uniqueComposers,
      uniqueArrangers: details.uniqueArrangers,
      parentPiece: details.parentPiece,
      handleCreateGenreInline: details.handleCreateGenreInline,
    },
    tracks: {
      localPiece: tracks.localPiece,
      voiceParts: tracks.voiceParts,
      sections: tracks.sections,
      uploadingParts: tracks.uploadingParts,
      manuallyAddedParts: tracks.manuallyAddedParts,
      setManuallyAddedParts: tracks.setManuallyAddedParts,
      handleFileUpload: tracks.handleFileUpload,
      handleFileDelete: tracks.handleFileDelete,
      handleMovementFileUpload: tracks.handleMovementFileUpload,
      handleMovementFileDelete: tracks.handleMovementFileDelete,
      handleAddPart: tracks.handleAddPart,
    },
    performances: {
      allPerformances: performances.allPerformances,
      venues: performances.venues,
      selectedPerformanceIds: performances.selectedPerformanceIds,
      selectedPerformances: performances.selectedPerformances,
      availablePerformances: performances.availablePerformances,
      showQuickAdd: performances.showQuickAdd,
      setShowQuickAdd,
      quickTitle: performances.quickTitle,
      setQuickTitle: performances.setQuickTitle,
      quickDate: performances.quickDate,
      setQuickDate: performances.setQuickDate,
      quickVenue: performances.quickVenue,
      setQuickVenue: performances.setQuickVenue,
      handleQuickAddPerformance: performances.handleQuickAddPerformance,
      togglePerformance: performances.togglePerformance,
      quickAddPerformanceMutation: performances.quickAddPerformanceMutation,
    },
    movements: {
      movements: movements.movements,
      isMultiMovement: movements.isMultiMovement,
      setIsMultiMovement: movements.setIsMultiMovement,
      newMovementTitle: movements.newMovementTitle,
      setNewMovementTitle: movements.setNewMovementTitle,
      newMovementDuration: movements.newMovementDuration,
      setNewMovementDuration: movements.setNewMovementDuration,
      expandedMovementId: movements.expandedMovementId,
      setExpandedMovementId: movements.setExpandedMovementId,
      isMultiMovementInput: movements.isMultiMovementInput,
      setIsMultiMovementInput: movements.setIsMultiMovementInput,
      localMovementsList: movements.localMovementsList,
      stagingMovTitle: movements.stagingMovTitle,
      setStagingMovTitle: movements.setStagingMovTitle,
      stagingMovDuration: movements.stagingMovDuration,
      setStagingMovDuration: movements.setStagingMovDuration,
      tuttiFile: movements.tuttiFile,
      setTuttiFile: handleTuttiFileSelected,
      isTuttiDraggedOver: movements.isTuttiDraggedOver,
      setIsTuttiDraggedOver: movements.setIsTuttiDraggedOver,
      handleAddStagingMovement: movements.handleAddStagingMovement,
      handleRemoveStagingMovement: movements.handleRemoveStagingMovement,
      handleAddMovement: movements.handleAddMovement,
      handleDeleteMovement: movements.handleDeleteMovement,
    },
    actions: {
      handleClose,
      handleSubmit,
      handleSaveAndAddAnother,
    },
  };
}
