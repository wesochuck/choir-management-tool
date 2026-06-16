import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, Modal, Select, Input, Textarea } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';
import {
  musicLibraryService,
  type MusicPiece,
  type MusicPieceInput,
} from '../../../services/musicLibraryService';
import { eventService, type Event } from '../../../services/eventService';
import { venueService, type Venue } from '../../../services/venueService';
import {
  getVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef,
  type MusicGenreDef,
} from '../../../services/settingsService';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { pb } from '../../../lib/pocketbase';
import {
  formatSecondsToDuration,
  resolveCatalogLookupUrl,
  isValidDurationString,
  getLearningTrackContextLabel,
} from '../../../lib/musicPieceUtils';
import { LearningTracksEditor } from './LearningTracksEditor';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { zonedInputValueToUtc } from '../../../lib/timezone';
import { AutocompleteInput } from '../../../components/admin/AutocompleteInput';

export interface MusicPieceModalProps {
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
  onDelete?: () => Promise<void>;
  catalogLookupTemplate?: string;
  onRefresh?: () => Promise<void>;
  allPieces?: MusicPiece[];
  allGenres: MusicGenreDef[];
  initialTitle?: string;
  onCreateGenre?: (label: string) => Promise<MusicGenreDef>;
  initialTab?: 'details' | 'tracks' | 'performances' | 'movements';
}

