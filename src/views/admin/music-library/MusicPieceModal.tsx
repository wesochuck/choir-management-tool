import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BaseModal } from '../../../components/common/BaseModal';
import { useDialog } from '../../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../../services/musicLibraryService';
import { eventService, type Event } from '../../../services/eventService';
import { venueService, type Venue } from '../../../services/venueService';
import { getVoicePartsAndSections, type VoicePartDef, type SectionDef, type MusicGenreDef } from '../../../services/settingsService';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { pb } from '../../../lib/pocketbase';
import { formatSecondsToDuration, resolveCatalogLookupUrl, isValidDurationString, getLearningTrackContextLabel } from '../../../lib/musicPieceUtils';
import { LearningTracksEditor } from './LearningTracksEditor';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { zonedInputValueToUtc } from '../../../lib/timezone';
import { AutocompleteInput } from '../../../components/admin/AutocompleteInput';
import './MusicPieceModal.css';
import './MusicLibraryEditors.css';

export interface MusicPieceModalProps {
    isOpen: boolean;
    piece: MusicPiece | null;
    onClose: () => void;
    onSave: (data: Partial<MusicPieceInput> & { 
        tuttiFile?: File | null; 
        movements?: { title: string; duration?: string }[] 
    }) => Promise<void>;
    onSaveAndAddAnother?: (data: Partial<MusicPieceInput> & {
        tuttiFile?: File | null;
        movements?: { title: string; duration?: string }[];
    }) => Promise<void>;
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
    initialTab
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
        (allPieces || []).forEach(p => {
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
    const [activeTab, setActiveTab] = useState<'details' | 'tracks' | 'performances' | 'movements'>('details');

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
    const [localMovementsList, setLocalMovementsList] = useState<{ id: string; title: string; duration?: string }[]>([]);
    const [tuttiFile, setTuttiFile] = useState<File | null>(null);
    const [isTuttiDraggedOver, setIsTuttiDraggedOver] = useState(false);
    const [stagingMovTitle, setStagingMovTitle] = useState('');
    const [stagingMovDuration, setStagingMovDuration] = useState('');

    const parentPiece = piece?.parentId && allPieces
        ? allPieces.find(p => p.id === piece.parentId)
        : undefined;

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
                sort: 'created'
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
            eventService.getEvents().then(events => {
                setAllPerformances(events.filter(e => e.type === 'Performance'));
            }).catch(console.error);

            // Load venues for quick add
            venueService.getVenues().then(setVenues).catch(console.error);

            // Load voice parts and sections
            getVoicePartsAndSections().then(data => {
                setVoiceParts(data.voiceParts);
                setSections(data.sections);
            }).catch(console.error);

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
                ? (() => { const p = piece.purchaseDate.split('-'); return p.length >= 2 ? `${p[1]}/${p[0]}` : ''; })()
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
            const performancesChanged = JSON.stringify(initialPerformances) !== JSON.stringify(currentPerformances);

            return titleChanged || composerChanged || arrangerChanged || durationChanged || copiesChanged || catalogIdChanged || notesChanged || sectionsChanged || genresChanged || performancesChanged || purchaseDateChanged;
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

            return hasTitle || hasComposer || hasArranger || hasDuration || hasCopies || hasCatalogId || hasNotes || hasSections || hasGenres || hasPerformances || hasTutti || hasStagedMovements || hasPurchaseDate;
        }
    }, [piece, title, composer, arranger, duration, copies, catalogId, notes, sectionBuckets, selectedGenres, selectedPerformanceIds, initialTitle, tuttiFile, localMovementsList, purchaseDateInput]);

    const handleClose = async () => {
        if (isDirty) {
            const confirmDiscard = await dialog.confirm({
                title: 'Unsaved Changes',
                message: piece 
                    ? 'You have unsaved changes to this music piece. Do you want to discard them?' 
                    : 'You are adding a new music piece with unsaved details. Do you want to discard this piece?',
                confirmLabel: 'Discard Changes',
                cancelLabel: 'Keep Editing',
                variant: 'warning'
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
        
        setLocalMovementsList(prev => [
            ...prev,
            {
                id: `staged_${Date.now()}_${Math.random()}`,
                title: titleVal,
                duration: stagingMovDuration.trim() || undefined
            }
        ]);
        setStagingMovTitle('');
        setStagingMovDuration('');
    };

    const handleRemoveStagingMovement = (id: string) => {
        setLocalMovementsList(prev => prev.filter(m => m.id !== id));
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
        
        setUploadingParts(prev => ({ ...prev, [voicePart]: true }));
        try {
            const existingFilename = localPiece.audioTrackMapping?.[voicePart];
            let currentFiles = localPiece.audioFiles || [];
            const currentMapping = { ...(localPiece.audioTrackMapping || {}) };
            
            if (existingFilename) {
                currentFiles = currentFiles.filter(f => f !== existingFilename);
                delete currentMapping[voicePart];
            }
            
            const formData = new FormData();
            currentFiles.forEach(f => {
                formData.append('audioFiles', f);
            });
            formData.append('audioFiles', file);
            
            const updatedPiece = await musicLibraryService.updatePiece(localPiece.id, formData);
            
            const oldFiles = localPiece.audioFiles || [];
            const newFiles = updatedPiece.audioFiles || [];
            const addedFilename = newFiles.find(f => !oldFiles.includes(f));
            
            if (addedFilename) {
                currentMapping[voicePart] = addedFilename;
                const finalPiece = await musicLibraryService.updatePiece(localPiece.id, {
                    audioTrackMapping: currentMapping
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
                message: 'Failed to upload the audio track. Ensure the file is under 20MB and is a valid audio format.',
                variant: 'danger'
            });
        } finally {
            setUploadingParts(prev => ({ ...prev, [voicePart]: false }));
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
            confirmLabel: 'Delete'
        });
        if (!confirmed) return;
        
        try {
            const filesToKeep = (localPiece.audioFiles || []).filter(f => f !== filename);
            const newMapping = { ...(localPiece.audioTrackMapping || {}) };
            delete newMapping[voicePart];
            
            const updatedPiece = await musicLibraryService.updatePiece(localPiece.id, {
                audioFiles: filesToKeep,
                audioTrackMapping: newMapping
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
                variant: 'danger'
            });
        }
    };

    const handleMovementFileUpload = async (movement: MusicPiece, voicePart: string, file: File) => {
        const uploadKey = `${movement.id}_${voicePart}`;
        setUploadingParts(prev => ({ ...prev, [uploadKey]: true }));
        try {
            const existingFilename = movement.audioTrackMapping?.[voicePart];
            let currentFiles = movement.audioFiles || [];
            const currentMapping = { ...(movement.audioTrackMapping || {}) };
            
            if (existingFilename) {
                currentFiles = currentFiles.filter(f => f !== existingFilename);
                delete currentMapping[voicePart];
            }
            
            const formData = new FormData();
            currentFiles.forEach(f => {
                formData.append('audioFiles', f);
            });
            formData.append('audioFiles', file);
            
            const updatedPiece = await musicLibraryService.updatePiece(movement.id, formData);
            
            const oldFiles = movement.audioFiles || [];
            const newFiles = updatedPiece.audioFiles || [];
            const addedFilename = newFiles.find(f => !oldFiles.includes(f));
            
            if (addedFilename) {
                currentMapping[voicePart] = addedFilename;
                await musicLibraryService.updatePiece(movement.id, {
                    audioTrackMapping: currentMapping
                });
                
                await loadMovements();
            } else {
                throw new Error('Upload succeeded but no new filename returned.');
            }
        } catch (err) {
            console.error(err);
            dialog.showMessage({
                title: 'Upload Failed',
                message: 'Failed to upload the audio track for this movement. Ensure the file is under 20MB and is a valid audio format.',
                variant: 'danger'
            });
        } finally {
            setUploadingParts(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    const handleMovementFileDelete = async (movement: MusicPiece, voicePart: string) => {
        const filename = movement.audioTrackMapping?.[voicePart];
        if (!filename) return;
        
        const confirmed = await dialog.confirm({
            title: 'Delete Learning Track',
            message: `Are you sure you want to delete the track for ${voicePart === 'tutti' ? 'Tutti' : voicePart} in this movement?`,
            variant: 'danger',
            confirmLabel: 'Delete'
        });
        if (!confirmed) return;
        
        try {
            const filesToKeep = (movement.audioFiles || []).filter(f => f !== filename);
            const newMapping = { ...(movement.audioTrackMapping || {}) };
            delete newMapping[voicePart];
            
            await musicLibraryService.updatePiece(movement.id, {
                audioFiles: filesToKeep,
                audioTrackMapping: newMapping
            });
            
            await loadMovements();
            
            dialog.showToast('Movement audio track deleted successfully.');
        } catch (err) {
            console.error(err);
            dialog.showMessage({
                title: 'Error',
                message: 'Failed to delete the movement audio track.',
                variant: 'danger'
            });
        }
    };

    const handleAddPart = (id: string, part: string) => {
        setManuallyAddedParts(prev => ({
            ...prev,
            [id]: [...(prev[id] || []), part]
        }));
    };

    const handleDeleteMovement = async (mId: string, mTitle: string) => {
        const confirmed = await dialog.confirm({
            title: 'Delete Movement',
            message: `Are you sure you want to delete the movement "${mTitle}"?`,
            variant: 'danger',
            confirmLabel: 'Delete'
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
                variant: 'danger'
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
                performances: []
            });
            
            setNewMovementTitle('');
            setNewMovementDuration('');
            await loadMovements();
        } catch (err) {
            console.error(err);
            dialog.showMessage({
                title: 'Error',
                message: 'Failed to add movement.',
                variant: 'danger'
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

        const existing = allGenres.find(g => g.label.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            if (!selectedGenres.includes(existing.id)) {
                setSelectedGenres(prev => [...prev, existing.id]);
            }
            return { id: existing.id, label: existing.label };
        }

        const newGenre = await onCreateGenre(trimmed);
        if (!selectedGenres.includes(newGenre.id)) {
            setSelectedGenres(prev => [...prev, newGenre.id]);
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
            movements: (!piece && isMultiMovementInput)
                ? localMovementsList.map(m => ({ title: m.title, duration: m.duration }))
                : undefined
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const normalizedDuration = duration.trim();
            if (normalizedDuration && !isValidDurationString(normalizedDuration)) {
                await dialog.showMessage({
                    title: 'Invalid Duration',
                    message: 'Use a duration like 3:30, 1:05:00, 15, 15m, or 1h 5m.',
                    variant: 'danger'
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
                variant: 'danger'
            });
            return;
        }
        if (!title.trim()) {
            await dialog.showMessage({
                title: 'Title Required',
                message: 'Please enter a title for the piece.',
                variant: 'warning'
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
                variant: 'warning'
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
                details: 'Quick added from music library historic logs'
            });

            // Update local performance selection list
            setAllPerformances(prev => [newPerf, ...prev]);
            setSelectedPerformanceIds(prev => [...prev, newPerf.id]);

            // Reset quick add fields
            setQuickTitle('');
            setQuickDate('');
            setQuickVenue('');
            setShowQuickAdd(false);
            
            dialog.showMessage({
                title: 'Success',
                message: `Created performance "${newPerf.title}" and linked it to this piece.`,
                variant: 'info'
            });
        } catch (err) {
            console.error(err);
            dialog.showMessage({
                title: 'Error',
                message: 'Failed to create the performance.',
                variant: 'danger'
            });
        } finally {
            setIsQuickAdding(false);
        }
    };

    const togglePerformance = (perfId: string) => {
        setSelectedPerformanceIds(prev => 
            prev.includes(perfId) ? prev.filter(id => id !== perfId) : [...prev, perfId]
        );
    };

    const selectedPerformances = allPerformances.filter(p => selectedPerformanceIds.includes(p.id));
    const availablePerformances = allPerformances.filter(p => !selectedPerformanceIds.includes(p.id));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={piece ? 'Edit Piece' : 'Add Piece'}
            maxWidth="640px"
            minHeight={piece ? '580px' : undefined}
            footer={
                <>
                    {onDelete && <button type="button" className="btn btn-danger mle-modal-delete-btn" onClick={() => { onClose(); onDelete(); }}>Delete</button>}
                    <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
                    {!piece && onSaveAndAddAnother && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={isSaving}
                            onClick={handleSaveAndAddAnother}
                        >
                            {isSaving ? 'Saving...' : 'Save & Add Another'}
                        </button>
                    )}
                    <button type="submit" form="music-piece-form" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Piece'}
                    </button>
                </>
            }
        >
            {piece && (
                <div className="music-piece-tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('details')}
                        className={`music-piece-tab-btn ${activeTab === 'details' ? 'active' : 'inactive'}`}
                    >
                        Piece Details
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('tracks')}
                        className={`music-piece-tab-btn ${activeTab === 'tracks' ? 'active' : 'inactive'}`}
                    >
                        Learning Tracks
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('performances')}
                        className={`music-piece-tab-btn ${activeTab === 'performances' ? 'active' : 'inactive'}`}
                    >
                        Linked Performances
                    </button>
                    {isMultiMovement && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('movements')}
                            className={`music-piece-tab-btn ${activeTab === 'movements' ? 'active' : 'inactive'}`}
                        >
                            Movements ({movements.length})
                        </button>
                    )}
                </div>
            )}

            <form id="music-piece-form" onSubmit={handleSubmit} className="music-piece-form">
                {(!piece || activeTab === 'details') && (
                    <>
                        {/* NEW LINKED PARENT BANNER NOTICE */}
                        {parentPiece && (
                            <div className="parent-piece-banner">
                                <span>
                                    🔗 <strong>Multi-Movement Link:</strong> This piece is configured as a movement of <strong>{parentPiece.title}</strong>.
                                </span>
                            </div>
                        )}

                        <div className="form-field-group">
                            <label className="text-label">Title</label>
                            <input ref={titleInputRef} required value={title} onChange={e => setTitle(e.target.value)} className="card music-piece-input" />
                        </div>
                        <div className="mle-form-grid-2col">
                            <div className="form-field-group">
                                <label className="text-label">Composer</label>
                                <AutocompleteInput 
                                    value={composer} 
                                    onChange={setComposer} 
                                    suggestions={uniqueComposers} 
                                    placeholder="e.g. Ludwig van Beethoven" 
                                    className="card music-piece-input" 
                                />
                            </div>
                            <div className="form-field-group">
                                <label className="text-label">Arranger</label>
                                <AutocompleteInput 
                                    value={arranger} 
                                    onChange={setArranger} 
                                    suggestions={uniqueArrangers} 
                                    placeholder="e.g. Alice Parker" 
                                    className="card music-piece-input" 
                                />
                            </div>
                        </div>

                        <div className="mle-form-grid-2col">
                            <div className="form-field-group">
                                <label className="text-label">Applies to Sections</label>
                                <MultiSelectDropdown
                                    label="Applies to Sections"
                                    options={sections.map(s => ({ id: s.code, label: s.name }))}
                                    selectedIds={sectionBuckets}
                                    onChange={setSectionBuckets}
                                    placeholder="Sections"
                                    allLabel="All Sections"
                                />
                                <span className="text-xs text-muted mle-input-hint">
                                    {sectionBuckets.length === 0 
                                        ? "Applies to all sections. Select to restrict." 
                                        : `Restricted to: ${sectionBuckets.map(code => sections.find(s => s.code === code)?.name || code).join(', ')}`
                                    }
                                </span>
                            </div>

                            <div className="form-field-group">
                                <label className="text-label">Genres</label>
                                <MultiSelectDropdown
                                    label="Genres"
                                    options={[...allGenres].sort((a, b) => a.label.localeCompare(b.label)).map(g => ({ id: g.id, label: g.label }))}
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
                            <div className="mle-checkbox-row-no-margin">
                                <input 
                                    type="checkbox" 
                                    id="is-multi-movement"
                                    checked={isMultiMovement} 
                                    onChange={e => setIsMultiMovement(e.target.checked)}
                                    className="mle-checkbox-input"
                                />
                                <label htmlFor="is-multi-movement" className="text-label mle-checkbox-label">
                                    This is a multi-movement piece
                                </label>
                            </div>
                        ) : (
                            <div className="form-field-group-no-margin">
                                <div className="mle-checkbox-row">
                                    <input 
                                        type="checkbox" 
                                        id="is-multi-movement-input"
                                        checked={isMultiMovementInput} 
                                        onChange={e => {
                                            setIsMultiMovementInput(e.target.checked);
                                        }}
                                        className="mle-checkbox-input-styled"
                                    />
                                    <label htmlFor="is-multi-movement-input" className="text-label mle-checkbox-label">
                                        This piece has multiple movements
                                    </label>
                                </div>
                                {isMultiMovementInput && (
                                    <div className="multi-movement-staging">
                                        <div className="mle-staging-header-row">
                                            <span className="staging-movements-header">Staged Movements ({localMovementsList.length})</span>
                                        </div>
                                        
                                        {localMovementsList.length > 0 && (
                                            <div className="staging-movements-list">
                                                {localMovementsList.map((m, idx) => (
                                                    <div key={m.id} className="staged-movement-item animate-fade-in">
                                                        <span className="staged-movement-text">{idx + 1}. {m.title} {m.duration ? `(${m.duration})` : ''}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveStagingMovement(m.id)}
                                                            className="staged-remove-btn"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mle-staging-input-row">
                                            <input 
                                                type="text" 
                                                placeholder={`Name (e.g. Movement ${localMovementsList.length + 1})`}
                                                value={stagingMovTitle}
                                                onChange={e => setStagingMovTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        handleAddStagingMovement(e);
                                                    }
                                                }}
                                                className="card mle-staging-input-name"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 2:45"
                                                value={stagingMovDuration}
                                                onChange={e => setStagingMovDuration(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        handleAddStagingMovement(e);
                                                    }
                                                }}
                                                className="card mle-staging-input-duration"
                                            />
                                            <button 
                                                type="button" 
                                                className="btn btn-primary mle-staging-add-btn"
                                                onClick={() => handleAddStagingMovement()}
                                            >
                                                + Stage
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mle-form-grid-duration">
                            <div className="form-field-group">
                                <label className="text-label">Duration</label>
                                <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3:30" className="card music-piece-input" />
                                {suggestedDuration && !duration.trim() && (
                                    <div className="duration-suggestion-box">
                                        <span className="text-xs text-muted mle-duration-suggestion-text">
                                            💡 Track length: <strong>{suggestedDuration}</strong>. Use this?
                                        </span>
                                        <button 
                                            type="button"
                                            className="btn btn-secondary btn-sm mle-duration-suggestion-apply-btn"
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
                            <div className="form-field-group">
                                <label className="text-label">Copies</label>
                                <input type="number" value={copies} onChange={e => setCopies(e.target.value)} className="card music-piece-input" />
                            </div>
                            <div className="form-field-group">
                                <label className="text-label">Catalog ID</label>
                                <input value={catalogId} onChange={e => setCatalogId(e.target.value)} className="card music-piece-input" />
                                {catalogId.trim() && catalogLookupTemplate && resolveCatalogLookupUrl(catalogLookupTemplate, catalogId) && (
                                    <a 
                                        href={resolveCatalogLookupUrl(catalogLookupTemplate, catalogId)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary mle-catalog-lookup-link"
                                    >
                                        Lookup ↗
                                    </a>
                                )}
                            </div>
                            <div className="form-field-group">
                                <label className="text-label">Purchase Date</label>
                                <input
                                    value={purchaseDateInput}
                                    onChange={e => setPurchaseDateInput(e.target.value)}
                                    placeholder="mm/yyyy"
                                    className="card music-piece-input"
                                />
                            </div>
                        </div>
                        <div className="form-field-group">
                            <label className="text-label">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. A cappella, performance instructions, etc." className="card music-piece-textarea" />
                            <span className="text-xs text-muted mle-notes-hint">
                                If this is a medley, please list the names of the different pieces here.
                            </span>
                        </div>


                        {!piece && (
                            <>
                            <div className="form-field-group mle-mt-xs">
                                <label className="text-label">Link to Past Performance (Optional)</label>
                                <div className="mle-perf-pills-container">
                                    {selectedPerformances.length === 0 ? (
                                        <span className="text-sm text-muted">No performances linked.</span>
                                    ) : (
                                        selectedPerformances.map(perf => {
                                            const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
                                            return (
                                                <div key={perf.id} className="linked-performance-pill">
                                                    <span>{perf.title} {dateStr && `(${dateStr})`}</span>
                                                    <button type="button" onClick={() => togglePerformance(perf.id)} className="mle-perf-pill-remove-btn">×</button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <select
                                    className="card mle-perf-select-full"
                                    value=""
                                    onChange={e => {
                                        if (e.target.value) togglePerformance(e.target.value);
                                    }}
                                >
                                    <option value="">-- Link a past performance --</option>
                                    {availablePerformances.map(perf => {
                                        const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
                                        return (
                                            <option key={perf.id} value={perf.id}>
                                                {perf.title} {dateStr && `(${dateStr})`}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="form-field-group mle-mt-xs">
                                <label className="text-label">Tutti Practice Track (Optional)</label>
                                {tuttiFile ? (
                                    <div className="mle-tutti-preview-row animate-fade-in">
                                        <div className="mle-tutti-info-col">
                                            <span className="mle-tutti-icon-emoji">🎵</span>
                                            <div className="mle-tutti-text-stack">
                                                <strong className="mle-tutti-filename">
                                                    {tuttiFile.name}
                                                </strong>
                                                <span className="text-xs text-muted">
                                                    {(tuttiFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn btn-ghost btn-sm mle-tutti-remove-btn" 
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
                                        className={`tutti-upload-dropzone ${isTuttiDraggedOver ? 'active' : 'idle'}`}
                                    >
                                        <label className="tutti-upload-label">
                                            <span className="mle-tutti-upload-emoji">📤</span>
                                            <span className="mle-tutti-upload-hint">
                                                Drag and drop a Tutti MP3 track here, or <span className="mle-tutti-upload-browse-text">browse</span>
                                            </span>
                                            <input 
                                                type="file" 
                                                accept="audio/*" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setTuttiFile(file);
                                                    }
                                                }}
                                                className="mle-hidden-input"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                            </>
                        )}
                    </>
                )}

                {(piece && activeTab === 'performances') && (
                    <>
                        <div className="form-field-group">
                            <label className="text-label">Linked Performances</label>
                            
                            {/* Selected performances pills */}
                            <div className="mle-perf-pills-container-tracks">
                                {selectedPerformances.length === 0 ? (
                                    <span className="text-sm text-muted">No performances linked.</span>
                                ) : (
                                    selectedPerformances.map(perf => {
                                        const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
                                        return (
                                            <div key={perf.id} className="linked-performance-pill">
                                                <span>{perf.title} {dateStr && `(${dateStr})`}</span>
                                                <button type="button" onClick={() => togglePerformance(perf.id)} className="mle-perf-pill-remove-btn">×</button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="mle-perf-actions-row">
                                <select 
                                    className="card mle-perf-select-dropdown" 
                                    value="" 
                                    onChange={e => {
                                        if (e.target.value) {
                                            togglePerformance(e.target.value);
                                        }
                                    }}
                                >
                                    <option value="">-- Add a performance --</option>
                                    {availablePerformances.map(perf => {
                                        const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
                                        return (
                                            <option key={perf.id} value={perf.id}>
                                                {perf.title} {dateStr && `(${dateStr})`}
                                            </option>
                                        );
                                    })}
                                </select>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary btn-sm mle-quick-add-btn" 
                                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                                >
                                    {showQuickAdd ? 'Cancel Quick Add' : 'Quick Add Performance'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Add Performance form */}
                        {showQuickAdd && (
                            <div className="quick-add-performance-card card">
                                <h4 className="text-sm mle-quick-add-title">Quick Add Historic Performance</h4>
                                <div className="form-field-group">
                                    <div className="form-field-group">
                                        <label className="text-xs text-muted">Performance Title</label>
                                        <input 
                                            value={quickTitle} 
                                            onChange={e => setQuickTitle(e.target.value)} 
                                            placeholder="e.g. Spring Concert 2018"
                                            className="card mle-quick-add-field" 
                                        />
                                    </div>
                                    
                                    <div className="mle-quick-add-grid-row">
                                        <div className="form-field-group">
                                            <label className="text-xs text-muted">Date</label>
                                            <input 
                                                type="datetime-local" 
                                                value={quickDate} 
                                                onChange={e => setQuickDate(e.target.value)} 
                                                className="card mle-quick-add-field" 
                                            />
                                        </div>
                                        <div className="form-field-group">
                                            <label className="text-xs text-muted">Venue</label>
                                            <select 
                                                value={quickVenue} 
                                                onChange={e => setQuickVenue(e.target.value)} 
                                                className="card mle-quick-add-select-field" 
                                            >
                                                <option value="">-- Select Venue --</option>
                                                {venues.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button 
                                        type="button" 
                                        className="btn btn-primary btn-sm mle-quick-add-submit-btn" 
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

                {(piece && activeTab === 'tracks') && (
                    <div 
                        className="flex-col mle-tracks-tab-content" 
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
                            const parentPiece = piece.parentId && allPieces
                                ? allPieces.find(p => p.id === piece.parentId)
                                : undefined;
                            const contextLabel = getLearningTrackContextLabel(
                                piece,
                                parentPiece?.title
                            );
                            return (
                                <div className="learning-tracks-context-header">
                                    <span className="learning-tracks-context-label">
                                        🎵 Learning Tracks for
                                    </span>
                                    <span className="learning-tracks-piece-title">
                                        {contextLabel}
                                    </span>
                                </div>
                            );
                        })()}
                        {!localPiece ? (
                            <div className="mle-tracks-editor-fallback-container">
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

                {(piece && activeTab === 'movements' && isMultiMovement) && (
                    <div className="flex-col mle-movements-tab-content">
                        <div className="flex-row animate-fade-in mle-movements-section-header">
                            <h3 className="text-md mle-movements-section-title">Movements ({movements.length})</h3>
                        </div>

                        {movements.length === 0 ? (
                            <div className="card admin-empty-state">
                                No movements added yet. Add your first movement below.
                            </div>
                        ) : (
                            <div className="flex-col mle-movements-list-container">
                                {movements.map((m, idx) => {
                                    const isExpanded = expandedMovementId === m.id;
                                    const mMapping = m.audioTrackMapping || {};
                                    const mTrackCount = Object.keys(mMapping).filter(k => mMapping[k]).length;
                                    return (
                                        <div 
                                            key={m.id} 
                                            className="movement-item-card card"
                                        >
                                            <div className="flex-row mle-movement-item-header">
                                                <div className="flex-col">
                                                    <div className="flex-row mle-movement-item-title-row">
                                                        <strong className="mle-movement-item-title-strong">
                                                            {idx + 1}. {m.title}
                                                        </strong>
                                                        {mTrackCount > 0 && (
                                                            <span className="movement-track-badge">
                                                                🎧 {mTrackCount} Track{mTrackCount !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {m.duration && (
                                                        <span className="text-xs text-muted">
                                                            Duration: {m.duration}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-row mle-movement-item-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm mle-movement-item-btn"
                                                        onClick={() => setExpandedMovementId(isExpanded ? null : m.id)}
                                                    >
                                                        {isExpanded ? 'Hide Tracks ▴' : 'Manage Tracks ▾'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm mle-movement-item-btn mle-movement-item-btn-danger"
                                                        onClick={() => handleDeleteMovement(m.id, m.title)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="flex-col mle-movement-tracks-editor-wrapper">
                                                    <strong className="mle-movement-tracks-editor-label">
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

                        <div className="card mle-movement-add-form-container">
                            <h4 className="text-sm mle-movement-add-title">Add New Movement</h4>
                            <div className="flex-row mle-movement-add-inputs-row">
                                <div className="flex-col mle-movement-add-name-group">
                                    <label className="text-xs text-muted">Movement Name (defaults sequentially)</label>
                                    <input 
                                        type="text" 
                                        placeholder={`e.g. Movement ${movements.length + 1}`}
                                        value={newMovementTitle}
                                        onChange={e => setNewMovementTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleAddMovement(e);
                                            }
                                        }}
                                        className="card mle-movement-add-input-field"
                                    />
                                </div>
                                <div className="flex-col mle-movement-add-duration-group">
                                    <label className="text-xs text-muted">Duration (optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 2:45"
                                        value={newMovementDuration}
                                        onChange={e => setNewMovementDuration(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleAddMovement(e);
                                            }
                                        }}
                                        className="card mle-movement-add-input-field"
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    className="btn btn-primary mle-movement-add-submit-btn"
                                    onClick={handleAddMovement}
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </BaseModal>
    );
}
