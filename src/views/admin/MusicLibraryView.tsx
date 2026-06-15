import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import {
  musicLibraryService,
  type MusicPiece,
  type MusicPieceInput,
} from '../../services/musicLibraryService';
import { musicLibraryWorkflows } from '../../services/musicLibraryWorkflows';
import { eventService } from '../../services/eventService';
import {
  settingsService,
  getVoicePartsAndSections,
  type SectionDef,
  type MusicGenreDef,
  type MusicLibrarySettings,
} from '../../services/settingsService';
import { pb } from '../../lib/pocketbase';
import { exportMusicToCSV, findDuplicates, appendPieceToSetList } from '../../lib/musicPieceUtils';
import {
  buildVisibleMusicLibraryRows,
  type MusicLibrarySortField,
  type SortDirection,
  type FilterMode,
} from '../../lib/music/libraryRows';
import type { PerformanceRecencyFilter } from '../../lib/music/performanceHistory';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { MusicPieceModal } from './music-library/MusicPieceModal';
import { MusicLibraryFilters } from './music-library/MusicLibraryFilters';
import { MusicLibraryTable } from './music-library/MusicLibraryTable';
import { FloatingAudioPlayer } from './music-library/FloatingAudioPlayer';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';
import { Button, FormField, Input } from '../../components/ui';

