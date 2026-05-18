import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';

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
    } catch {
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

  const parseCSV = (csvText: string): Partial<MusicPieceInput>[] => {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) return [];

    // Simple CSV parser (doesn't handle commas inside quotes perfectly, but good enough for simple cases)
    // A robust app might use PapaParse
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const titleIdx = headers.findIndex(h => h.includes('title'));
    const composerIdx = headers.findIndex(h => h.includes('composer') || h.includes('arranger'));
    const copiesIdx = headers.findIndex(h => h.includes('cop'));
    const catalogIdx = headers.findIndex(h => h.includes('catalog') || h.includes('id'));
    const datesIdx = headers.findIndex(h => h.includes('date') || h.includes('histor'));

    if (titleIdx === -1) {
       throw new Error('CSV must contain a "Title" column.');
    }

    const pieces: Partial<MusicPieceInput>[] = [];
    for (let i = 1; i < lines.length; i++) {
        // Split by comma but respect quotes
        const rawRow = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        // Fallback simple split if regex fails or data is clean
        const row = rawRow ? rawRow.map(s => s.replace(/(^"|"$)/g, '').trim()) : lines[i].split(',').map(s => s.trim());
        
        if (!row[titleIdx]) continue;

        let copies: number | undefined = undefined;
        if (copiesIdx !== -1 && row[copiesIdx]) {
           const parsed = parseInt(row[copiesIdx], 10);
           if (!isNaN(parsed)) copies = parsed;
        }

        let historicalDates: string[] = [];
        if (datesIdx !== -1 && row[datesIdx]) {
            // Assume dates might be separated by semicolons or pipes if in one column
            historicalDates = row[datesIdx].split(/[;|]/).map(d => d.trim()).filter(Boolean);
        }

        pieces.push({
            title: row[titleIdx],
            composer: composerIdx !== -1 ? row[composerIdx] : '',
            copies,
            catalogId: catalogIdx !== -1 ? row[catalogIdx] : '',
            historicalDates
        });
    }

    return pieces;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const parsedPieces = parseCSV(text);
        
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
    return new Set(Array.from(counts.entries()).filter(([_, count]) => count > 1).map(([title]) => title));
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
                                {piece.historicalDates && piece.historicalDates.length > 0 && (
                                    <span className="text-xs text-muted">{piece.historicalDates.length} historical performances</span>
                                )}
                            </div>
                        </td>
                        <td>{piece.composer || '-'}</td>
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
    const [title, setTitle] = useState('');
    const [composer, setComposer] = useState('');
    const [copies, setCopies] = useState<string>('');
    const [catalogId, setCatalogId] = useState('');
    const [historicalDates, setHistoricalDates] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (piece) {
            setTitle(piece.title);
            setComposer(piece.composer || '');
            setCopies(piece.copies?.toString() || '');
            setCatalogId(piece.catalogId || '');
            setHistoricalDates((piece.historicalDates || []).join('\n'));
            setNotes(piece.notes || '');
        } else {
            setTitle('');
            setComposer('');
            setCopies('');
            setCatalogId('');
            setHistoricalDates('');
            setNotes('');
        }
    }, [piece, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                title,
                composer,
                copies: copies ? parseInt(copies, 10) : undefined,
                catalogId,
                historicalDates: historicalDates.split('\n').map(d => d.trim()).filter(Boolean),
                notes
            });
        } finally {
            setIsSaving(false);
        }
    };

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
                <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
                    <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                        <label className="text-label">Copies</label>
                        <input type="number" value={copies} onChange={e => setCopies(e.target.value)} className="card" style={{ padding: '0 12px', height: '40px' }} />
                    </div>
                    <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                        <label className="text-label">Catalog ID</label>
                        <input value={catalogId} onChange={e => setCatalogId(e.target.value)} className="card" style={{ padding: '0 12px', height: '40px' }} />
                    </div>
                </div>
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Historical Dates (One per line)</label>
                    <textarea value={historicalDates} onChange={e => setHistoricalDates(e.target.value)} className="card" placeholder="e.g. Spring Concert 2018&#10;2021-12-25" style={{ padding: '12px', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="card" style={{ padding: '12px', minHeight: '80px', resize: 'vertical' }} />
                </div>
            </form>
        </BaseModal>
    );
}
