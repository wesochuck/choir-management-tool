import React, { useState, useEffect, useCallback } from 'react';
import { BaseModal } from '../../../components/common/BaseModal';
import { useDialog } from '../../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../../services/musicLibraryService';
import { eventService, type Event } from '../../../services/eventService';
import { venueService, type Venue } from '../../../services/venueService';
import { getVoicePartsAndSections, type VoicePartDef, type SectionDef, type MusicGenreDef } from '../../../services/settingsService';
import { pb } from '../../../lib/pocketbase';
import { formatSecondsToDuration, resolveCatalogLookupUrl, isValidDurationString, getLearningTrackContextLabel } from '../../../lib/musicPieceUtils';
import { LearningTracksEditor } from './LearningTracksEditor';

export interface MusicPieceModalProps {
    isOpen: boolean;
    piece: MusicPiece | null;
    onClose: () => void;
    onSave: (data: Partial<MusicPieceInput> & { 
        tuttiFile?: File | null; 
        movements?: { title: string; duration?: string }[] 
    }) => Promise<void>;
    onDelete?: () => Promise<void>;
    catalogLookupTemplate?: string;
    onRefresh?: () => Promise<void>;
    allPieces?: MusicPiece[];
    allGenres: MusicGenreDef[];
}

export function MusicPieceModal({ 
    isOpen, 
    piece, 
    onClose, 
    onSave, 
    onDelete, 
    catalogLookupTemplate, 
    onRefresh, 
    allPieces,
    allGenres
}: MusicPieceModalProps) {
    const dialog = useDialog();
    const [title, setTitle] = useState('');
    const [composer, setComposer] = useState('');
    const [duration, setDuration] = useState('');
    const [copies, setCopies] = useState<string>('');
    const [catalogId, setCatalogId] = useState('');
    const [sectionBuckets, setSectionBuckets] = useState<string[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedPerformanceIds, setSelectedPerformanceIds] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
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
        }
    }, [isOpen]);

    useEffect(() => {
        setLocalPiece(piece);
        if (piece) {
            setTitle(piece.title);
            setComposer(piece.composer || '');
            setDuration(piece.duration || '');
            setCopies(piece.copies?.toString() || '');
            setCatalogId(piece.catalogId || '');
            setSectionBuckets(piece.sectionBuckets || []);
            setSelectedGenres(piece.genres || []);
            setSelectedPerformanceIds(piece.performances || []);
            setNotes(piece.notes || '');
            loadMovements();
            setIsMultiMovementInput(false);
            setLocalMovementsList([]);
            setTuttiFile(null);
            setIsTuttiDraggedOver(false);
            setStagingMovTitle('');
            setStagingMovDuration('');
        } else {
            setTitle('');
            setComposer('');
            setDuration('');
            setCopies('');
            setCatalogId('');
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
        setActiveTab('details');
        setNewMovementTitle('');
        setNewMovementDuration('');
        setExpandedMovementId(null);
        setSuggestedDuration(null);
        setManuallyAddedParts({});
    }, [piece, isOpen, loadMovements]);

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
            dialog.showMessage({
                title: 'Success',
                message: 'Movement deleted successfully.',
                variant: 'info'
            });
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

            await onSave({
                title,
                composer,
                duration: normalizedDuration || undefined,
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
            });
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
            const newPerf = await eventService.createEvent({
                title: quickTitle,
                date: quickDate,
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
            onClose={onClose}
            title={piece ? 'Edit Piece' : 'Add Piece'}
            maxWidth="640px"
            minHeight={piece ? '580px' : undefined}
            footer={
                <>
                    {onDelete && <button type="button" className="btn btn-danger" onClick={() => { onClose(); onDelete(); }} style={{ marginRight: 'auto' }}>Delete</button>}
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="music-piece-form" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Piece'}
                    </button>
                </>
            }
        >
            {(piece || isMultiMovementInput) && (
                <div className="flex-row" style={{ borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-md)', gap: 'var(--space-md)' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('details')}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'details' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-muted)',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: activeTab === 'details' ? 600 : 500,
                            transition: 'all 0.2s',
                        }}
                    >
                        Piece Details
                    </button>
                    {piece && (
                        <>
                            <button
                                type="button"
                                onClick={() => setActiveTab('tracks')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: activeTab === 'tracks' ? '2px solid var(--primary)' : '2px solid transparent',
                                    color: activeTab === 'tracks' ? 'var(--primary)' : 'var(--text-muted)',
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: activeTab === 'tracks' ? 600 : 500,
                                    transition: 'all 0.2s',
                                }}
                            >
                                Learning Tracks
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('performances')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: activeTab === 'performances' ? '2px solid var(--primary)' : '2px solid transparent',
                                    color: activeTab === 'performances' ? 'var(--primary)' : 'var(--text-muted)',
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: activeTab === 'performances' ? 600 : 500,
                                    transition: 'all 0.2s',
                                }}
                            >
                                Linked Performances
                            </button>
                        </>
                    )}
                    {piece && isMultiMovement && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('movements')}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'movements' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'movements' ? 'var(--primary)' : 'var(--text-muted)',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: activeTab === 'movements' ? 600 : 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            Movements ({movements.length})
                        </button>
                    )}
                    {!piece && isMultiMovementInput && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('movements')}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'movements' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'movements' ? 'var(--primary)' : 'var(--text-muted)',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: activeTab === 'movements' ? 600 : 500,
                                transition: 'all 0.2s',
                                display: 'inline-flex',
                                alignItems: 'center'
                            }}
                        >
                            Movements
                            <span 
                                title={`${localMovementsList.length} staged movements`}
                                style={{ 
                                    fontSize: '11px', 
                                    backgroundColor: 'var(--primary, #1b4d3e)', 
                                    color: '#ffffff', 
                                    padding: '2px 6px', 
                                    borderRadius: '10px', 
                                    marginLeft: '6px',
                                    fontWeight: 600,
                                    lineHeight: 1
                                }}
                            >
                                {localMovementsList.length}
                            </span>
                            <span 
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    marginLeft: '6px',
                                    display: 'inline-block'
                                }}
                                title="Tab Available"
                            />
                        </button>
                    )}
                </div>
            )}

            <form id="music-piece-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
                {(!piece || activeTab === 'details') && (
                    <>
                        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                            <label className="text-label">Title</label>
                            <input required value={title} onChange={e => setTitle(e.target.value)} className="card" style={{ padding: '0 12px', height: '40px' }} />
                        </div>
                        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                            <label className="text-label">Composer/Arranger</label>
                            <input value={composer} onChange={e => setComposer(e.target.value)} className="card" style={{ padding: '0 12px', height: '40px' }} />
                        </div>
                        {piece ? (
                            <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', margin: '4px 0' }}>
                                <input 
                                    type="checkbox" 
                                    id="is-multi-movement"
                                    checked={isMultiMovement} 
                                    onChange={e => setIsMultiMovement(e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <label htmlFor="is-multi-movement" className="text-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 500 }}>
                                    This is a multi-movement piece
                                </label>
                            </div>
                        ) : (
                            <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', margin: '4px 0' }}>
                                <input 
                                    type="checkbox" 
                                    id="is-multi-movement-input"
                                    checked={isMultiMovementInput} 
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setIsMultiMovementInput(checked);
                                        if (checked) {
                                            setActiveTab('movements');
                                        }
                                    }}
                                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                />
                                <label htmlFor="is-multi-movement-input" className="text-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    This piece has multiple movements
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, backgroundColor: 'var(--primary-light)', padding: '1px 5px', borderRadius: '4px' }}>
                                        Movements Tab Enabled
                                    </span>
                                </label>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-md)' }}>
                            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                <label className="text-label">Duration</label>
                                <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3:30" className="card" style={{ padding: '0 12px', height: '40px', width: '100%' }} />
                                {suggestedDuration && !duration.trim() && (
                                    <div className="flex-row" style={{ 
                                        marginTop: '6px', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        backgroundColor: 'var(--primary-light, rgba(27, 77, 62, 0.08))', 
                                        border: '1px dashed rgba(27, 77, 62, 0.3)', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                        <span className="text-xs text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary, #1b4d3e)', fontWeight: 500 }}>
                                            💡 Track length: <strong>{suggestedDuration}</strong>. Use this?
                                        </span>
                                        <button 
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                setDuration(suggestedDuration);
                                                setSuggestedDuration(null);
                                            }}
                                            style={{ padding: '2px 8px', height: '22px', minHeight: '22px', fontSize: '11px', lineHeight: '1', cursor: 'pointer' }}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                <label className="text-label">Copies</label>
                                <input type="number" value={copies} onChange={e => setCopies(e.target.value)} className="card" style={{ padding: '0 12px', height: '40px', width: '100%' }} />
                            </div>
                            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                <label className="text-label">Catalog ID</label>
                                <input value={catalogId} onChange={e => setCatalogId(e.target.value)} className="card" style={{ padding: '0 12px', height: '40px', width: '100%' }} />
                                {catalogId.trim() && catalogLookupTemplate && resolveCatalogLookupUrl(catalogLookupTemplate, catalogId) && (
                                    <a 
                                        href={resolveCatalogLookupUrl(catalogLookupTemplate, catalogId)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                        style={{ 
                                            alignSelf: 'flex-start',
                                            borderRadius: '16px',
                                            fontSize: '0.75rem',
                                            padding: '4px 12px',
                                            height: '24px',
                                            minHeight: '24px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            textDecoration: 'none',
                                            marginTop: '2px',
                                            lineHeight: 1
                                        }}
                                    >
                                        Lookup ↗
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                            <label className="text-label">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. A cappella, performance instructions, etc." className="card" style={{ padding: '12px', minHeight: '80px', resize: 'vertical' }} />
                            <span className="text-xs text-muted" style={{ marginTop: '2px' }}>
                                If this is a medley, please list the names of the different pieces here.
                            </span>
                        </div>

                        <div className="flex-col" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                            <label className="text-label">Applies to Sections</label>
                            <div className="flex-row" style={{ flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-sm)', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                {sections.map(section => (
                                    <label key={section.code} className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={sectionBuckets.includes(section.code)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSectionBuckets(prev => [...prev, section.code]);
                                                } else {
                                                    setSectionBuckets(prev => prev.filter(code => code !== section.code));
                                                }
                                            }}
                                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                        />
                                        <span className="text-sm">{section.name}</span>
                                    </label>
                                ))}
                            </div>
                            <span className="text-xs text-muted">
                                {sectionBuckets.length === 0 
                                    ? "Currently applies to all sections. Select one or more to restrict." 
                                    : `Applies to: ${sectionBuckets.map(code => sections.find(s => s.code === code)?.name || code).join(', ')}`
                                }
                            </span>
                        </div>

                        <div className="flex-col" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                            <label className="text-label">Genres</label>
                            <div className="flex-row" style={{ flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-sm)', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                {allGenres.map(genre => (
                                    <label key={genre.id} className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedGenres.includes(genre.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedGenres(prev => [...prev, genre.id]);
                                                } else {
                                                    setSelectedGenres(prev => prev.filter(id => id !== genre.id));
                                                }
                                            }}
                                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                        />
                                        <span className="text-sm">{genre.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {!piece && (
                            <div className="flex-col" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                                <label className="text-label">Tutti Practice Track (Optional)</label>
                                {tuttiFile ? (
                                    <div 
                                        className="flex-row animate-fade-in" 
                                        style={{ 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            backgroundColor: 'rgba(27, 77, 62, 0.05)',
                                            border: '1px solid var(--primary)',
                                            borderRadius: 'var(--radius)',
                                            gap: 'var(--space-md)'
                                        }}
                                    >
                                        <div className="flex-row" style={{ alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '18px' }}>🎵</span>
                                            <div className="flex-col" style={{ minWidth: 0, flex: 1 }}>
                                                <strong style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                    {tuttiFile.name}
                                                </strong>
                                                <span className="text-xs text-muted">
                                                    {(tuttiFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn btn-ghost btn-sm" 
                                            onClick={() => setTuttiFile(null)}
                                            style={{ color: 'var(--danger)', padding: '4px 8px', height: '28px', minHeight: 'auto', margin: 0 }}
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
                                        style={{
                                            border: isTuttiDraggedOver ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                                            borderRadius: 'var(--radius)',
                                            padding: '20px',
                                            textAlign: 'center',
                                            backgroundColor: isTuttiDraggedOver ? 'rgba(27, 77, 62, 0.04)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        <label style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}>
                                            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📤</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', color: 'var(--text-color)' }}>
                                                Drag and drop a Tutti MP3 track here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
                                            </span>
                                            <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                                                Supported formats: MP3, M4A, WAV (Max 20MB)
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
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {(piece && activeTab === 'performances') && (
                    <>
                        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                            <label className="text-label">Linked Performances</label>
                            
                            {/* Selected performances pills */}
                            <div className="flex-row" style={{ flexWrap: 'wrap', gap: 'var(--space-xs)', minHeight: '40px', padding: 'var(--space-xs) 0' }}>
                                {selectedPerformances.length === 0 ? (
                                    <span className="text-sm text-muted">No performances linked.</span>
                                ) : (
                                    selectedPerformances.map(perf => {
                                        const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
                                        return (
                                            <div key={perf.id} className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', padding: '4px 10px', backgroundColor: 'rgba(74, 124, 89, 0.1)', border: '1px solid var(--primary)', borderRadius: '16px', color: 'var(--primary)', fontSize: '13px' }}>
                                                <span>{perf.title} {dateStr && `(${dateStr})`}</span>
                                                <button type="button" onClick={() => togglePerformance(perf.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: 'bold' }}>×</button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="flex-row" style={{ flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                <select 
                                    className="card" 
                                    value="" 
                                    onChange={e => {
                                        if (e.target.value) {
                                            togglePerformance(e.target.value);
                                        }
                                    }}
                                    style={{ flex: '1 1 200px', padding: '0 12px', height: '40px', minWidth: '0' }}
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
                                    className="btn btn-secondary btn-sm" 
                                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                                    style={{ flex: '1 1 auto', justifyContent: 'center' }}
                                >
                                    {showQuickAdd ? 'Cancel Quick Add' : 'Quick Add Performance'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Add Performance form */}
                        {showQuickAdd && (
                            <div className="card" style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-card-hover)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', marginTop: 'var(--space-xs)' }}>
                                <h4 className="text-sm" style={{ marginTop: 0, marginBottom: 'var(--space-md)', color: 'var(--primary)' }}>Quick Add Historic Performance</h4>
                                <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                        <label className="text-xs text-muted">Performance Title</label>
                                        <input 
                                            value={quickTitle} 
                                            onChange={e => setQuickTitle(e.target.value)} 
                                            placeholder="e.g. Spring Concert 2018"
                                            className="card" 
                                            style={{ padding: '0 12px', height: '36px', fontSize: '14px' }} 
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
                                        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                            <label className="text-xs text-muted">Date</label>
                                            <input 
                                                type="datetime-local" 
                                                value={quickDate} 
                                                onChange={e => setQuickDate(e.target.value)} 
                                                className="card" 
                                                style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }} 
                                            />
                                        </div>
                                        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                            <label className="text-xs text-muted">Venue</label>
                                            <select 
                                                value={quickVenue} 
                                                onChange={e => setQuickVenue(e.target.value)} 
                                                className="card" 
                                                style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }} 
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
                                        className="btn btn-primary btn-sm" 
                                        onClick={handleQuickAddPerformance} 
                                        disabled={isQuickAdding}
                                        style={{ alignSelf: 'flex-end', marginTop: 'var(--space-xs)' }}
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
                        className="flex-col" 
                        style={{ gap: 'var(--space-xs)' }}
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
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    marginBottom: 'var(--space-xs)',
                                    paddingBottom: 'var(--space-sm)',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.07em',
                                        color: 'var(--text-muted)',
                                    }}>
                                        🎵 Learning Tracks for
                                    </span>
                                    <span style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: 'var(--primary)',
                                        letterSpacing: '-0.01em',
                                    }}>
                                        {contextLabel}
                                    </span>
                                </div>
                            );
                        })()}
                        {!localPiece ? (
                            <div className="flex-row" style={{
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-md)',
                                backgroundColor: 'rgba(74, 124, 89, 0.03)',
                                border: '1px dashed var(--border)',
                                borderRadius: 'var(--radius)',
                                color: 'var(--text-muted)',
                                fontSize: '14px',
                                justifyContent: 'center'
                            }}>
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
                    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                        <div className="flex-row animate-fade-in" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="text-md" style={{ margin: 0, color: 'var(--primary)' }}>Movements ({movements.length})</h3>
                        </div>

                        {movements.length === 0 ? (
                            <div className="card" style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No movements added yet. Add your first movement below.
                            </div>
                        ) : (
                            <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                                {movements.map((m, idx) => {
                                    const isExpanded = expandedMovementId === m.id;
                                    const mMapping = m.audioTrackMapping || {};
                                    const mTrackCount = Object.keys(mMapping).filter(k => mMapping[k]).length;
                                    return (
                                        <div 
                                            key={m.id} 
                                            className="card" 
                                            style={{ 
                                                padding: 'var(--space-sm)', 
                                                backgroundColor: 'var(--bg-card-hover)', 
                                                border: '1px solid var(--border)' 
                                            }}
                                        >
                                            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                <div className="flex-col">
                                                    <div className="flex-row" style={{ alignItems: 'center', gap: '8px' }}>
                                                        <strong style={{ fontSize: '14px' }}>
                                                            {idx + 1}. {m.title}
                                                        </strong>
                                                        {mTrackCount > 0 && (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: '1px 6px',
                                                                borderRadius: '10px',
                                                                backgroundColor: 'rgba(27, 77, 62, 0.08)',
                                                                color: 'var(--primary, #1b4d3e)',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                border: '1px solid rgba(27, 77, 62, 0.15)',
                                                                lineHeight: '1.2'
                                                            }}>
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
                                                <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => setExpandedMovementId(isExpanded ? null : m.id)}
                                                        style={{ fontSize: '12px', padding: '4px 8px', height: '28px', minHeight: 'auto' }}
                                                    >
                                                        {isExpanded ? 'Hide Tracks ▴' : 'Manage Tracks ▾'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleDeleteMovement(m.id, m.title)}
                                                        style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px', height: '28px', minHeight: 'auto' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="flex-col" style={{ 
                                                    gap: '4px', 
                                                    marginTop: 'var(--space-sm)'
                                                }}>
                                                    <strong style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>
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

                        <div className="card" style={{ padding: 'var(--space-md)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card-hover)' }}>
                            <h4 className="text-sm" style={{ marginTop: 0, marginBottom: 'var(--space-sm)', color: 'var(--primary)' }}>Add New Movement</h4>
                            <div className="flex-row" style={{ gap: 'var(--space-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div className="flex-col" style={{ gap: '4px', flex: '2 1 200px' }}>
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
                                        className="card"
                                        style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }}
                                    />
                                </div>
                                <div className="flex-col" style={{ gap: '4px', flex: '1 1 100px' }}>
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
                                        className="card"
                                        style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }}
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={handleAddMovement}
                                    style={{ height: '36px', minHeight: '36px', padding: '0 16px', fontSize: '13px' }}
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!piece && activeTab === 'movements' && isMultiMovementInput && (
                    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                        <div className="flex-row animate-fade-in" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="text-md" style={{ margin: 0, color: 'var(--primary)' }}>Staged Movements ({localMovementsList.length})</h3>
                        </div>

                        {localMovementsList.length === 0 ? (
                            <div className="card" style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No movements staged yet. Add your first movement below.
                            </div>
                        ) : (
                            <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                                {localMovementsList.map((m, idx) => (
                                    <div 
                                        key={m.id} 
                                        className="card" 
                                        style={{ 
                                            padding: 'var(--space-sm)', 
                                            backgroundColor: 'var(--bg-card-hover)', 
                                            border: '1px solid var(--border)' 
                                        }}
                                    >
                                        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                                            <div className="flex-col">
                                                <strong style={{ fontSize: '14px' }}>
                                                    {idx + 1}. {m.title}
                                                </strong>
                                                {m.duration && (
                                                    <span className="text-xs text-muted">
                                                        Duration: {m.duration}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleRemoveStagingMovement(m.id)}
                                                style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px', height: '28px', minHeight: 'auto' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="card" style={{ padding: 'var(--space-md)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card-hover)' }}>
                            <h4 className="text-sm" style={{ marginTop: 0, marginBottom: 'var(--space-sm)', color: 'var(--primary)' }}>Stage New Movement</h4>
                            <div className="flex-row" style={{ gap: 'var(--space-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div className="flex-col" style={{ gap: '4px', flex: '2 1 200px' }}>
                                    <label className="text-xs text-muted">Movement Name</label>
                                    <input 
                                        type="text" 
                                        placeholder={`e.g. Movement ${localMovementsList.length + 1}`}
                                        value={stagingMovTitle}
                                        onChange={e => setStagingMovTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleAddStagingMovement(e);
                                            }
                                        }}
                                        className="card"
                                        style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }}
                                    />
                                </div>
                                <div className="flex-col" style={{ gap: '4px', flex: '1 1 100px' }}>
                                    <label className="text-xs text-muted">Duration (optional)</label>
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
                                        className="card"
                                        style={{ padding: '0 12px', height: '36px', fontSize: '14px', width: '100%' }}
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={() => handleAddStagingMovement()}
                                    style={{ height: '36px', minHeight: '36px', padding: '0 16px', fontSize: '13px' }}
                                >
                                    + Stage
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </BaseModal>
    );
}