export default function MusicLibraryView() {
  const dialog = useDialog();

  const [pieces, setPieces] = useState<MusicPiece[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilters, setSectionFilters] = useState<string[]>([]);
  const [genreFilters, setGenreFilters] = useState<string[]>([]);
  const [genreFilterMode, setGenreFilterMode] = useState<FilterMode>('OR');
  const [configuredGenres, setConfiguredGenres] = useState<MusicGenreDef[]>([]);
  const [catalogLookupTemplate, setCatalogLookupTemplate] = useState('');

  const [activeTab, setActiveTab] = useState<'catalog' | 'config'>('catalog');

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

  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState<string>('');
  const [activeAudioPart, setActiveAudioPart] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlayDefaultTrack = (piece: MusicPiece) => {
    if (!piece.audioTrackMapping) return;
    const parts = Object.keys(piece.audioTrackMapping).filter((k) => piece.audioTrackMapping?.[k]);
    if (parts.length === 0) return;

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
  const [modalInitialTab, setModalInitialTab] = useState<
    'details' | 'tracks' | 'performances' | 'movements'
  >('details');

  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [sortField, setSortField] = useState<MusicLibrarySortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [ignoreArticles, setIgnoreArticles] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [recencyFilter, setRecencyFilter] = useState<PerformanceRecencyFilter>('all');

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    sectionFilters,
    genreFilters,
    genreFilterMode,
    recencyFilter,
    showDuplicatesOnly,
    pageSize,
    sortField,
    sortDirection,
    ignoreArticles,
  ]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleExportCSV = () => {
    const csvContent = exportMusicToCSV(pieces, { genres: configuredGenres });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'music_library_export.csv');
    link.style.visibility = 'hidden'; // @allow-inline-style - temporary DOM element for export
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
        getVoicePartsAndSections(),
      ]);
      const sortedGenres = [...(settings.genres || [])].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      setPieces(data);
      setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
      setSections(sectionsData.sections);
      setConfiguredGenres(sortedGenres);

      const settingsState = {
        catalogLookupUrlTemplate: settings.catalogLookupUrlTemplate || '',
        genres: sortedGenres,
      };
      setMusicLibrarySettings(JSON.parse(JSON.stringify(settingsState)));
      setInitialSettings(JSON.parse(JSON.stringify(settingsState)));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'isAbort' in err && err.isAbort) return;
      dialog.showMessage({
        title: 'Error',
        message: 'Could not load music library.',
        variant: 'danger',
      });
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
        genres: [...musicLibrarySettings.genres].sort((a, b) => a.label.localeCompare(b.label)),
      };

      const deletedGenres = (initialSettings?.genres || []).filter(
        (ig) => !sortedSettings.genres.some((g) => g.id === ig.id)
      );

      await settingsService.saveMusicLibrarySettings(sortedSettings);
      setInitialSettings(JSON.parse(JSON.stringify(sortedSettings)));
      setCatalogLookupTemplate(sortedSettings.catalogLookupUrlTemplate || '');
      setConfiguredGenres(sortedSettings.genres || []);
      setMusicLibrarySettings(sortedSettings);
      dialog.showToast('Music Library settings saved successfully.');

      if (deletedGenres.length > 0) {
        const deletedGenreIds = new Set(deletedGenres.map((g) => g.id));
        const piecesToUpdate = pieces.filter((p) =>
          (p.genres || []).some((gId) => deletedGenreIds.has(gId))
        );

        if (piecesToUpdate.length > 0) {
          dialog.showToast(
            `Removing deleted genre(s) from ${piecesToUpdate.length} piece(s) in background...`
          );
          (async () => {
            try {
              await musicLibraryService.bulkUpdate(
                piecesToUpdate.map((piece) => ({
                  id: piece.id,
                  data: {
                    genres: (piece.genres || []).filter((gId) => !deletedGenreIds.has(gId)),
                  },
                }))
              );
              await loadData();
              dialog.showToast('Successfully cleaned up deleted genres from all music pieces.');
            } catch (err: unknown) {
              console.error('Failed to clean up deleted genres from pieces:', err);
              dialog.showMessage({
                title: 'Background Cleanup Failed',
                message:
                  'Settings were saved, but some music pieces could not be updated with the deleted genres removed.',
                variant: 'warning',
              });
            }
          })();
        }
      }
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to save Music Library settings.',
        variant: 'danger',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigDiscard = () => {
    if (initialSettings) {
      setMusicLibrarySettings(JSON.parse(JSON.stringify(initialSettings)));
    }
  };

  const handleSavePiece = async (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => {
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
          savedPiece = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(rest, {
            tuttiFile,
            movements,
          });
        } else {
          savedPiece = await musicLibraryService.createPiece(rest);
        }
      }

      const oldPerformances = editingPiece?.performances || [];
      const newPerformances = data.performances || [];
      const newlyLinkedIds = newPerformances.filter((id: string) => !oldPerformances.includes(id));

      if (newlyLinkedIds.length > 0) {
        const failedTitles: string[] = [];
        await Promise.all(
          newlyLinkedIds.map(async (perfId: string) => {
            let eventTitle = perfId;
            try {
              const event = await eventService.getEventById(perfId);
              eventTitle = event.title || perfId;
              const { updated, setList: updatedSetList } = appendPieceToSetList(
                event.setList,
                savedPiece
              );
              if (updated) {
                await eventService.updateEvent(perfId, { setList: updatedSetList });
              }
            } catch (err) {
              console.error(`Failed to update set list for performance ${perfId}:`, err);
              failedTitles.push(eventTitle);
            }
          })
        );

        if (failedTitles.length > 0) {
          dialog.showMessage({
            title: 'Set List Update Failed',
            message: `The music piece was saved successfully, but it could not be automatically appended to the set list for: ${failedTitles.join(', ')}.`,
            variant: 'warning',
          });
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Could not save the piece.',
        variant: 'danger',
      });
    }
  };

  const handleSaveAndAddAnother = async (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => {
    try {
      const { tuttiFile, movements, ...rest } = data;
      let savedPiece: MusicPiece;
      if (tuttiFile || (movements && movements.length > 0)) {
        savedPiece = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(rest, {
          tuttiFile,
          movements,
        });
      } else {
        savedPiece = await musicLibraryService.createPiece(rest);
      }

      const newPerformances = data.performances || [];
      if (newPerformances.length > 0) {
        const failedTitles: string[] = [];
        await Promise.all(
          newPerformances.map(async (perfId: string) => {
            let eventTitle = perfId;
            try {
              const event = await eventService.getEventById(perfId);
              eventTitle = event.title || perfId;
              const { updated, setList: updatedSetList } = appendPieceToSetList(
                event.setList,
                savedPiece
              );
              if (updated) {
                await eventService.updateEvent(perfId, { setList: updatedSetList });
              }
            } catch (err) {
              console.error(`Failed to update set list for performance ${perfId}:`, err);
              failedTitles.push(eventTitle);
            }
          })
        );
        if (failedTitles.length > 0) {
          dialog.showMessage({
            title: 'Set List Update Failed',
            message: `The piece was saved, but could not be appended to set lists for: ${failedTitles.join(', ')}.`,
            variant: 'warning',
          });
        }
      }

      setEditingPiece(null);
      dialog.showToast(`"${savedPiece.title}" saved. Ready to add another piece.`);
      await loadData();
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Could not save the piece.',
        variant: 'danger',
      });
    }
  };

  const handleDeletePiece = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Piece',
      message:
        'Are you sure you want to delete this piece? It will be removed from the library, but any set lists referencing its name will retain their text (though the link will be broken).',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    try {
      const children = await pb.collection('musicLibrary').getFullList<MusicPiece>({
        filter: pb.filter('parentId = {:id}', { id }),
      });

      let unlinkChildren = false;
      if (children.length > 0) {
        unlinkChildren = await dialog.confirm({
          title: 'Unlink Child Movements?',
          message: `This piece contains ${children.length} movement(s). Would you like to unlink and keep them as standalone pieces in your library? If you click "Cancel", they will be permanently deleted along with this parent piece.`,
          variant: 'warning',
          confirmLabel: 'Keep Movements (Unlink)',
          cancelLabel: 'Delete Everything',
        });
      }

      await musicLibraryService.deletePiece(id, { unlinkChildren });
      await loadData();
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Could not delete the piece.',
        variant: 'danger',
      });
    }
  };

  const handleCreateGenre = async (label: string): Promise<MusicGenreDef> => {
    const trimmed = label.trim();
    if (!trimmed) {
      throw new Error('Genre name cannot be empty.');
    }

    const currentList = musicLibrarySettings.genres || [];
    if (currentList.some((g) => g.label.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('Genre label already exists.');
    }

    const generatedId = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let finalId = generatedId;
    let counter = 2;
    while (currentList.some((g) => g.id === finalId)) {
      finalId = `${generatedId}-${counter}`;
      counter++;
    }

    const newGenre: MusicGenreDef = { id: finalId, label: trimmed };
    const updatedGenres = [...currentList, newGenre];

    const updatedSettings = {
      ...musicLibrarySettings,
      genres: updatedGenres,
    };

    await settingsService.saveMusicLibrarySettings(updatedSettings);

    setMusicLibrarySettings(JSON.parse(JSON.stringify(updatedSettings)));
    setInitialSettings(JSON.parse(JSON.stringify(updatedSettings)));
    setConfiguredGenres(updatedGenres);

    return newGenre;
  };

  const duplicateIds = useMemo(() => {
    const dups = findDuplicates(pieces);
    return new Set(dups.map((p) => p.id));
  }, [pieces]);

  const filteredPieces = useMemo(() => {
    return buildVisibleMusicLibraryRows(pieces, {
      searchTerm,
      showDuplicatesOnly,
      showMovements: false,
      duplicateIds,
      sectionFilters,
      genreFilters,
      genreFilterMode,
      recencyFilter,
      sortField,
      sortDirection,
      ignoreArticles,
    });
  }, [
    pieces,
    searchTerm,
    showDuplicatesOnly,
    duplicateIds,
    sectionFilters,
    genreFilters,
    genreFilterMode,
    recencyFilter,
    sortField,
    sortDirection,
    ignoreArticles,
  ]);

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
      confirmLabel: 'Delete',
    });

    if (confirm) {
      setIsBulkDeleting(true);
      try {
        await musicLibraryService.bulkDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
        await loadData();
      } catch {
        dialog.showMessage({
          title: 'Error',
          message: 'Failed to delete some pieces.',
          variant: 'danger',
        });
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header Area */}
      <div className="no-print flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Music Library</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Manage choir repertoire, movements, and learning tracks
        </p>
      </div>

      {/* Tabs / Actions Navigation Bar */}
      <div className="no-print flex w-full flex-row items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex gap-3 md:gap-6">
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'catalog'
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('catalog')}
          >
            Music Catalog
          </button>
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'config'
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('config')}
          >
            Library Settings
          </button>
        </div>

        <div className="flex items-center gap-2 pb-1.5">
          {activeTab === 'catalog' && (
            <>
              <Button
                variant="secondary"
                className="px-3 font-semibold md:px-6"
                onClick={handleExportCSV}
                title="Export CSV"
                icon={
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                }
              >
                <span className="hidden md:inline">Export CSV</span>
              </Button>
              <Button
                variant="secondary"
                className="px-3 font-semibold md:px-6"
                onClick={() => setIsImportModalOpen(true)}
                title="Import CSV"
                icon={
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                }
              >
                <span className="hidden md:inline">Import CSV</span>
              </Button>
              <Button
                variant="primary"
                className="px-3 font-semibold md:px-6"
                onClick={() => {
                  setEditingPiece(null);
                  setIsModalOpen(true);
                }}
                title="Add Piece"
                icon={
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              >
                <span className="hidden md:inline">Add Piece</span>
              </Button>
            </>
          )}
        </div>
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
            genreFilterMode={genreFilterMode}
            onGenreFilterModeChange={setGenreFilterMode}
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
            ignoreArticles={ignoreArticles}
            onIgnoreArticlesChange={setIgnoreArticles}
          />

          <MusicLibraryTable
            pieces={pieces}
            filteredPieces={paginatedPieces}
            genres={configuredGenres}
            isLoading={isLoading}
            duplicateIds={duplicateIds}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onSelectAll={(checked) => {
              const newSet = new Set(selectedIds);
              if (checked) {
                filteredPieces.forEach((p) => newSet.add(p.id));
              } else {
                filteredPieces.forEach((p) => newSet.delete(p.id));
              }
              setSelectedIds(newSet);
            }}
            onEditPiece={(piece, tab) => {
              setEditingPiece(piece);
              setModalInitialTab(tab || 'details');
              setIsModalOpen(true);
            }}
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
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField(field);
                setSortDirection('asc');
              }
            }}
          />
        </AppCard>
      ) : (
        <div className="flex flex-col gap-6">
          <AppCard title="Music Library Settings">
            <div className="max-w-[400px]">
              <FormField label="Catalog Lookup URL Template">
                <Input
                  type="url"
                  value={musicLibrarySettings.catalogLookupUrlTemplate || ''}
                  onChange={(event) =>
                    setMusicLibrarySettings({
                      ...musicLibrarySettings,
                      catalogLookupUrlTemplate: event.target.value,
                    })
                  }
                  placeholder="https://example.com/catalog/{catalogId}"
                />
                <p className="mt-1 text-xs text-text-muted">
                  Configure an external lookup URL format for Catalog IDs. Use{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                    {'{catalogId}'}
                  </code>{' '}
                  as the placeholder for the Catalog ID number (e.g.{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                    https://www.jwpepper.com/s?q={'{catalogId}'}
                  </code>
                  ).
                </p>
              </FormField>
            </div>
          </AppCard>

          <AppCard title="Music Library Genres">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-text-muted">
                Configure standard genre tags used for library organization and advanced layout
                filtering.
              </p>
              <div className="flex flex-col gap-2">
                {musicLibrarySettings.genres?.map((genre, index) => (
                  <div key={genre.id} className="flex items-center gap-4">
                    <Input
                      className="w-[250px]"
                      value={genre.label}
                      onChange={(e) => {
                        const updated = [...musicLibrarySettings.genres];
                        updated[index] = { ...updated[index], label: e.target.value };
                        setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                      }}
                      onBlur={() => {
                        const updated = [...musicLibrarySettings.genres].sort((a, b) =>
                          a.label.localeCompare(b.label)
                        );
                        setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                      }}
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="small"
                      onClick={async () => {
                        const targetGenre = musicLibrarySettings.genres[index];
                        const linkedPiecesCount = pieces.filter((p) =>
                          (p.genres || []).includes(targetGenre.id)
                        ).length;

                        if (linkedPiecesCount > 0) {
                          const confirmed = await dialog.confirm({
                            title: 'Delete Genre?',
                            message: `The genre "${targetGenre.label}" is currently linked to ${linkedPiecesCount} music piece(s). If you proceed and save, it will be removed from these pieces. Are you sure you want to delete this genre?`,
                            confirmLabel: 'Delete Genre',
                            cancelLabel: 'Cancel',
                            variant: 'warning',
                          });
                          if (!confirmed) return;
                        }

                        const updated = musicLibrarySettings.genres.filter((_, i) => i !== index);
                        setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-row gap-2">
                <Input
                  id="new-genre-input"
                  placeholder="New Genre Name (e.g. Sacred)"
                  className="max-w-[250px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const inputEl = document.getElementById('new-genre-input') as HTMLInputElement;
                    const label = inputEl?.value?.trim();
                    if (!label) return;

                    const normalized = label;
                    const currentList = musicLibrarySettings.genres || [];
                    if (
                      currentList.some((g) => g.label.toLowerCase() === normalized.toLowerCase())
                    ) {
                      dialog.showMessage({
                        title: 'Genre Exists',
                        message: 'Genre label already exists.',
                        variant: 'warning',
                      });
                      return;
                    }

                    const generatedId = normalized
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    let finalId = generatedId;
                    let counter = 2;
                    while (currentList.some((g) => g.id === finalId)) {
                      finalId = `${generatedId}-${counter}`;
                      counter++;
                    }

                    const updated = [...currentList, { id: finalId, label: normalized }].sort(
                      (a, b) => a.label.localeCompare(b.label)
                    );
                    setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                    inputEl.value = '';
                  }}
                >
                  Add Genre
                </Button>
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