export function MusicPieceModal({
  isOpen,
  piece,
  onClose,
  onSave,
  onSaveAndAddAnother,
  onDelete,
  catalogLookupTemplate,
  onRefresh,
  allPieces,
  allGenres,
  initialTitle,
  onCreateGenre,
  initialTab,
}: MusicPieceModalProps) {
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
  const [isSaving, setIsSaving] = useState(false);
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
  const [isQuickAdding, setIsQuickAdding] = useState(false);

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

  useEffect(() => {
    if (piece) {
      setNewMovementTitle(`Movement ${movements.length + 1}`);
    } else {
      setNewMovementTitle('');
    }
  }, [movements, piece]);

  useEffect(() => {
    if (!piece) {
      setStagingMovTitle(`Movement ${localMovementsList.length + 1}`);
    }
  }, [localMovementsList, piece]);

  const loadMovements = useCallback(async () => {
    if (!piece) return;
    try {
      const list = await pb.collection('musicLibrary').getFullList<MusicPiece>({
        filter: pb.filter('parentId = {:id}', { id: piece.id }),
        sort: 'created',
      });
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
      // Load performances
      eventService
        .getEvents()
        .then((events) => {
          setAllPerformances(events.filter((e) => e.type === 'Performance'));
        })
        .catch(console.error);

      // Load venues for quick add
      venueService.getVenues().then(setVenues).catch(console.error);

      // Load voice parts and sections
      getVoicePartsAndSections()
        .then((data) => {
          setVoiceParts(data.voiceParts);
          setSections(data.sections);
        })
        .catch(console.error);

      // Focus the title field on open
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
      setSelectedPerformanceIds(piece.performances || []);
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
  }, [piece, isOpen, loadMovements, initialTitle, initialTab]);

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

      const initialPerformances = [...(piece.performances || [])].sort();
      const currentPerformances = [...selectedPerformanceIds].sort();
      const performancesChanged =
        JSON.stringify(initialPerformances) !== JSON.stringify(currentPerformances);

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
        performancesChanged ||
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
      const hasPerformances = selectedPerformanceIds.length > 0;
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
        hasPerformances ||
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
    selectedPerformanceIds,
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
    const nextIndex = localMovementsList.length + 1;
    const defaultTitle = `Movement ${nextIndex}`;
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

    const nextIndex = movements.length + 1;
    const defaultTitle = `Movement ${nextIndex}`;
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
        performances: [],
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
    const normalizedDuration = duration.trim();
    const serializedPurchaseDate = parsePurchaseDateInput(purchaseDateInput);
    return {
      title,
      composer,
      arranger,
      purchaseDate: serializedPurchaseDate,
      duration: normalizedDuration,
      copies: copies ? parseInt(copies, 10) : undefined,
      catalogId,
      sectionBuckets,
      genres: selectedGenres,
      performances: selectedPerformanceIds,
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
    setIsSaving(true);
    try {
      const normalizedDuration = duration.trim();
      if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
        await dialog.showMessage({
          title: 'Invalid Duration',
          message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
          variant: 'danger',
        });
        return;
      }
      await onSave(buildSavePayload());
    } finally {
      setIsSaving(false);
    }
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
    setIsSaving(true);
    try {
      await onSaveAndAddAnother(buildSavePayload());
      resetFormToEmpty();
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } finally {
      setIsSaving(false);
    }
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

    setIsQuickAdding(true);
    try {
      const utcDate = zonedInputValueToUtc(quickDate, timezone);
      const newPerf = await eventService.createEvent({
        title: quickTitle,
        date: utcDate,
        type: 'Performance',
        venue: quickVenue,
        details: 'Quick added from music library historic logs',
      });

      // Update local performance selection list
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
    } finally {
      setIsQuickAdding(false);
    }
  };

  const togglePerformance = (perfId: string) => {
    setSelectedPerformanceIds((prev) =>
      prev.includes(perfId) ? prev.filter((id) => id !== perfId) : [...prev, perfId]
    );
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={piece ? 'Edit Piece' : 'Add Piece'}
      maxWidth="640px"
      footer={
        onDelete ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="flex justify-between gap-2 sm:mr-auto">
              <Button
                variant="danger"
                onClick={() => { onClose(); onDelete(); }}
              >
                Delete
              </Button>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </div>
            <Button
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              className="w-full sm:w-auto"
              onClick={() => handleSubmit()}
            >
              Save Piece
            </Button>
          </div>
        ) : !piece && onSaveAndAddAnother ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="flex justify-between gap-2 sm:mr-auto">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                variant="secondary"
                disabled={isSaving}
                loading={isSaving}
                onClick={handleSaveAndAddAnother}
              >
                Save & Add Another
              </Button>
            </div>
            <Button
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              className="w-full sm:w-auto"
              onClick={() => handleSubmit()}
            >
              Save Piece
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              onClick={() => handleSubmit()}
            >
              Save Piece
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {piece && (
          <div className="mb-4 flex flex-row gap-4 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'details' ? 'border-b-2 border-primary font-bold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
            >
              Piece Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracks')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'tracks' ? 'border-b-2 border-primary font-bold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
            >
              Learning Tracks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('performances')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'performances' ? 'border-b-2 border-primary font-bold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
            >
              Linked Performances
            </button>
            {isMultiMovement && (
              <button
                type="button"
                onClick={() => setActiveTab('movements')}
                className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'movements' ? 'border-b-2 border-primary font-bold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
              >
                Movements ({movements.length})
              </button>
            )}
          </div>
        )}

        <form id="music-piece-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {(!piece || activeTab === 'details') && (
          <>
            {/* LINKED PARENT BANNER NOTICE */}
            {parentPiece && (
              <div className="mb-2 flex items-center gap-2 rounded-md border-l-4 border-primary bg-primary/5 p-3 text-sm text-text">
                <span>
                  🔗 <strong>Multi-Movement Link:</strong> This piece is configured as a movement of{' '}
                  <strong>{parentPiece.title}</strong>.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-label">
                Title
              </label>
              <Input
                ref={titleInputRef}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Composer
                </label>
                <AutocompleteInput
                  value={composer}
                  onChange={setComposer}
                  suggestions={uniqueComposers}
                  placeholder="e.g. Ludwig van Beethoven"
                  
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Arranger
                </label>
                <AutocompleteInput
                  value={arranger}
                  onChange={setArranger}
                  suggestions={uniqueArrangers}
                  placeholder="e.g. Alice Parker"
                  
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Applies to Sections
                </label>
                <MultiSelectDropdown
                  options={sections.map((s) => ({ id: s.code, label: s.name }))}
                  selectedIds={sectionBuckets}
                  onChange={setSectionBuckets}
                  placeholder="Sections"
                  allLabel="All Sections"
                />
                <span className="mt-1 text-xs text-text-muted">
                  {sectionBuckets.length === 0
                    ? 'Applies to all sections. Select to restrict.'
                    : `Restricted to: ${sectionBuckets.map((code) => sections.find((s) => s.code === code)?.name || code).join(', ')}`}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Genres
                </label>
                <MultiSelectDropdown
                  options={[...allGenres]
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((g) => ({ id: g.id, label: g.label }))}
                  selectedIds={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Genres"
                  allLabel="No Genre"
                  allowCreate={true}
                  onCreateOption={handleCreateGenreInline}
                  variant="chips"
                  searchable
                />
              </div>
            </div>
            {piece ? (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  id="is-multi-movement"
                  checked={isMultiMovement}
                  onChange={(e) => setIsMultiMovement(e.target.checked)}
                  className="size-4 cursor-pointer rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="cursor-pointer text-sm font-bold text-text">
                  This is a multi-movement piece
                </span>
              </label>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-multi-movement-input"
                    checked={isMultiMovementInput}
                    onChange={(e) => setIsMultiMovementInput(e.target.checked)}
                    className="size-4 cursor-pointer rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="cursor-pointer text-sm font-bold text-text">
                    This piece has multiple movements
                  </span>
                </label>
                {isMultiMovementInput && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-gray-50/50 p-4">
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        Staged Movements ({localMovementsList.length})
                      </span>
                    </div>

                    {localMovementsList.length > 0 && (
                      <div className="flex max-h-[120px] flex-col gap-1 overflow-y-auto px-1">
                        {localMovementsList.map((m, idx) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-md border border-border bg-surface p-1.5 px-3 text-xs font-medium"
                          >
                            <span>
                              {idx + 1}. {m.title} {m.duration ? `(${m.duration})` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagingMovement(m.id)}
                              className="cursor-pointer p-1 text-xs font-bold text-danger-text hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-1 flex flex-row items-center gap-2">
                      <Input
                        type="text"
                        placeholder={`Name (e.g. Movement ${localMovementsList.length + 1})`}
                        value={stagingMovTitle}
                        onChange={(e) => setStagingMovTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddStagingMovement(e);
                          }
                        }}
                        className="flex-[2]"
                      />
                      <Input
                        type="text"
                        placeholder="e.g. 2:45"
                        value={stagingMovDuration}
                        onChange={(e) => setStagingMovDuration(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddStagingMovement(e);
                          }
                        }}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        className="flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-xs font-bold text-white shadow-md transition-all enabled:hover:bg-primary-deep enabled:active:scale-95 disabled:opacity-50"
                        onClick={() => handleAddStagingMovement()}
                      >
                        + Stage
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Duration
                </label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 3:30"
                  
                />
                {suggestedDuration && !duration.trim() && (
                  <div className="mt-2 flex flex-row items-center justify-between gap-2 rounded-lg border border-dashed border-primary/30 bg-primary-light p-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-deep">
                      💡 Track length: <strong>{suggestedDuration}</strong>. Use this?
                    </span>
                    <button
                      type="button"
                      className="flex h-6 cursor-pointer items-center justify-center rounded-md border border-primary/40 bg-surface px-3 text-[10px] font-bold text-primary shadow-xs transition-colors hover:bg-primary-light active:scale-95"
                      onClick={() => {
                        setDuration(suggestedDuration);
                        setSuggestedDuration(null);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Copies
                </label>
                <Input
                  type="number"
                  value={copies}
                  onChange={(e) => setCopies(e.target.value)}
                  
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Catalog ID
                </label>
                <Input
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                  
                />
                {catalogId.trim() &&
                  catalogLookupTemplate &&
                  resolveCatalogLookupUrl(catalogLookupTemplate, catalogId) && (
                    <a
                      href={resolveCatalogLookupUrl(catalogLookupTemplate, catalogId)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-deep no-underline transition-colors hover:bg-emerald-100 active:scale-95"
                    >
                      Lookup ↗
                    </a>
                  )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">
                  Purchase Date
                </label>
                <Input
                  value={purchaseDateInput}
                  onChange={(e) => setPurchaseDateInput(e.target.value)}
                  placeholder="mm/yyyy"
                  
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. A cappella, performance instructions, etc."
                className="min-h-[80px]"
              />
              <span className="mt-1 text-xs text-text-muted">
                If this is a medley, please list the names of the different pieces here.
              </span>
            </div>

            {!piece && (
              <>
                <div className="mt-2 flex flex-col gap-1.5">
                  <label className="text-label">
                    Link to Past Performance (Optional)
                  </label>
                  <div className="flex min-h-[36px] flex-row flex-wrap gap-2 py-1">
                    {selectedPerformances.length === 0 ? (
                      <span className="text-sm font-medium text-text-muted">
                        No performances linked.
                      </span>
                    ) : (
                      selectedPerformances.map((perf) => {
                        const dateStr = perf.date
                          ? new Date(perf.date).toISOString().split('T')[0]
                          : '';
                        return (
                          <div
                            key={perf.id}
                            className="flex flex-row items-center gap-2 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-xs font-semibold text-primary-deep shadow-xs"
                          >
                            <span>
                              {perf.title} {dateStr && `(${dateStr})`}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePerformance(perf.id)}
                              className="cursor-pointer text-sm leading-none font-bold text-primary hover:text-primary-deep"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <Select
                    size="small"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) togglePerformance(e.target.value);
                    }}
                  >
                    <option value="">-- Link a past performance --</option>
                    {availablePerformances.map((perf) => {
                      const dateStr = perf.date
                        ? new Date(perf.date).toISOString().split('T')[0]
                        : '';
                      return (
                        <option key={perf.id} value={perf.id}>
                          {perf.title} {dateStr && `(${dateStr})`}
                        </option>
                      );
                    })}
                  </Select>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <label className="text-label">
                    Tutti Practice Track (Optional)
                  </label>
                  {tuttiFile ? (
                    <div className="flex flex-row items-center justify-between gap-4 rounded-lg border border-primary bg-primary/5 p-3">
                      <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
                        <span className="text-lg">🎵</span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <strong className="block truncate text-xs font-bold text-text">
                            {tuttiFile.name}
                          </strong>
                          <span className="text-xs text-text-muted">
                            {(tuttiFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex h-8 cursor-pointer items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-bold text-danger-text transition-colors hover:bg-danger-bg active:scale-95"
                        onClick={() => setTuttiFile(null)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTuttiDraggedOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTuttiDraggedOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTuttiDraggedOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith('audio/')) {
                          setTuttiFile(file);
                        }
                      }}
                      className={`cursor-pointer rounded-lg p-4 transition-all duration-200 ease-in-out ${isTuttiDraggedOver ? 'border-2 border-dashed border-primary bg-primary/5' : 'border-2 border-dashed border-border bg-transparent'}`}
                    >
                      <label className="m-0 flex w-full cursor-pointer items-center justify-center gap-2">
                        <span className="text-xl">📤</span>
                        <span className="text-xs font-semibold text-text">
                          Drag and drop a Tutti MP3 track here, or{' '}
                          <span className="font-bold text-primary underline">browse</span>
                        </span>
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setTuttiFile(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {piece && activeTab === 'performances' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-label">
                Linked Performances
              </label>

              {/* Selected performances pills */}
              <div className="flex min-h-[40px] flex-row flex-wrap gap-2 py-2">
                {selectedPerformances.length === 0 ? (
                  <span className="text-sm font-medium text-text-muted">
                    No performances linked.
                  </span>
                ) : (
                  selectedPerformances.map((perf) => {
                    const dateStr = perf.date
                      ? new Date(perf.date).toISOString().split('T')[0]
                      : '';
                    return (
                      <div
                        key={perf.id}
                        className="flex flex-row items-center gap-2 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-xs font-semibold text-primary-deep shadow-xs"
                      >
                        <span>
                          {perf.title} {dateStr && `(${dateStr})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePerformance(perf.id)}
                          className="cursor-pointer text-sm leading-none font-bold text-primary hover:text-primary-deep"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex flex-row flex-wrap gap-3">
                <Select
                  size="small" className="min-w-0 flex-[1_1_200px]"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      togglePerformance(e.target.value);
                    }
                  }}
                >
                  <option value="">-- Add a performance --</option>
                  {availablePerformances.map((perf) => {
                    const dateStr = perf.date
                      ? new Date(perf.date).toISOString().split('T')[0]
                      : '';
                    return (
                      <option key={perf.id} value={perf.id}>
                        {perf.title} {dateStr && `(${dateStr})`}
                      </option>
                    );
                  })}
                </Select>
                <button
                  type="button"
                  className="flex h-10 flex-[1_1_auto] cursor-pointer items-center justify-center rounded-md bg-primary-light px-4 text-sm font-bold text-primary-deep shadow-xs transition-colors hover:bg-emerald-100 active:scale-95"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                >
                  {showQuickAdd ? 'Cancel Quick Add' : 'Quick Add Performance'}
                </button>
              </div>
            </div>

            {/* Quick Add Performance form */}
            {showQuickAdd && (
              <div className="mt-4 flex flex-col gap-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                <h4 className="m-0 text-sm font-bold text-primary-deep">
                  Quick Add Historic Performance
                </h4>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label">
                      Performance Title
                    </label>
                    <Input
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="e.g. Spring Concert 2018"
                      
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label">
                        Date
                      </label>
                      <Input
                        type="datetime-local"
                        value={quickDate}
                        onChange={(e) => setQuickDate(e.target.value)}
                        
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label">
                        Venue
                      </label>
                      <Select
                        value={quickVenue}
                        onChange={(e) => setQuickVenue(e.target.value)}
                        size="compact"
                      >
                        <option value="">-- Select Venue --</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-1 flex h-9 cursor-pointer items-center justify-center self-end rounded-md bg-primary px-4 text-xs font-bold text-white shadow-md transition-all enabled:hover:bg-primary-deep enabled:active:scale-95 disabled:opacity-50"
                    onClick={handleQuickAddPerformance}
                    disabled={isQuickAdding}
                  >
                    {isQuickAdding ? 'Creating...' : 'Create & Link'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {piece && activeTab === 'tracks' && (
          <div
            className="flex flex-col gap-2"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Context header: shows piece name + movement name */}
            {(() => {
              const parentPiece =
                piece.parentId && allPieces
                  ? allPieces.find((p) => p.id === piece.parentId)
                  : undefined;
              const contextLabel = getLearningTrackContextLabel(piece, parentPiece?.title);
              return (
                <div className="mb-2 flex flex-col gap-1 border-b border-border pb-3">
                  <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                    🎵 Learning Tracks for
                  </span>
                  <span className="text-base font-bold text-primary">{contextLabel}</span>
                </div>
              );
            })()}
            {!localPiece ? (
              <div className="flex flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-gray-50/50 p-4 text-sm text-text-muted">
                <span>Please save this piece first to enable learning track uploads.</span>
              </div>
            ) : (
              <LearningTracksEditor
                piece={localPiece}
                voiceParts={voiceParts}
                sections={sections}
                uploadingParts={uploadingParts}
                uploadingKeyPrefix=""
                onUpload={handleFileUpload}
                onDelete={handleFileDelete}
                manuallyAddedParts={manuallyAddedParts[localPiece.id] || []}
                onAddPart={(part) => handleAddPart(localPiece.id, part)}
              />
            )}
          </div>
        )}

        {piece && activeTab === 'movements' && isMultiMovement && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <h3 className="m-0 text-base font-bold text-primary">
                Movements ({movements.length})
              </h3>
            </div>

            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-gray-50/50 py-12 text-sm text-text-muted">
                No movements added yet. Add your first movement below.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {movements.map((m, idx) => {
                  const isExpanded = expandedMovementId === m.id;
                  const mMapping = m.audioTrackMapping || {};
                  const mTrackCount = Object.keys(mMapping).filter((k) => mMapping[k]).length;
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-border bg-gray-50/30 p-3 shadow-xs"
                    >
                      <div className="flex flex-row items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <div className="flex flex-row items-center gap-2">
                            <strong className="text-sm text-text">
                              {idx + 1}. {m.title}
                            </strong>
                            {mTrackCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                🎧 {mTrackCount} Track{mTrackCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {m.duration && (
                            <span className="text-xs text-text-muted">Duration: {m.duration}</span>
                          )}
                        </div>
                        <div className="flex flex-row items-center gap-2">
                          <button
                            type="button"
                            className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-border bg-surface px-2.5 text-xs font-bold text-text-muted transition-colors hover:bg-gray-50 active:scale-95"
                            onClick={() => setExpandedMovementId(isExpanded ? null : m.id)}
                          >
                            {isExpanded ? 'Hide Tracks ▴' : 'Manage Tracks ▾'}
                          </button>
                          <button
                            type="button"
                            className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-danger-text transition-colors hover:bg-danger-bg active:scale-95"
                            onClick={() => handleDeleteMovement(m.id, m.title)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                          <strong className="block text-[11px] tracking-wider text-text-muted uppercase">
                            🎵 Reference & Learning Tracks for {m.title}
                          </strong>
                          <LearningTracksEditor
                            piece={m}
                            voiceParts={voiceParts}
                            sections={sections}
                            uploadingParts={uploadingParts}
                            uploadingKeyPrefix={`${m.id}_`}
                            onUpload={(part, file) => handleMovementFileUpload(m, part, file)}
                            onDelete={(part) => handleMovementFileDelete(m, part)}
                            manuallyAddedParts={manuallyAddedParts[m.id] || []}
                            onAddPart={(part) => handleAddPart(m.id, part)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
              <h4 className="m-0 mb-3 text-sm font-bold text-primary-deep">Add New Movement</h4>
              <div className="flex flex-row flex-wrap items-end gap-3">
                <div className="flex flex-[2_1_200px] flex-col gap-1.5">
                  <label className="text-label">
                    Movement Name (defaults sequentially)
                  </label>
                  <Input
                    type="text"
                    placeholder={`e.g. Movement ${movements.length + 1}`}
                    value={newMovementTitle}
                    onChange={(e) => setNewMovementTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddMovement(e);
                      }
                    }}
                    
                  />
                </div>
                <div className="flex flex-[1_1_100px] flex-col gap-1.5">
                  <label className="text-label">
                    Duration (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 2:45"
                    value={newMovementDuration}
                    onChange={(e) => setNewMovementDuration(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddMovement(e);
                      }
                    }}
                    
                  />
                </div>
                <button
                  type="button"
                  className="flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-white shadow-md transition-all enabled:hover:bg-primary-deep enabled:active:scale-95 disabled:opacity-50"
                  onClick={handleAddMovement}
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
      </div>
    </Modal>
  );
}
