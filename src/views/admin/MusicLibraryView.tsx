import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';
import { eventService, type Event } from '../../services/eventService';
import { venueService, type Venue } from '../../services/venueService';
import { formatPerformanceHistory, parseMusicLibraryCSV } from '../../lib/musicPieceUtils';

export default function MusicLibraryView() {
  const dialog = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pieces, setPieces] = useState<MusicPiece[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<MusicPiece | null>(null);
  
  // Duplicates & Bulk Delete state
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await musicLibraryService.getLibrary();
      setPieces(data);
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
      if (editingPiece) {
        await musicLibraryService.updatePiece(editingPiece.id, data);
      } else {
        await musicLibraryService.createPiece(data);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const parsedPieces = parseMusicLibraryCSV(text);
        
        if (parsedPieces.length === 0) {
            dialog.showMessage({ title: 'Import Failed', message: 'No valid rows found in CSV.', variant: 'danger' });
            return;
        }

        const confirm = await dialog.confirm({
            title: 'Confirm Import',
            message: `Found ${parsedPieces.length} pieces. Import them into the library? Duplicates will NOT be automatically skipped.`,
            confirmLabel: 'Import'
        });

        if (confirm) {
            setIsLoading(true);
            await musicLibraryService.bulkCreate(parsedPieces);
            await loadData();
            dialog.showMessage({ title: 'Import Complete', message: `Imported ${parsedPieces.length} pieces.` });
        }
    } catch (err: unknown) {
        dialog.showMessage({ title: 'Import Error', message: err instanceof Error ? err.message : 'Failed to parse CSV.', variant: 'danger' });
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsLoading(false);
    }
  };

  const duplicateTitles = useMemo(() => {
    const counts = new Map<string, number>();
    pieces.forEach(p => {
        const t = p.title.toLowerCase().trim();
        counts.set(t, (counts.get(t) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter((entry) => entry[1] > 1).map(([title]) => title));
  }, [pieces]);

  const filteredPieces = useMemo(() => {
    let result = pieces;
    if (showDuplicatesOnly) {
        result = result.filter(p => duplicateTitles.has(p.title.toLowerCase().trim()));
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
  }, [pieces, searchTerm, showDuplicatesOnly, duplicateTitles]);

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
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
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
                <span className="text-sm">Highlight Duplicates ({duplicateTitles.size})</span>
              </label>

              {selectedIds.size > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                      {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
                  </button>
              )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px' }}>
            <thead>
                <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
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
                    />
                </th>
                <th>Title</th>
                <th>Composer/Arranger</th>
                <th>Duration</th>
                <th>Copies</th>
                <th>Catalog ID</th>
                <th style={{ width: '100px' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {isLoading ? (
                <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Loading library...</td>
                </tr>
                ) : filteredPieces.length === 0 ? (
                <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>No pieces found.</td>
                </tr>
                ) : (
                filteredPieces.map(piece => {
                    const isDuplicate = duplicateTitles.has(piece.title.toLowerCase().trim());
                    return (
                        <tr key={piece.id} style={{ backgroundColor: isDuplicate ? 'rgba(255, 138, 101, 0.05)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(piece.id)}
                                onChange={() => toggleSelection(piece.id)}
                            />
                        </td>
                        <td>
                            <div className="flex-col" style={{ gap: 0 }}>
                                <strong style={{ color: isDuplicate ? '#e64a19' : 'inherit' }}>{piece.title}</strong>
                                {piece.performances && piece.performances.length > 0 && (
                                    <span className="text-xs text-muted" title={formatPerformanceHistory(piece).join('\n')}>
                                        {piece.performances.length} historical performances
                                    </span>
                                )}
                            </div>
                        </td>
                        <td>{piece.composer || '-'}</td>
                        <td>{piece.duration || '-'}</td>
                        <td>{piece.copies !== undefined ? piece.copies : '-'}</td>
                        <td>{piece.catalogId || '-'}</td>
                        <td>
                            <div className="flex-row" style={{ gap: 'var(--space-xs)' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPiece(piece); setIsModalOpen(true); }}>Edit</button>
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
      />
    </div>
  );
}

// Inline modal component for editing a single piece
function MusicPieceModal({ isOpen, piece, onClose, onSave, onDelete }: { 
    isOpen: boolean, 
    piece: MusicPiece | null, 
    onClose: () => void, 
    onSave: (data: Partial<MusicPieceInput>) => Promise<void>,
    onDelete?: () => Promise<void>
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
        }
    }, [isOpen]);

    useEffect(() => {
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
    }, [piece, isOpen]);

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
            <form id="music-piece-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
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
                    </div>
                </div>
                
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

                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. A cappella, performance instructions, etc." className="card" style={{ padding: '12px', minHeight: '80px', resize: 'vertical' }} />
                    <span className="text-xs text-muted" style={{ marginTop: '2px' }}>
                        If this is a medley, please list the names of the different pieces here.
                    </span>
                </div>
            </form>
        </BaseModal>
    );
}
