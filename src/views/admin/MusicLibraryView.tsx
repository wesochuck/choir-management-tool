import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';
import { musicLibraryWorkflows } from '../../services/musicLibraryWorkflows';
import { eventService } from '../../services/eventService';
import { settingsService, getVoicePartsAndSections, type SectionDef, type MusicGenreDef, type MusicLibrarySettings } from '../../services/settingsService';
import { pb } from '../../lib/pocketbase';
import { exportMusicToCSV, findDuplicates, appendPieceToSetList } from '../../lib/musicPieceUtils';
import { mapWithConcurrency, retryOn429 } from '../../lib/networkSafety';
import { buildVisibleMusicLibraryRows, type MusicLibrarySortField, type SortDirection } from '../../lib/music/libraryRows';
import type { PerformanceRecencyFilter } from '../../lib/music/performanceHistory';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { MusicPieceModal } from './music-library/MusicPieceModal';
import { MusicLibraryFilters } from './music-library/MusicLibraryFilters';
import { MusicLibraryTable } from './music-library/MusicLibraryTable';
import { FloatingAudioPlayer } from './music-library/FloatingAudioPlayer';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';

export default function MusicLibraryView() {
  const dialog = useDialog();

  const [pieces, setPieces] = useState<MusicPiece[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilters, setSectionFilters] = useState<string[]>([]);
  const [genreFilters, setGenreFilters] = useState<string[]>([]);
  const [configuredGenres, setConfiguredGenres] = useState<MusicGenreDef[]>([]);
  const [catalogLookupTemplate, setCatalogLookupTemplate] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'catalog' | 'config'>('catalog');

  // Music library settings configuration state
  const [initialSettings, setInitialSettings] = useState<MusicLibrarySettings | null>(null);
  const [musicLibrarySettings, setMusicLibrarySettings] = useState<MusicLibrarySettings>({
    catalogLookupUrlTemplate: '',
    genres: [],
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const isConfigDirty = useMemo(() => {
    if (!initialSettings) return false;
    return (
      musicLibrarySettings.catalogLookupUrlTemplate !== initialSettings.catalogLookupUrlTemplate ||
      JSON.stringify(musicLibrarySettings.genres) !== JSON.stringify(initialSettings.genres)
    );
  }, [initialSettings, musicLibrarySettings]);

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
  const [modalInitialTab, setModalInitialTab] = useState<'details' | 'tracks' | 'performances' | 'movements'>('details');
  
  // Duplicates & Bulk Delete state
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting State
  const [sortField, setSortField] = useState<MusicLibrarySortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [recencyFilter, setRecencyFilter] = useState<PerformanceRecencyFilter>('all');

  // Reset to first page when search filters, duplicate filter, page size, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sectionFilters, genreFilters, recencyFilter, showDuplicatesOnly, pageSize, sortField, sortDirection]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleExportCSV = () => {
    const csvContent = exportMusicToCSV(pieces, { genres: configuredGenres });
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
      const sortedGenres = [...(settings.genres || [])].sort((a, b) => a.label.localeCompare(b.label));
      setPieces(data);
      setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
      setSections(sectionsData.sections);
      setConfiguredGenres(sortedGenres);

      const settingsState = {
        catalogLookupUrlTemplate: settings.catalogLookupUrlTemplate || '',
        genres: sortedGenres
      };
      setMusicLibrarySettings(JSON.parse(JSON.stringify(settingsState)));
      setInitialSettings(JSON.parse(JSON.stringify(settingsState)));
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

  const handleConfigSave = async () => {
    setIsSavingConfig(true);
    try {
      const sortedSettings = {
        ...musicLibrarySettings,
        genres: [...musicLibrarySettings.genres].sort((a, b) => a.label.localeCompare(b.label))
      };

      const deletedGenres = (initialSettings?.genres || []).filter(
        ig => !sortedSettings.genres.some(g => g.id === ig.id)
      );

      await settingsService.saveMusicLibrarySettings(sortedSettings);
      setInitialSettings(JSON.parse(JSON.stringify(sortedSettings)));
      setCatalogLookupTemplate(sortedSettings.catalogLookupUrlTemplate || '');
      setConfiguredGenres(sortedSettings.genres || []);
      setMusicLibrarySettings(sortedSettings);
      dialog.showToast('Music Library settings saved successfully.');

      if (deletedGenres.length > 0) {
        const deletedGenreIds = new Set(deletedGenres.map(g => g.id));
        const piecesToUpdate = pieces.filter(p => (p.genres || []).some(gId => deletedGenreIds.has(gId)));

        if (piecesToUpdate.length > 0) {
          dialog.showToast(`Removing deleted genre(s) from ${piecesToUpdate.length} piece(s) in background...`);
          (async () => {
            try {
              await mapWithConcurrency(
                piecesToUpdate,
                async (piece) => {
                  const updatedGenres = (piece.genres || []).filter(gId => !deletedGenreIds.has(gId));
                  await retryOn429(() => musicLibraryService.updatePiece(piece.id, { genres: updatedGenres }));
                },
                { concurrency: 4 }
              );
              await loadData();
              dialog.showToast('Successfully cleaned up deleted genres from all music pieces.');
            } catch (err: unknown) {
              console.error('Failed to clean up deleted genres from pieces:', err);
              dialog.showMessage({
                title: 'Background Cleanup Failed',
                message: 'Settings were saved, but some music pieces could not be updated with the deleted genres removed.',
                variant: 'warning'
              });
            }
          })();
        }
      }
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Failed to save Music Library settings.', variant: 'danger' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigDiscard = () => {
    if (initialSettings) {
      setMusicLibrarySettings(JSON.parse(JSON.stringify(initialSettings)));
    }
  };

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
          savedPiece = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(rest, { tuttiFile, movements });
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
        await Promise.all(newlyLinkedIds.map(async (perfId: string) => {
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
        }));

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

  const handleSaveAndAddAnother = async (data: Partial<MusicPieceInput> & {
    tuttiFile?: File | null;
    movements?: { title: string; duration?: string }[];
  }) => {
    try {
      const { tuttiFile, movements, ...rest } = data;
      let savedPiece: MusicPiece;
      if (tuttiFile || (movements && movements.length > 0)) {
        savedPiece = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(rest, { tuttiFile, movements });
      } else {
        savedPiece = await musicLibraryService.createPiece(rest);
      }

      // Link newly selected performances
      const newPerformances = data.performances || [];
      if (newPerformances.length > 0) {
        const failedTitles: string[] = [];
        await Promise.all(newPerformances.map(async (perfId: string) => {
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
        }));
        if (failedTitles.length > 0) {
          dialog.showMessage({
            title: 'Set List Update Failed',
            message: `The piece was saved, but could not be appended to set lists for: ${failedTitles.join(', ')}.`,
            variant: 'warning'
          });
        }
      }

      // Keep modal open, reset to new-piece mode, reload background data
      setEditingPiece(null);
      dialog.showToast(`"${savedPiece.title}" saved. Ready to add another piece.`);
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

  const handleCreateGenre = async (label: string): Promise<MusicGenreDef> => {
    const trimmed = label.trim();
    if (!trimmed) {
      throw new Error('Genre name cannot be empty.');
    }

    const currentList = musicLibrarySettings.genres || [];
    if (currentList.some(g => g.label.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('Genre label already exists.');
    }

    const generatedId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let finalId = generatedId;
    let counter = 2;
    while (currentList.some(g => g.id === finalId)) {
      finalId = `${generatedId}-${counter}`;
      counter++;
    }

    const newGenre: MusicGenreDef = { id: finalId, label: trimmed };
    const updatedGenres = [...currentList, newGenre];

    const updatedSettings = {
      ...musicLibrarySettings,
      genres: updatedGenres
    };

    await settingsService.saveMusicLibrarySettings(updatedSettings);

    setMusicLibrarySettings(JSON.parse(JSON.stringify(updatedSettings)));
    setInitialSettings(JSON.parse(JSON.stringify(updatedSettings)));
    setConfiguredGenres(updatedGenres);

    return newGenre;
  };

  const duplicateIds = useMemo(() => {
    const dups = findDuplicates(pieces);
    return new Set(dups.map(p => p.id));
  }, [pieces]);

  const filteredPieces = useMemo(() => {
    return buildVisibleMusicLibraryRows(pieces, {
      searchTerm,
      showDuplicatesOnly,
      showMovements: false,
      duplicateIds,
      sectionFilters,
      genreFilters,
      recencyFilter,
      sortField,
      sortDirection
    });
  }, [pieces, searchTerm, showDuplicatesOnly, duplicateIds, sectionFilters, genreFilters, recencyFilter, sortField, sortDirection]);

  const paginatedPieces = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPieces.slice(startIndex, startIndex + pageSize);
  }, [filteredPieces, currentPage, pageSize]);

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
        {activeTab === 'catalog' && (
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
        )}
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex-row no-print" style={{ gap: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'catalog' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'catalog' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'catalog' ? '600' : '500',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
          }}
        >
          Music Catalog
        </button>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'config' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'config' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'config' ? '600' : '500',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
          }}
        >
          Library Settings
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <AppCard noPadding>
          <MusicLibraryFilters 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sectionFilters={sectionFilters}
            onSectionFiltersChange={setSectionFilters}
            genreFilters={genreFilters}
            onGenreFiltersChange={setGenreFilters}
            genres={configuredGenres}
            sections={sections}
            showDuplicatesOnly={showDuplicatesOnly}
            onShowDuplicatesOnlyChange={setShowDuplicatesOnly}
            duplicateCount={duplicateIds.size}
            selectedCount={selectedIds.size}
            isBulkDeleting={isBulkDeleting}
            onBulkDelete={handleBulkDelete}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            recencyFilter={recencyFilter}
            onRecencyFilterChange={setRecencyFilter}
          />

          <MusicLibraryTable 
            pieces={pieces}
            filteredPieces={paginatedPieces}
            sections={sections}
            genres={configuredGenres}
            isLoading={isLoading}
            duplicateIds={duplicateIds}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onSelectAll={(checked) => {
              const newSet = new Set(selectedIds);
              if (checked) {
                  filteredPieces.forEach(p => newSet.add(p.id));
              } else {
                  filteredPieces.forEach(p => newSet.delete(p.id));
              }
              setSelectedIds(newSet);
            }}
            onEditPiece={(piece, tab) => { setEditingPiece(piece); setModalInitialTab(tab || 'details'); setIsModalOpen(true); }}
            onPlayTrack={handlePlayDefaultTrack}
            catalogLookupTemplate={catalogLookupTemplate}
            currentPage={currentPage}
            pageSize={pageSize}
            totalParentCount={filteredPieces.length}
            onPageChange={setCurrentPage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field) => {
              if (sortField === field) {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField(field);
                setSortDirection('asc');
              }
            }}
          />
        </AppCard>
      ) : (
        <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
          <AppCard title="Music Library Settings">
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Catalog Lookup URL Template</label>
              <input
                type="url"
                value={musicLibrarySettings.catalogLookupUrlTemplate || ''}
                onChange={(event) => setMusicLibrarySettings({ ...musicLibrarySettings, catalogLookupUrlTemplate: event.target.value })}
                placeholder="https://example.com/catalog/{catalogId}"
                className="card"
                style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              />
              <p className="text-muted" style={{ margin: 0 }}>
                Configure an external lookup URL format for Catalog IDs. Use <code>{'{catalogId}'}</code> as the placeholder for the Catalog ID number (e.g. <code>https://www.jwpepper.com/s?q={'{catalogId}'}</code>).
              </p>
            </div>
          </AppCard>

          <AppCard title="Music Library Genres">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Configure standard genre tags used for library organization and advanced layout filtering.
              </p>
              <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                {musicLibrarySettings.genres?.map((genre, index) => (
                  <div key={genre.id} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                    <input
                      className="card"
                      style={{ height: '40px', padding: '0 12px', width: '250px' }}
                      value={genre.label}
                      onChange={(e) => {
                        const updated = [...musicLibrarySettings.genres];
                        updated[index] = { ...updated[index], label: e.target.value };
                        setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                      }}
                      onBlur={() => {
                        const updated = [...musicLibrarySettings.genres].sort((a, b) => a.label.localeCompare(b.label));
                        setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={async () => {
                        const targetGenre = musicLibrarySettings.genres[index];
                        const linkedPiecesCount = pieces.filter(p => (p.genres || []).includes(targetGenre.id)).length;
                        
                        if (linkedPiecesCount > 0) {
                          const confirmed = await dialog.confirm({
                            title: 'Delete Genre?',
                            message: `The genre "${targetGenre.label}" is currently linked to ${linkedPiecesCount} music piece(s). If you proceed and save, it will be removed from these pieces. Are you sure you want to delete this genre?`,
                            confirmLabel: 'Delete Genre',
                            cancelLabel: 'Cancel',
                            variant: 'warning'
                          });
                          if (!confirmed) return;
                        }
                        
                        const updated = musicLibrarySettings.genres.filter((_, i) => i !== index);
                        setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                <input
                  id="new-genre-input"
                  placeholder="New Genre Name (e.g. Sacred)"
                  className="card"
                  style={{ height: '40px', padding: '0 12px', maxWidth: '250px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const inputEl = document.getElementById('new-genre-input') as HTMLInputElement;
                    const label = inputEl?.value?.trim();
                    if (!label) return;
                    
                    const normalized = label;
                    const currentList = musicLibrarySettings.genres || [];
                    if (currentList.some(g => g.label.toLowerCase() === normalized.toLowerCase())) {
                      dialog.showMessage({ title: 'Genre Exists', message: 'Genre label already exists.', variant: 'warning' });
                      return;
                    }
                    
                    const generatedId = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    let finalId = generatedId;
                    let counter = 2;
                    while (currentList.some(g => g.id === finalId)) {
                      finalId = `${generatedId}-${counter}`;
                      counter++;
                    }
                    
                    const updated = [...currentList, { id: finalId, label: normalized }].sort((a, b) => a.label.localeCompare(b.label));
                    setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                    inputEl.value = '';
                  }}
                >
                  Add Genre
                </button>
              </div>
            </div>
          </AppCard>

          <FloatingSaveBar 
            isDirty={isConfigDirty} 
            isSaving={isSavingConfig} 
            onSave={handleConfigSave} 
            onDiscard={handleConfigDiscard} 
          />
        </div>
      )}

      <MusicPieceModal
        isOpen={isModalOpen}
        piece={editingPiece}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePiece}
        onSaveAndAddAnother={handleSaveAndAddAnother}
        onDelete={editingPiece ? () => handleDeletePiece(editingPiece.id) : undefined}
        catalogLookupTemplate={catalogLookupTemplate}
        onRefresh={loadData}
        allPieces={pieces}
        allGenres={configuredGenres}
        onCreateGenre={handleCreateGenre}
        initialTab={modalInitialTab}
      />

      <MusicImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />

      <FloatingAudioPlayer 
        url={activeAudioUrl}
        title={activeAudioTitle}
        part={activeAudioPart}
        onClose={() => setActiveAudioUrl(null)}
      />
    </div>
  );
}

