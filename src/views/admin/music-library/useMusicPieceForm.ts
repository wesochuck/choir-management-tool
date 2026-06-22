import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDialog } from '../../../contexts/DialogContext';
import { useEvents } from '../../../hooks/useEvents';
import { isValidDurationString } from '../../../lib/musicPieceUtils';
import { parseFuzzyMonthYearInput } from '../../../lib/dateUtils';
import { useMusicPieceDetails } from './hooks/useMusicPieceDetails';
import { useMusicPieceTracks } from './hooks/useMusicPieceTracks';
import { useMusicPiecePerformances } from './hooks/useMusicPiecePerformances';
import { useMusicPieceMovements } from './hooks/useMusicPieceMovements';

import type { MusicPiece, MusicPieceInput } from '../../../services/musicLibraryService';
import type { MusicGenreDef } from '../../../services/settingsService';

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

  // 4. Tracks Hook
  const tracks = useMusicPieceTracks({
    piece,
    isOpen,
    onRefresh,
    onMovementsChanged: movements.refetchMovements,
  });

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
      setTuttiFile: movements.setTuttiFile,
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
