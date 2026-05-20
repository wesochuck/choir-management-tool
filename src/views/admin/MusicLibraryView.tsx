import React, { useState, useEffect, useMemo } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';
import { eventService, type Event } from '../../services/eventService';
import { venueService, type Venue } from '../../services/venueService';
import { settingsService, getVoiceParts, type VoicePartDef } from '../../services/settingsService';
import { pb } from '../../lib/pocketbase';
import { formatPerformanceHistory, exportMusicToCSV, findDuplicates, parseDurationToSeconds, formatSecondsToDuration, appendPieceToSetList, resolveCatalogLookupUrl } from '../../lib/musicPieceUtils';
import { MusicImportModal } from '../../components/admin/MusicImportModal';

export default function MusicLibraryView() {
  const dialog = useDialog();

  const [pieces, setPieces] = useState<MusicPiece[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogLookupTemplate, setCatalogLookupTemplate] = useState('');

  // Audio player state
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState<string>('');
  const [activeAudioPart, setActiveAudioPart] = useState<string>('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlayDefaultTrack = (piece: MusicPiece) => {
    if (!piece.audioTrackMapping) return;
    const parts = Object.keys(piece.audioTrackMapping).filter(k => piece.audioTrackMapping?.[k]);
    if (parts.length === 0) return;
    
    // Prefer tutti, then first available
    const chosenPart = parts.includes('tutti') ? 'tutti' : parts[0];
    const filename = piece.audioTrackMapping[chosenPart];
    if (filename) {
        setActiveAudioUrl(pb.files.getUrl(piece, filename));
        setActiveAudioTitle(piece.title);
        setActiveAudioPart(chosenPart === 'tutti' ? 'Tutti' : chosenPart);
    }
  };
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<MusicPiece | null>(null);
  
  // Duplicates & Bulk Delete state
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleExportCSV = () => {
    const csvContent = exportMusicToCSV(pieces);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'music_library_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, settings] = await Promise.all([
        musicLibraryService.getLibrary(),
        settingsService.getMusicLibrarySettings()
      ]);
      setPieces(data);
      setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
    } catch (err: any) {
      if (err?.isAbort) return;
      dialog.showMessage({ title: 'Error', message: 'Could not load music library.', variant: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePiece = async (data: Partial<MusicPieceInput>) => {
    try {
      let savedPiece: MusicPiece;
      if (editingPiece) {
        savedPiece = await musicLibraryService.updatePiece(editingPiece.id, data);
      } else {
        savedPiece = await musicLibraryService.createPiece(data);
      }

      // Determine newly linked performances
      const oldPerformances = editingPiece?.performances || [];
      const newPerformances = data.performances || [];
      const newlyLinkedIds = newPerformances.filter((id: string) => !oldPerformances.includes(id));

      if (newlyLinkedIds.length > 0) {
        const failedTitles: string[] = [];
        for (const perfId of newlyLinkedIds) {
          let eventTitle = perfId;
          try {
            const event = await eventService.getEventById(perfId);
            eventTitle = event.title || perfId;
            const { updated, setList: updatedSetList } = appendPieceToSetList(event.setList, savedPiece);
            if (updated) {
              await eventService.updateEvent(perfId, { setList: updatedSetList });
            }
          } catch (err) {
            console.error(`Failed to update set list for performance ${perfId}:`, err);
            failedTitles.push(eventTitle);
          }
        }

        if (failedTitles.length > 0) {
          dialog.showMessage({
            title: 'Set List Update Failed',
            message: `The music piece was saved successfully, but it could not be automatically appended to the set list for: ${failedTitles.join(', ')}.`,
            variant: 'warning'
          });
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Could not save the piece.', variant: 'danger' });
    }
  };

  const handleDeletePiece = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Piece',
      message: 'Are you sure you want to delete this piece? It will be removed from the library, but any set lists referencing its name will retain their text (though the link will be broken).',
      variant: 'danger',
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;

    try {
      await musicLibraryService.deletePiece(id);
      await loadData();
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Could not delete the piece.', variant: 'danger' });
    }
  };



  const duplicateIds = useMemo(() => {
    const dups = findDuplicates(pieces);
    return new Set(dups.map(p => p.id));
  }, [pieces]);

  const filteredPieces = useMemo(() => {
    let result = pieces;
    if (showDuplicatesOnly) {
        result = result.filter(p => duplicateIds.has(p.id));
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(lower) || 
        p.composer?.toLowerCase().includes(lower) ||
        p.catalogId?.toLowerCase().includes(lower)
      );
    }
    // Sort by title
    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [pieces, searchTerm, showDuplicatesOnly, duplicateIds]);

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      const confirm = await dialog.confirm({
          title: 'Bulk Delete',
          message: `Are you sure you want to delete ${selectedIds.size} pieces?`,
          variant: 'danger',
          confirmLabel: 'Delete'
      });
      
      if (confirm) {
          setIsBulkDeleting(true);
          try {
              await musicLibraryService.bulkDelete(Array.from(selectedIds));
              setSelectedIds(new Set());
              await loadData();
          } catch {
              dialog.showMessage({ title: 'Error', message: 'Failed to delete some pieces.', variant: 'danger' });
          } finally {
              setIsBulkDeleting(false);
          }
      }
  };

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Music Library</h1>
        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingPiece(null); setIsModalOpen(true); }}>
            Add Piece
          </button>
        </div>
      </div>

      <AppCard noPadding>
        <div className="flex-responsive" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border)', gap: 'var(--space-md)', justifyContent: 'space-between' }}>
          <input
            className="card"
            placeholder="Search title, composer, catalog..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', height: '40px', padding: '0 12px' }}
          />
          
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
              <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                <input 
                    type="checkbox" 
                    checked={showDuplicatesOnly} 
                    onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span className="text-sm">Filter Duplicates ({duplicateIds.size})</span>
              </label>

              {selectedIds.size > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                      {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
                  </button>
              )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid var(--border)' }}>
            <thead>
                <tr style={{ backgroundColor: 'var(--primary-light)' }}>
                <th className="text-label" style={{ width: '40px', textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>
                    <input 
                        type="checkbox" 
                        checked={filteredPieces.length > 0 && selectedIds.size === filteredPieces.length}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setSelectedIds(new Set(filteredPieces.map(p => p.id)));
                            } else {
                                setSelectedIds(new Set());
                            }
                        }}
                        style={{ minHeight: 'auto', width: '14px', height: '14px', margin: 0, verticalAlign: 'middle', cursor: 'pointer' }}
                    />
                </th>
                <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Title</th>
                <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Composer/Arranger</th>
                <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Duration</th>
                <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Copies</th>
                <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Catalog ID</th>
                <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Tracks</th>
                <th className="text-label" style={{ width: '80px', padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {isLoading ? (
                <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)' }}>Loading library...</td>
                </tr>
                ) : filteredPieces.length === 0 ? (
                <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)' }}>No pieces found.</td>
                </tr>
                ) : (
                filteredPieces.map(piece => {
                    const isDuplicate = duplicateIds.has(piece.id);
                    return (
                        <tr 
                            key={piece.id} 
                            className="relative-row"
                            onClick={() => { setEditingPiece(piece); setIsModalOpen(true); }}
                            style={{ backgroundColor: isDuplicate ? 'rgba(255, 138, 101, 0.05)' : undefined, cursor: 'pointer' }}
                        >
                        <td style={{ textAlign: 'center', padding: '6px 10px', border: '1px solid var(--border)' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(piece.id)}
                                onChange={() => toggleSelection(piece.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ minHeight: 'auto', width: '14px', height: '14px', margin: 0, verticalAlign: 'middle', cursor: 'pointer' }}
                            />
                        </td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                            <div className="flex-col" style={{ gap: 0 }}>
                                <strong style={{ color: isDuplicate ? '#e64a19' : 'inherit' }}>{piece.title}</strong>
                                {piece.performances && piece.performances.length > 0 && (
                                    <span className="text-xs text-muted" title={formatPerformanceHistory(piece).join('\n')}>
                                        {piece.performances.length} historical performances
                                    </span>
                                )}
                            </div>
                        </td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>{piece.composer || '-'}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                            {piece.duration ? formatSecondsToDuration(parseDurationToSeconds(piece.duration)) : '-'}
                        </td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>{piece.copies !== undefined ? piece.copies : '-'}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                            {piece.catalogId ? (
                                resolveCatalogLookupUrl(catalogLookupTemplate, piece.catalogId) ? (
                                    <a 
                                        href={resolveCatalogLookupUrl(catalogLookupTemplate, piece.catalogId)!} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ color: 'var(--color-primary, #1b4d3e)', textDecoration: 'underline', fontWeight: 500 }}
                                    >
                                        {piece.catalogId}
                                    </a>
                                ) : piece.catalogId
                            ) : '-'}
                        </td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                            {piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0 ? (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayDefaultTrack(piece);
                                    }}
                                    style={{ 
                                        padding: '2px 8px', 
                                        height: '24px', 
                                        minHeight: '24px', 
                                        fontSize: '11px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        margin: 0
                                    }}
                                >
                                    🎵 Play
                                </button>
                            ) : (
                                <span className="text-xs text-muted">-</span>
                            )}
                        </td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                            <div className="flex-row" style={{ gap: 'var(--space-xs)', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-ghost btn-sm" 
                                onClick={(e) => { e.stopPropagation(); setEditingPiece(piece); setIsModalOpen(true); }}
                                style={{ minHeight: 'auto', height: '24px', padding: '0 8px', fontSize: '0.75rem', margin: 0 }}
                            >
                                Edit
                            </button>
                            </div>
                        </td>
                        </tr>
                    );
                })
                )}
            </tbody>
            </table>
        </div>
      </AppCard>

      <MusicPieceModal
        isOpen={isModalOpen}
        piece={editingPiece}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePiece}
        onDelete={editingPiece ? () => handleDeletePiece(editingPiece.id) : undefined}
        catalogLookupTemplate={catalogLookupTemplate}
        onRefresh={loadData}
      />

      <MusicImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />

      {activeAudioUrl && (
        <div style={{
            position: 'fixed',
            bottom: 'var(--space-md)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'rgba(27, 77, 62, 0.95)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-md)'
        }}>
            <div className="flex-col" style={{ minWidth: '0', flex: 1, gap: '2px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Playing Learning Track ({activeAudioPart})
                </span>
                <strong style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff', display: 'block' }}>
                    {activeAudioTitle}
                </strong>
            </div>
            
            <audio 
                src={activeAudioUrl} 
                controls 
                autoPlay
                style={{ height: '30px', maxWidth: '170px' }} 
            />
            
            <button 
                type="button" 
                onClick={() => setActiveAudioUrl(null)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                    lineHeight: 1,
                    margin: 0
                }}
                title="Close Player"
            >
                ×
            </button>
        </div>
      )}
    </div>
  );
}

