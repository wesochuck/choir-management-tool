import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';
import { eventService } from '../../services/eventService';
import { settingsService, getVoicePartsAndSections, type SectionDef } from '../../services/settingsService';
import { pb } from '../../lib/pocketbase';
import { formatPerformanceHistory, exportMusicToCSV, findDuplicates, parseDurationToSeconds, formatSecondsToDuration, appendPieceToSetList, resolveCatalogLookupUrl } from '../../lib/musicPieceUtils';
import { buildVisibleMusicLibraryRows } from '../../lib/music/libraryRows';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { MusicPieceModal } from './music-library/MusicPieceModal';

export default function MusicLibraryView() {
  const dialog = useDialog();

  const [pieces, setPieces] = useState<MusicPiece[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
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
        setActiveAudioUrl(pb.files.getURL(piece, filename));
        setActiveAudioTitle(piece.title);
        setActiveAudioPart(chosenPart === 'tutti' ? 'Tutti' : chosenPart);
    }
  };
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<MusicPiece | null>(null);
  
  // Duplicates & Bulk Delete state
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, settings, sectionsData] = await Promise.all([
        musicLibraryService.getLibrary(),
        settingsService.getMusicLibrarySettings(),
        getVoicePartsAndSections()
      ]);
      setPieces(data);
      setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
      setSections(sectionsData.sections);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'isAbort' in err && err.isAbort) return;
      dialog.showMessage({ title: 'Error', message: 'Could not load music library.', variant: 'danger' });
    } finally {
      setIsLoading(false);
    }
  }, [dialog]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePiece = async (data: Partial<MusicPieceInput> & {
    tuttiFile?: File | null;
    movements?: { title: string; duration?: string }[];
  }) => {
    try {
      let savedPiece: MusicPiece;
      if (editingPiece) {
        const updateData = { ...data };
        delete updateData.tuttiFile;
        delete updateData.movements;
        savedPiece = await musicLibraryService.updatePiece(editingPiece.id, updateData);
      } else {
        const { tuttiFile, movements, ...rest } = data;
        if (tuttiFile || (movements && movements.length > 0)) {
          savedPiece = await musicLibraryService.createPieceWithMovementsAndTutti(rest, { tuttiFile, movements });
        } else {
          savedPiece = await musicLibraryService.createPiece(rest);
        }
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
      // Check if there are child movements
      const children = await pb.collection('musicLibrary').getFullList<MusicPiece>({
        filter: pb.filter('parentId = {:id}', { id })
      });

      let unlinkChildren = false;
      if (children.length > 0) {
        unlinkChildren = await dialog.confirm({
          title: 'Unlink Child Movements?',
          message: `This piece contains ${children.length} movement(s). Would you like to unlink and keep them as standalone pieces in your library? If you click "Cancel", they will be permanently deleted along with this parent piece.`,
          variant: 'warning',
          confirmLabel: 'Keep Movements (Unlink)',
          cancelLabel: 'Delete Everything'
        });
      }

      await musicLibraryService.deletePiece(id, { unlinkChildren });
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
    return buildVisibleMusicLibraryRows(pieces, {
      searchTerm,
      showDuplicatesOnly,
      showMovements,
      duplicateIds,
      sectionFilter
    });
  }, [pieces, searchTerm, showDuplicatesOnly, duplicateIds, showMovements, sectionFilter]);

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

          <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
            <span className="text-sm text-muted">Filter by Section:</span>
            <select
                className="card"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                style={{ height: '40px', padding: '0 8px', minWidth: '140px', cursor: 'pointer' }}
            >
                <option value="">All Pieces</option>
                {sections.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                ))}
            </select>
          </div>
          
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
              <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                <input 
                    type="checkbox" 
                    checked={showMovements} 
                    onChange={(e) => setShowMovements(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span className="text-sm">Show individual movements</span>
              </label>

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
                    <td colSpan={8} style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)' }}>Loading library...</td>
                </tr>
                ) : filteredPieces.length === 0 ? (
                <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)' }}>No pieces found.</td>
                </tr>
                ) : (
                filteredPieces.map(piece => {
                    const isDuplicate = duplicateIds.has(piece.id);
                    const isParent = pieces.some(p => p.parentId === piece.id);
                    const isChild = !!piece.parentId;
                    
                    const hasOwnTracks = !!(piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).some(k => piece.audioTrackMapping?.[k]));
                    const hasMovementTracks = pieces.some(m => m.parentId === piece.id && m.audioTrackMapping && Object.keys(m.audioTrackMapping).some(k => m.audioTrackMapping?.[k]));
                    const hasTracks = hasOwnTracks || hasMovementTracks;

                    const childMovements = pieces.filter(m => m.parentId === piece.id);
                    const totalMovementTracksCount = childMovements.reduce((acc, m) => {
                        const mMapping = m.audioTrackMapping || {};
                        const mCount = Object.keys(mMapping).filter(k => mMapping[k]).length;
                        return acc + mCount;
                    }, 0);

                    return (
                        <tr 
                            key={piece.id} 
                            className="relative-row"
                            onClick={() => { setEditingPiece(piece); setIsModalOpen(true); }}
                            style={{ 
                                backgroundColor: isDuplicate ? 'rgba(255, 138, 101, 0.05)' : isChild ? 'rgba(248, 250, 252, 0.4)' : undefined, 
                                cursor: 'pointer' 
                            }}
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
                        <td style={{ 
                            padding: '6px 10px', 
                            paddingLeft: isChild ? '28px' : '10px',
                            border: '1px solid var(--border)', 
                            verticalAlign: 'middle' 
                        }}>
                            <div className="flex-col" style={{ gap: '2px' }}>
                                <div className="flex-row" style={{ alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    {isChild && (
                                        <span className="text-xs text-muted" style={{ fontFamily: 'monospace', marginRight: '2px', userSelect: 'none' }}>
                                            └─
                                        </span>
                                    )}
                                    <strong style={{ color: isDuplicate ? '#e64a19' : 'inherit' }}>{piece.title}</strong>
                                    {hasTracks && (
                                        <span 
                                            title="Has learning tracks" 
                                            style={{ 
                                                fontSize: '13px', 
                                                lineHeight: 1, 
                                                cursor: 'default',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            🎧
                                        </span>
                                    )}
                                    {isParent && (
                                        <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px', 
                                            backgroundColor: 'var(--primary-light, rgba(27, 77, 62, 0.1))', 
                                            color: 'var(--primary, #1b4d3e)', 
                                            fontSize: '10px', 
                                            fontWeight: 600,
                                            border: '1px solid rgba(27, 77, 62, 0.2)',
                                            lineHeight: '1.2'
                                        }}>
                                            Multi-Movement
                                        </span>
                                    )}
                                    {isChild && (
                                        <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            padding: '1px 5px', 
                                            borderRadius: '4px', 
                                            backgroundColor: 'rgba(100, 116, 139, 0.1)', 
                                            color: 'var(--text-muted, #64748b)', 
                                            fontSize: '9px', 
                                            fontWeight: 500,
                                            border: '1px solid rgba(100, 116, 139, 0.2)',
                                            lineHeight: '1.2'
                                        }}>
                                            Movement
                                        </span>
                                    )}
                                </div>
                                {piece.performances && piece.performances.length > 0 && (
                                    <span className="text-xs text-muted" title={formatPerformanceHistory(piece).join('\n')}>
                                        {piece.performances.length} historical performances
                                    </span>
                                )}
                                <div className="flex-row" style={{ gap: 'var(--space-xs)', marginTop: '2px', flexWrap: 'wrap' }}>
                                    {!piece.sectionBuckets || piece.sectionBuckets.length === 0 ? (
                                        <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6, fontSize: '10px' }}>
                                            All Sections
                                        </span>
                                    ) : (
                                        piece.sectionBuckets.map(code => {
                                            const section = sections.find(s => s.code === code);
                                            return (
                                                <span 
                                                    key={code}
                                                    title={section ? section.name : code}
                                                    style={{ 
                                                        display: 'inline-flex',
                                                        padding: '1px 5px',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'var(--bg-card-hover)',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        color: 'var(--text-muted)'
                                                    }}
                                                >
                                                    {code}
                                                </span>
                                            );
                                        })
                                    )}
                                </div>
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
                            ) : isParent && totalMovementTracksCount > 0 ? (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(27, 77, 62, 0.08)',
                                    color: 'var(--primary, #1b4d3e)',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    border: '1px solid rgba(27, 77, 62, 0.15)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    🎧 {totalMovementTracksCount} track{totalMovementTracksCount !== 1 ? 's' : ''} in movements
                                </span>
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
        allPieces={pieces}
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

