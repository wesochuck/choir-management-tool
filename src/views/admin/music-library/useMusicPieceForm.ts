import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { useDialog } from '../../../contexts/DialogContext';
import {
  musicLibraryService,
  type MusicPiece,
  type MusicPieceInput,
} from '../../../services/musicLibraryService';
import { eventService, type Event, type SetListItem } from '../../../services/eventService';
import { venueService, type Venue } from '../../../services/venueService';
import {
  getVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef,
  type MusicGenreDef,
} from '../../../services/settingsService';
import { useEvents } from '../../../hooks/useEvents';
import { formatSecondsToDuration, isValidDurationString } from '../../../lib/musicPieceUtils';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { zonedInputValueToUtc } from '../../../lib/timezone';
import { getNextMovementNumber } from '../../../lib/musicLibraryUtils';

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
  const { timezone } = useChoirSettings();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [arranger, setArranger] = useState('');
  const [duration, setDuration] = useState('');

  const uniquePeople = useMemo(() => {
    const pool = new Set<string>();
    (allPieces || []).forEach((p) => {
      if (p.composer) pool.add(p.composer);
      if (p.arranger) pool.add(p.arranger);
    });
    return Array.from(pool).sort();
  }, [allPieces]);

  const uniqueComposers = uniquePeople;
  const uniqueArrangers = uniquePeople;
  const [copies, setCopies] = useState<string>('');
  const [catalogId, setCatalogId] = useState('');
  const [sectionBuckets, setSectionBuckets] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPerformanceIds, setSelectedPerformanceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [purchaseDateInput, setPurchaseDateInput] = useState('');
  const [suggestedDuration, setSuggestedDuration] = useState<string | null>(null);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'tracks' | 'performances' | 'movements'>(
    'details'
  );

  // Audio & Voice Parts state
  const [localPiece, setLocalPiece] = useState<MusicPiece | null>(piece);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [uploadingParts, setUploadingParts] = useState<Record<string, boolean>>({});
  const [manuallyAddedParts, setManuallyAddedParts] = useState<Record<string, string[]>>({});

  // Performance states
  const [allPerformances, setAllPerformances] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Quick Add form states
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [quickVenue, setQuickVenue] = useState('');

  // Movements & Hierarchy state
  const [movements, setMovements] = useState<MusicPiece[]>([]);
  const [isMultiMovement, setIsMultiMovement] = useState(false);
  const [newMovementTitle, setNewMovementTitle] = useState('');
  const [newMovementDuration, setNewMovementDuration] = useState('');
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);

  // Staging and Tutti uploads for new pieces (piece === null)
  const [isMultiMovementInput, setIsMultiMovementInput] = useState(false);
  const [localMovementsList, setLocalMovementsList] = useState<
    { id: string; title: string; duration?: string }[]
  >([]);
  const [tuttiFile, setTuttiFile] = useState<File | null>(null);
  const [isTuttiDraggedOver, setIsTuttiDraggedOver] = useState(false);
  const [stagingMovTitle, setStagingMovTitle] = useState('');
  const [stagingMovDuration, setStagingMovDuration] = useState('');

  const parentPiece =
    piece?.parentId && allPieces ? allPieces.find((p) => p.id === piece.parentId) : undefined;

  const queryClient = useQueryClient();

  const quickAddPerformanceMutation = useMutation({
    mutationFn: (data: Partial<Event>) => eventService.createEvent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
      eventService.updateEvent(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });

  const { events: modalEvents } = useEvents();

  const venuesQuery = useQuery({
    queryKey: queryKeys.venues.list(),
    queryFn: () => venueService.getVenues(),
    enabled: isOpen,
  });

  const voicePartsQuery = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && modalEvents.length > 0) {
      setAllPerformances(modalEvents);
    }
  }, [isOpen, modalEvents]);

  useEffect(() => {
    if (venuesQuery.data) {
      setVenues(venuesQuery.data);
    }
  }, [venuesQuery.data]);

  useEffect(() => {
    if (voicePartsQuery.data) {
      setVoiceParts(voicePartsQuery.data.voiceParts);
      setSections(voicePartsQuery.data.sections);
    }
  }, [voicePartsQuery.data]);

  useEffect(() => {
    if (piece) {
      setNewMovementTitle(`Movement ${getNextMovementNumber(movements)}`);
    } else {
      setNewMovementTitle('');
    }
  }, [movements, piece]);

  useEffect(() => {
    if (!piece) {
      setStagingMovTitle(`Movement ${getNextMovementNumber(localMovementsList)}`);
    }
  }, [localMovementsList, piece]);

  const loadMovements = useCallback(async () => {
    if (!piece) return;
    try {
      const list = await musicLibraryService.getMovements(piece.id);
      setMovements(list);
      if (list.length > 0) {
        setIsMultiMovement(true);
      } else {
        setIsMultiMovement(false);
      }
    } catch (err) {
      console.error('Failed to load movements', err);
    }
  }, [piece]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalPiece(piece);
    if (piece) {
      setTitle(piece.title);
      setComposer(piece.composer || '');
      setArranger(piece.arranger || '');
      setDuration(piece.duration || '');
      setCopies(piece.copies?.toString() || '');
      setCatalogId(piece.catalogId || '');

      if (piece.purchaseDate) {
        const parts = piece.purchaseDate.split('-');
        if (parts.length >= 2) {
          setPurchaseDateInput(`${parts[1]}/${parts[0]}`);
        } else {
          setPurchaseDateInput('');
        }
      } else {
        setPurchaseDateInput('');
      }

      setSectionBuckets(piece.sectionBuckets || []);
      setSelectedGenres(piece.genres || []);
      setSelectedPerformanceIds(
        modalEvents
          .filter((evt) => evt.setList?.some((item) => item.pieceId === piece.id))
          .map((evt) => evt.id)
      );
      setNotes(piece.notes || '');
      setIsMultiMovement(false);
      loadMovements();
      setIsMultiMovementInput(false);
      setLocalMovementsList([]);
      setTuttiFile(null);
      setIsTuttiDraggedOver(false);
      setStagingMovTitle('');
      setStagingMovDuration('');
    } else {
      setTitle(initialTitle || '');
      setComposer('');
      setArranger('');
      setDuration('');
      setCopies('');
      setCatalogId('');
      setPurchaseDateInput('');
      setSectionBuckets([]);
      setSelectedGenres([]);
      setSelectedPerformanceIds([]);
      setNotes('');
      setMovements([]);
      setIsMultiMovement(false);
      setIsMultiMovementInput(false);
      setLocalMovementsList([]);
      setTuttiFile(null);
      setIsTuttiDraggedOver(false);
      setStagingMovTitle('');
      setStagingMovDuration('');
    }
    setShowQuickAdd(false);
    setQuickTitle('');
    setQuickDate('');
    setQuickVenue('');
    setActiveTab(initialTab || 'details');
    setNewMovementTitle('');
    setNewMovementDuration('');
    setExpandedMovementId(null);
    setSuggestedDuration(null);
    setManuallyAddedParts({});
  }, [piece, isOpen, loadMovements, initialTitle, initialTab, modalEvents]);

  const isDirty = useMemo(() => {
    if (piece) {
      const titleChanged = title !== piece.title;
      const composerChanged = composer !== (piece.composer || '');
      const arrangerChanged = arranger !== (piece.arranger || '');
      const durationChanged = duration !== (piece.duration || '');
      const copiesChanged = copies !== (piece.copies?.toString() || '');
      const catalogIdChanged = catalogId !== (piece.catalogId || '');
      const notesChanged = notes !== (piece.notes || '');

      const originalPurchaseDisplay = piece.purchaseDate
        ? (() => {
            const p = piece.purchaseDate.split('-');
            return p.length >= 2 ? `${p[1]}/${p[0]}` : '';
          })()
        : '';
      const purchaseDateChanged = purchaseDateInput !== originalPurchaseDisplay;

      const initialSections = [...(piece.sectionBuckets || [])].sort();
      const currentSections = [...sectionBuckets].sort();
      const sectionsChanged = JSON.stringify(initialSections) !== JSON.stringify(currentSections);

      const initialGenres = [...(piece.genres || [])].sort();
      const currentGenres = [...selectedGenres].sort();
      const genresChanged = JSON.stringify(initialGenres) !== JSON.stringify(currentGenres);

      return (
        titleChanged ||
        composerChanged ||
        arrangerChanged ||
        durationChanged ||
        copiesChanged ||
        catalogIdChanged ||
        notesChanged ||
        sectionsChanged ||
        genresChanged ||
        purchaseDateChanged
      );
    } else {
      const hasTitle = title !== (initialTitle || '');
      const hasComposer = Boolean(composer.trim());
      const hasArranger = Boolean(arranger.trim());
      const hasDuration = Boolean(duration.trim());
      const hasCopies = Boolean(copies.trim());
      const hasCatalogId = Boolean(catalogId.trim());
      const hasNotes = Boolean(notes.trim());
      const hasSections = sectionBuckets.length > 0;
      const hasGenres = selectedGenres.length > 0;
      const hasTutti = tuttiFile !== null;
      const hasStagedMovements = localMovementsList.length > 0;
      const hasPurchaseDate = Boolean(purchaseDateInput.trim());

      return (
        hasTitle ||
        hasComposer ||
        hasArranger ||
        hasDuration ||
        hasCopies ||
        hasCatalogId ||
        hasNotes ||
        hasSections ||
        hasGenres ||
        hasTutti ||
        hasStagedMovements ||
        hasPurchaseDate
      );
    }
  }, [
    piece,
    title,
    composer,
    arranger,
    duration,
    copies,
    catalogId,
    notes,
    sectionBuckets,
    selectedGenres,
    initialTitle,
    tuttiFile,
    localMovementsList,
    purchaseDateInput,
  ]);

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

  const handleAddStagingMovement = (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    const defaultTitle = `Movement ${getNextMovementNumber(localMovementsList)}`;
    const titleVal = stagingMovTitle.trim() || defaultTitle;

    setLocalMovementsList((prev) => [
      ...prev,
      {
        id: `staged_${Date.now()}_${Math.random()}`,
        title: titleVal,
        duration: stagingMovDuration.trim() || undefined,
      },
    ]);
    setStagingMovTitle('');
    setStagingMovDuration('');
  };

  const handleRemoveStagingMovement = (id: string) => {
    setLocalMovementsList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleFileUpload = async (voicePart: string, file: File) => {
    if (!localPiece) return;

    // Extract audio track duration if this is the first learning track and no duration is set
    const trackCountBefore = Object.keys(localPiece.audioTrackMapping || {}).length;
    if (trackCountBefore === 0 && !duration.trim()) {
      try {
        const seconds = await new Promise<number>((resolve) => {
          const audio = new Audio();
          audio.src = URL.createObjectURL(file);
          audio.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(audio.src);
            resolve(audio.duration);
          });
          audio.addEventListener('error', () => {
            resolve(0);
          });
        });
        if (seconds > 0) {
          const formatted = formatSecondsToDuration(Math.round(seconds));
          setSuggestedDuration(formatted);
        }
      } catch (e) {
        console.error('Failed to get audio duration', e);
      }
    }

    setUploadingParts((prev) => ({ ...prev, [voicePart]: true }));
    try {
      const existingFilename = localPiece.audioTrackMapping?.[voicePart];
      let currentFiles = localPiece.audioFiles || [];
      const currentMapping = { ...(localPiece.audioTrackMapping || {}) };

      if (existingFilename) {
        currentFiles = currentFiles.filter((f) => f !== existingFilename);
        delete currentMapping[voicePart];
      }

      const formData = new FormData();
      currentFiles.forEach((f) => {
        formData.append('audioFiles', f);
      });
      formData.append('audioFiles', file);

      const updatedPiece = await musicLibraryService.updatePiece(localPiece.id, formData);

      const oldFiles = localPiece.audioFiles || [];
      const newFiles = updatedPiece.audioFiles || [];
      const addedFilename = newFiles.find((f) => !oldFiles.includes(f));

      if (addedFilename) {
        currentMapping[voicePart] = addedFilename;
        const finalPiece = await musicLibraryService.updatePiece(localPiece.id, {
          audioTrackMapping: currentMapping,
        });

        setLocalPiece(finalPiece);
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        throw new Error('Upload succeeded but no new filename returned.');
      }
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Upload Failed',
        message:
          'Failed to upload the audio track. Ensure the file is under 20MB and is a valid audio format.',
        variant: 'danger',
      });
    } finally {
      setUploadingParts((prev) => ({ ...prev, [voicePart]: false }));
    }
  };

  const handleFileDelete = async (voicePart: string) => {
    if (!localPiece) return;

    const filename = localPiece.audioTrackMapping?.[voicePart];
    if (!filename) return;

    const confirmed = await dialog.confirm({
      title: 'Delete Learning Track',
      message: `Are you sure you want to delete the track for ${voicePart === 'tutti' ? 'Tutti' : voicePart}?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    try {
      const filesToKeep = (localPiece.audioFiles || []).filter((f) => f !== filename);
      const newMapping = { ...(localPiece.audioTrackMapping || {}) };
      delete newMapping[voicePart];

      const updatedPiece = await musicLibraryService.updatePiece(localPiece.id, {
        audioFiles: filesToKeep,
        audioTrackMapping: newMapping,
      });

      setLocalPiece(updatedPiece);
      if (onRefresh) {
        await onRefresh();
      }

      dialog.showToast('Audio track deleted successfully.');
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the audio track.',
        variant: 'danger',
      });
    }
  };

  const handleMovementFileUpload = async (movement: MusicPiece, voicePart: string, file: File) => {
    const uploadKey = `${movement.id}_${voicePart}`;
    setUploadingParts((prev) => ({ ...prev, [uploadKey]: true }));
    try {
      const existingFilename = movement.audioTrackMapping?.[voicePart];
      let currentFiles = movement.audioFiles || [];
      const currentMapping = { ...(movement.audioTrackMapping || {}) };

      if (existingFilename) {
        currentFiles = currentFiles.filter((f) => f !== existingFilename);
        delete currentMapping[voicePart];
      }

      const formData = new FormData();
      currentFiles.forEach((f) => {
        formData.append('audioFiles', f);
      });
      formData.append('audioFiles', file);

      const updatedPiece = await musicLibraryService.updatePiece(movement.id, formData);

      const oldFiles = movement.audioFiles || [];
      const newFiles = updatedPiece.audioFiles || [];
      const addedFilename = newFiles.find((f) => !oldFiles.includes(f));

      if (addedFilename) {
        currentMapping[voicePart] = addedFilename;
        await musicLibraryService.updatePiece(movement.id, {
          audioTrackMapping: currentMapping,
        });

        await loadMovements();
      } else {
        throw new Error('Upload succeeded but no new filename returned.');
      }
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Upload Failed',
        message:
          'Failed to upload the audio track for this movement. Ensure the file is under 20MB and is a valid audio format.',
        variant: 'danger',
      });
    } finally {
      setUploadingParts((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleMovementFileDelete = async (movement: MusicPiece, voicePart: string) => {
    const filename = movement.audioTrackMapping?.[voicePart];
    if (!filename) return;

    const confirmed = await dialog.confirm({
      title: 'Delete Learning Track',
      message: `Are you sure you want to delete the track for ${voicePart === 'tutti' ? 'Tutti' : voicePart} in this movement?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    try {
      const filesToKeep = (movement.audioFiles || []).filter((f) => f !== filename);
      const newMapping = { ...(movement.audioTrackMapping || {}) };
      delete newMapping[voicePart];

      await musicLibraryService.updatePiece(movement.id, {
        audioFiles: filesToKeep,
        audioTrackMapping: newMapping,
      });

      await loadMovements();

      dialog.showToast('Movement audio track deleted successfully.');
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the movement audio track.',
        variant: 'danger',
      });
    }
  };

  const handleAddPart = (id: string, part: string) => {
    setManuallyAddedParts((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), part],
    }));
  };

  const handleDeleteMovement = async (mId: string, mTitle: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Movement',
      message: `Are you sure you want to delete the movement "${mTitle}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    try {
      await musicLibraryService.deletePiece(mId);
      await loadMovements();
      dialog.showToast('Movement deleted successfully.');
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete movement.',
        variant: 'danger',
      });
    }
  };

  const handleAddMovement = async (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!localPiece) return;

    const defaultTitle = `Movement ${getNextMovementNumber(movements)}`;
    const finalTitle = newMovementTitle.trim() || defaultTitle;

    try {
      await musicLibraryService.createPiece({
        title: finalTitle,
        parentId: localPiece.id,
        duration: newMovementDuration.trim() || undefined,
        composer: composer || undefined,
        arranger: arranger || undefined,
        voicing: localPiece.voicing || undefined,
        copies: copies ? parseInt(copies, 10) : undefined,
        catalogId: catalogId || undefined,
        sectionBuckets: sectionBuckets,
      });

      setNewMovementTitle('');
      setNewMovementDuration('');
      await loadMovements();
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to add movement.',
        variant: 'danger',
      });
    }
  };

  const handleCreateGenreInline = async (label: string) => {
    if (!onCreateGenre) {
      throw new Error('Genre creation is not supported.');
    }
    const trimmed = label.trim();
    if (!trimmed) {
      throw new Error('Genre name cannot be empty.');
    }

    const existing = allGenres.find((g) => g.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!selectedGenres.includes(existing.id)) {
        setSelectedGenres((prev) => [...prev, existing.id]);
      }
      return { id: existing.id, label: existing.label };
    }

    const newGenre = await onCreateGenre(trimmed);
    if (!selectedGenres.includes(newGenre.id)) {
      setSelectedGenres((prev) => [...prev, newGenre.id]);
    }
    return { id: newGenre.id, label: newGenre.label };
  };

  const parsePurchaseDateInput = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    const match = trimmed.match(/^(\d{1,2})\/?(\d{2}|\d{4})$/);
    if (!match) return '';
    const mm = match[1].padStart(2, '0');
    const yyyy = match[2].length === 2 ? `20${match[2]}` : match[2];
    return `${yyyy}-${mm}-01`;
  };

  const buildSavePayload = () => {
    const serializedPurchaseDate = parsePurchaseDateInput(purchaseDateInput);
    return {
      title,
      composer,
      arranger,
      purchaseDate: serializedPurchaseDate,
      duration: duration.trim(),
      copies: copies ? parseInt(copies, 10) : undefined,
      catalogId,
      sectionBuckets,
      genres: selectedGenres,
      notes,
      tuttiFile: !piece ? tuttiFile : undefined,
      movements:
        !piece && isMultiMovementInput
          ? localMovementsList.map((m) => ({ title: m.title, duration: m.duration }))
          : undefined,
    };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const normalizedDuration = duration.trim();
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      await dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger',
      });
      return;
    }
    if (!title.trim()) {
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
    setTitle('');
    setComposer('');
    setArranger('');
    setDuration('');
    setCopies('');
    setCatalogId('');
    setPurchaseDateInput('');
    setSectionBuckets([]);
    setSelectedGenres([]);
    setSelectedPerformanceIds([]);
    setNotes('');
    setIsMultiMovementInput(false);
    setLocalMovementsList([]);
    setTuttiFile(null);
    setIsTuttiDraggedOver(false);
    setStagingMovTitle('');
    setStagingMovDuration('');
    setSuggestedDuration(null);
    setShowQuickAdd(false);
    setQuickTitle('');
    setQuickDate('');
    setQuickVenue('');
  };

  const handleSaveAndAddAnother = async () => {
    if (!onSaveAndAddAnother) return;
    const normalizedDuration = duration.trim();
    if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
      await dialog.showMessage({
        title: 'Invalid Duration',
        message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
        variant: 'danger',
      });
      return;
    }
    if (!title.trim()) {
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

  const handleQuickAddPerformance = async () => {
    if (!quickTitle || !quickDate || !quickVenue) {
      dialog.showMessage({
        title: 'Validation Error',
        message: 'Please provide a title, date, and venue for the performance.',
        variant: 'warning',
      });
      return;
    }

    try {
      const utcDate = zonedInputValueToUtc(quickDate, timezone);
      const newPerf = await quickAddPerformanceMutation.mutateAsync({
        title: quickTitle,
        date: utcDate,
        type: 'Performance',
        venue: quickVenue,
        details: 'Quick added from music library historic logs',
      } as Partial<Event>);

      setAllPerformances((prev) => [newPerf, ...prev]);
      setSelectedPerformanceIds((prev) => [...prev, newPerf.id]);

      // Reset quick add fields
      setQuickTitle('');
      setQuickDate('');
      setQuickVenue('');
      setShowQuickAdd(false);

      dialog.showMessage({
        title: 'Success',
        message: `Created performance "${newPerf.title}" and linked it to this piece.`,
        variant: 'info',
      });
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to create the performance.',
        variant: 'danger',
      });
    }
  };

  const togglePerformance = async (perfId: string) => {
    const event = modalEvents.find((e) => e.id === perfId);
    if (!event) return;

    const isLinked = selectedPerformanceIds.includes(perfId);
    try {
      if (isLinked) {
        const updatedSetList = (event.setList || []).filter((item) => item.pieceId !== piece?.id);
        await updateEventMutation.mutateAsync({ id: perfId, data: { setList: updatedSetList } });
        setSelectedPerformanceIds((prev) => prev.filter((id) => id !== perfId));
      } else if (piece) {
        const newItem: SetListItem = {
          id: window.crypto.randomUUID(),
          title: piece.title,
          pieceId: piece.id,
          composer: piece.composer,
        };
        const updatedSetList = [...(event.setList || []), newItem];
        await updateEventMutation.mutateAsync({ id: perfId, data: { setList: updatedSetList } });
        setSelectedPerformanceIds((prev) => [...prev, perfId]);
      }
    } catch (error) {
      console.error('Failed to toggle performance set list link:', error);
    }
  };

  const selectedPerformances = useMemo(() => {
    return allPerformances
      .filter((p) => selectedPerformanceIds.includes(p.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allPerformances, selectedPerformanceIds]);

  const availablePerformances = useMemo(() => {
    return allPerformances
      .filter((p) => !selectedPerformanceIds.includes(p.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allPerformances, selectedPerformanceIds]);

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
      title,
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
      handleCreateGenreInline,
    },
    tracks: {
      localPiece,
      voiceParts,
      sections,
      uploadingParts,
      manuallyAddedParts,
      setManuallyAddedParts,
      handleFileUpload,
      handleFileDelete,
      handleMovementFileUpload,
      handleMovementFileDelete,
      handleAddPart,
    },
    performances: {
      allPerformances,
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
      togglePerformance,
      quickAddPerformanceMutation,
    },
    movements: {
      movements,
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
      handleDeleteMovement,
    },
    actions: {
      handleClose,
      handleSubmit,
      handleSaveAndAddAnother,
    },
  };
}