// Inline modal component for editing a single piece
function MusicPieceModal({ isOpen, piece, onClose, onSave, onDelete, catalogLookupTemplate, onRefresh }: { 
    isOpen: boolean, 
    piece: MusicPiece | null, 
    onClose: () => void, 
    onSave: (data: Partial<MusicPieceInput>) => Promise<void>,
    onDelete?: () => Promise<void>,
    catalogLookupTemplate?: string,
    onRefresh?: () => Promise<void>
}) {
    const dialog = useDialog();
    const [title, setTitle] = useState('');
    const [composer, setComposer] = useState('');
    const [duration, setDuration] = useState('');
    const [copies, setCopies] = useState<string>('');
    const [catalogId, setCatalogId] = useState('');
    const [selectedPerformanceIds, setSelectedPerformanceIds] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Active Tab state
    const [activeTab, setActiveTab] = useState<'details' | 'tracks' | 'performances'>('details');

    // Audio & Voice Parts state
    const [localPiece, setLocalPiece] = useState<MusicPiece | null>(piece);
    const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
    const [uploadingParts, setUploadingParts] = useState<Record<string, boolean>>({});

    // Performance states
    const [allPerformances, setAllPerformances] = useState<Event[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Quick Add form states
    const [quickTitle, setQuickTitle] = useState('');
    const [quickDate, setQuickDate] = useState('');
    const [quickVenue, setQuickVenue] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Load performances
            eventService.getEvents().then(events => {
                setAllPerformances(events.filter(e => e.type === 'Performance'));
            }).catch(console.error);

            // Load venues for quick add
            venueService.getVenues().then(setVenues).catch(console.error);

            // Load voice parts
            getVoiceParts().then(setVoiceParts).catch(console.error);
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
            setSelectedPerformanceIds(piece.performances || []);
            setNotes(piece.notes || '');
        } else {
            setTitle('');
            setComposer('');
            setDuration('');
            setCopies('');
            setCatalogId('');
            setSelectedPerformanceIds([]);
            setNotes('');
        }
        setShowQuickAdd(false);
        setQuickTitle('');
        setQuickDate('');
        setQuickVenue('');
        setActiveTab('details');
    }, [piece, isOpen]);

    const handleFileUpload = async (voicePart: string, file: File) => {
        if (!localPiece) return;
        
        setUploadingParts(prev => ({ ...prev, [voicePart]: true }));
        try {
            const existingFilename = localPiece.audioTrackMapping?.[voicePart];
            let currentFiles = localPiece.audioFiles || [];
            let currentMapping = { ...(localPiece.audioTrackMapping || {}) };
            
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
            
            dialog.showMessage({
                title: 'Success',
                message: 'Audio track deleted successfully.',
                variant: 'info'
            });
        } catch (err) {
            console.error(err);
            dialog.showMessage({
                title: 'Error',
                message: 'Failed to delete the audio track.',
                variant: 'danger'
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                title,
                composer,
                duration: duration || undefined,
                copies: copies ? parseInt(copies, 10) : undefined,
                catalogId,
                performances: selectedPerformanceIds,
                notes
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
            {piece && (
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-md)' }}>
                            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                                <label className="text-label">Duration</label>
                                <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3:30" className="card" style={{ padding: '0 12px', height: '40px', width: '100%' }} />
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
                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                        <label className="text-label">🎵 Reference & Learning Tracks</label>
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
                            <div className="flex-col" style={{ 
                                gap: 'var(--space-xs)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius)',
                                padding: 'var(--space-sm)',
                                backgroundColor: 'rgba(0, 0, 0, 0.02)'
                            }}>
                                {['tutti', ...voiceParts.map(vp => vp.label)].map(partLabel => {
                                    const filename = localPiece.audioTrackMapping?.[partLabel];
                                    const isUploading = uploadingParts[partLabel];
                                    return (
                                        <div key={partLabel} className="flex-row" style={{
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            backgroundColor: 'var(--bg-card-hover)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)',
                                            gap: 'var(--space-md)'
                                        }}>
                                            <div className="flex-col" style={{ minWidth: '90px' }}>
                                                <strong style={{ fontSize: '13px', color: 'var(--text-color)' }}>
                                                    {partLabel === 'tutti' ? 'Tutti (Full)' : partLabel}
                                                </strong>
                                                <span className="text-xs text-muted" style={{ fontSize: '11px' }}>
                                                    {partLabel === 'tutti' ? 'Full Mix' : (voiceParts.find(vp => vp.label === partLabel)?.fullName || '')}
                                                </span>
                                            </div>
                                            
                                            {isUploading ? (
                                                <span className="text-xs text-muted animate-pulse" style={{ fontSize: '12px' }}>Uploading...</span>
                                            ) : filename ? (
                                                <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', flex: 1, justifyContent: 'flex-end' }}>
                                                    <audio 
                                                        src={pb.files.getUrl(localPiece, filename)} 
                                                        controls 
                                                        style={{ height: '28px', maxWidth: '220px', flex: 1 }} 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-ghost btn-sm" 
                                                        onClick={() => handleFileDelete(partLabel)}
                                                        style={{ 
                                                            color: 'var(--danger)', 
                                                            border: 'none', 
                                                            background: 'none', 
                                                            cursor: 'pointer',
                                                            padding: '4px 6px',
                                                            minHeight: 'auto',
                                                            height: 'auto',
                                                            margin: 0
                                                        }}
                                                        title="Delete track"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex-row" style={{ alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                                                    <label 
                                                        className="btn btn-secondary btn-sm" 
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11px',
                                                            padding: '2px 8px',
                                                            height: '24px',
                                                            minHeight: '24px',
                                                            margin: 0
                                                        }}
                                                    >
                                                        📤 Upload
                                                        <input 
                                                            type="file" 
                                                            accept="audio/*" 
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    handleFileUpload(partLabel, file);
                                                                }
                                                            }}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </form>
        </BaseModal>
    );
}
