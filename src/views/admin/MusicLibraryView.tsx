import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
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
  type MusicGenreDef,
  type MusicLibrarySettings,
} from '../../services/settingsService';
import { pb } from '../../lib/pocketbase';
import { exportMusicToCSV, findDuplicates, appendPiecesToSetList } from '../../lib/musicPieceUtils';
import {
  buildVisibleMusicLibraryRows,
  type MusicLibrarySortField,
  type SortDirection,
  type FilterMode,
} from '../../lib/music/libraryRows';
import type { PerformanceRecencyFilter } from '../../lib/music/performanceHistory';
import { usePiecePerformanceMap } from '../../hooks/usePiecePerformanceMap';
import { useEvents } from '../../hooks/useEvents';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { MusicPieceModal } from './music-library/MusicPieceModal';
import { AddToSetListModal } from './music-library/AddToSetListModal';
import { MusicLibrarySelectionToolbar } from './music-library/MusicLibrarySelectionToolbar';
import { MusicLibraryFilters } from './music-library/MusicLibraryFilters';
import { MusicLibraryTable } from './music-library/MusicLibraryTable';
import { FloatingAudioPlayer } from './music-library/FloatingAudioPlayer';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';
import { Button, FormField, Input } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminPageTabs } from '../../components/admin/AdminPageTabs';

export default function MusicLibraryView() {
  const queryClient = useQueryClient();
  const dialog = useDialog();

  const invalidateMusicLibrary = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all }),
    [queryClient]
  );

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => musicLibraryService.bulkDelete(ids),
    onSuccess: () => {
      invalidateMusicLibrary();
      setSelectedIds(new Set());
    },
  });

  const configSaveMutation = useMutation({
    mutationFn: (settings: MusicLibrarySettings) =>
      settingsService.saveMusicLibrarySettings(settings),
    onSuccess: invalidateMusicLibrary,
  });

  const genreCreateMutation = useMutation({
    mutationFn: (settings: MusicLibrarySettings) =>
      settingsService.saveMusicLibrarySettings(settings),
    onSuccess: invalidateMusicLibrary,
  });

  const pieceSaveMutation = useMutation({
    mutationFn: async (input: {
      existingId?: string;
      data: Partial<MusicPieceInput>;
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }) => {
      if (input.existingId) {
        const updateData = { ...input.data };
        delete updateData.tuttiFile;
        delete updateData.movements;
        return musicLibraryService.updatePiece(input.existingId, updateData);
      }
      const { tuttiFile, movements, ...rest } = input.data;
      if (tuttiFile || (movements && movements.length > 0)) {
        return musicLibraryWorkflows.createPieceWithMovementsAndTutti(rest as MusicPieceInput, {
          tuttiFile: tuttiFile ?? undefined,
          movements: movements ?? [],
        });
      }
      return musicLibraryService.createPiece(rest);
    },
    onSuccess: invalidateMusicLibrary,
  });

  const pieceDeleteMutation = useMutation({
    mutationFn: ({ id, unlinkChildren }: { id: string; unlinkChildren: boolean }) =>
      musicLibraryService.deletePiece(id, { unlinkChildren }),
    onSuccess: invalidateMusicLibrary,
  });

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
  const libraryQuery = useQuery({
    queryKey: queryKeys.musicLibrary.list(),
    queryFn: () => musicLibraryService.getLibrary(),
    staleTime: 60_000,
  });
  const pieces = useMemo(() => libraryQuery.data ?? [], [libraryQuery.data]);

  const { events: allEvents } = useEvents();
  const perfMap = usePiecePerformanceMap(allEvents);

  const settingsLibQuery = useQuery({
    queryKey: queryKeys.appSettings.musicLibrary,
    queryFn: () => settingsService.getMusicLibrarySettings(),
    staleTime: 60_000,
  });

  const voicePartsQuery = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
    staleTime: 60_000,
  });
  const sections = useMemo(() => voicePartsQuery.data?.sections ?? [], [voicePartsQuery.data]);

  const isLoading =
    libraryQuery.isLoading || settingsLibQuery.isLoading || voicePartsQuery.isLoading;

  useEffect(() => {
    if (!settingsLibQuery.data) return;
    const settings = settingsLibQuery.data;
    const sortedGenres = [...(settings.genres || [])].sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
    setConfiguredGenres(sortedGenres);

    const settingsState = {
      catalogLookupUrlTemplate: settings.catalogLookupUrlTemplate || '',
      genres: sortedGenres,
    };
    setMusicLibrarySettings(JSON.parse(JSON.stringify(settingsState)));
    setInitialSettings(JSON.parse(JSON.stringify(settingsState)));
  }, [settingsLibQuery.data]);

  const invalidateLibrary = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.musicLibrary }),
      queryClient.invalidateQueries({ queryKey: queryKeys.voiceParts.all }),
    ]);
  };

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
  const [isAddToSetListOpen, setIsAddToSetListOpen] = useState(false);

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

  const handleConfigSave = async () => {
    const sortedSettings = {
      ...musicLibrarySettings,
      genres: [...musicLibrarySettings.genres].sort((a, b) => a.label.localeCompare(b.label)),
    };

    const deletedGenres = (initialSettings?.genres || []).filter(
      (ig) => !sortedSettings.genres.some((g) => g.id === ig.id)
    );

    try {
      await configSaveMutation.mutateAsync(sortedSettings);
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
              await invalidateMusicLibrary();
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
      await pieceSaveMutation.mutateAsync({
        existingId: editingPiece?.id,
        data: data as Partial<MusicPieceInput>,
        tuttiFile: data.tuttiFile,
        movements: data.movements,
      });

      setIsModalOpen(false);
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
      const savedPiece = await pieceSaveMutation.mutateAsync({
        existingId: undefined,
        data: data as Partial<MusicPieceInput>,
        tuttiFile: data.tuttiFile,
        movements: data.movements,
      });

      setEditingPiece(null);
      dialog.showToast(`"${savedPiece.title}" saved. Ready to add another piece.`);
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
      const children = await musicLibraryService.getMovements(id);

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

      await pieceDeleteMutation.mutateAsync({ id, unlinkChildren });
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

    await genreCreateMutation.mutateAsync(updatedSettings);

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
    return buildVisibleMusicLibraryRows(
      pieces,
      {
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
      },
      perfMap
    );
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
    perfMap,
  ]);

  const paginatedPieces = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPieces.slice(startIndex, startIndex + pageSize);
  }, [filteredPieces, currentPage, pageSize]);

  const selectedPieces = useMemo(() => {
    return pieces.filter((piece) => selectedIds.has(piece.id) && !piece.parentId);
  }, [pieces, selectedIds]);

  const performancesQuery = useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: async () => {
      const events = await eventService.getEvents();
      const now = Date.now();
      return events
        .filter((event) => event.type === 'Performance')
        .sort((a, b) => {
          const aTime = new Date(a.date).getTime();
          const bTime = new Date(b.date).getTime();
          const aIsUpcoming = aTime >= now;
          const bIsUpcoming = bTime >= now;
          if (aIsUpcoming !== bIsUpcoming) return aIsUpcoming ? -1 : 1;
          return aTime - bTime;
        });
    },
    staleTime: 60_000,
  });

  const addSelectedToSetListMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const event = await eventService.getEventById(eventId);
      const pieceData = selectedPieces.map((p) => ({
        id: p.id,
        title: p.title,
        composer: p.composer,
        duration: p.duration,
        notes: p.notes,
      }));
      const result = appendPiecesToSetList(event.setList, pieceData);
      if (result.addedCount > 0) {
        await eventService.updateEvent(eventId, { setList: result.setList });
      }
      return { event, addedCount: result.addedCount, skippedCount: result.skippedCount };
    },
    onSuccess: ({ event, addedCount, skippedCount }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      if (addedCount > 0 && skippedCount > 0) {
        dialog.showToast(
          `Added ${addedCount} title${addedCount === 1 ? '' : 's'} to "${event.title}". ${skippedCount} already ${skippedCount === 1 ? 'was' : 'were'} on the set list.`
        );
      } else if (addedCount > 0) {
        dialog.showToast(
          `Added ${addedCount} title${addedCount === 1 ? '' : 's'} to "${event.title}".`
        );
      } else {
        dialog.showToast('All selected titles were already on that set list.');
      }
      setSelectedIds(new Set());
      setIsAddToSetListOpen(false);
    },
    onError: async (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'Could Not Update Set List',
        message,
        variant: 'danger',
      });
    },
  });

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirm = await dialog.confirm({
      title: 'Bulk Delete',
      message: `Are you sure you want to delete ${selectedIds.size} pieces?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });

    if (confirm) {
      try {
        await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      } catch {
        dialog.showMessage({
          title: 'Error',
          message: 'Failed to delete some pieces.',
          variant: 'danger',
        });
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Music Library"
        description="Manage choir repertoire, movements, and learning tracks"
        below={
          <AdminPageTabs
            ariaLabel="Music library sections"
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as 'catalog' | 'config')}
            tabs={[
              { value: 'catalog', label: 'Music Catalog' },
              { value: 'config', label: 'Library Settings' },
            ]}
            actions={
              activeTab === 'catalog' ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleExportCSV}
                    title="Export CSV"
                    icon={'⬇️'}
                  >
                    <span className="hidden md:inline">Export CSV</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsImportModalOpen(true)}
                    title="Import CSV"
                    icon={'⬆️'}
                  >
                    <span className="hidden md:inline">Import CSV</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingPiece(null);
                      setIsModalOpen(true);
                    }}
                    title="Add Piece"
                    icon={'➕'}
                  >
                    <span className="hidden md:inline">Add Piece</span>
                  </Button>
                </>
              ) : null
            }
          />
        }
      />

      {activeTab === 'catalog' ? (
        <div className={selectedIds.size > 0 ? 'pb-36 sm:pb-28' : undefined}>
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
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              recencyFilter={recencyFilter}
              onRecencyFilterChange={setRecencyFilter}
              ignoreArticles={ignoreArticles}
              onIgnoreArticlesChange={setIgnoreArticles}
            />

            <MusicLibrarySelectionToolbar
              selectedCount={selectedIds.size}
              isBulkDeleting={bulkDeleteMutation.isPending}
              isAddingToSetList={addSelectedToSetListMutation.isPending}
              onAddToSetList={() => setIsAddToSetListOpen(true)}
              onDeleteSelected={handleBulkDelete}
              onClearSelection={() => setSelectedIds(new Set())}
            />

            <MusicLibraryTable
              pieces={pieces}
              filteredPieces={paginatedPieces}
              genres={configuredGenres}
              isLoading={isLoading}
              duplicateIds={duplicateIds}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
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
              onSortChange={(field, direction) => {
                setSortField(field);
                setSortDirection(direction);
              }}
              perfMap={perfMap}
            />
          </AppCard>
        </div>
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
                <p className="text-text-muted mt-1 text-xs">
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
              <p className="text-text-muted text-sm">
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
            isSaving={configSaveMutation.isPending}
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
        onRefresh={invalidateLibrary}
        allPieces={pieces}
        allGenres={configuredGenres}
        onCreateGenre={handleCreateGenre}
        initialTab={modalInitialTab}
        isSaving={pieceSaveMutation.isPending}
      />

      <AddToSetListModal
        isOpen={isAddToSetListOpen}
        selectedPieces={selectedPieces}
        performances={performancesQuery.data ?? []}
        isSaving={addSelectedToSetListMutation.isPending}
        onClose={() => setIsAddToSetListOpen(false)}
        onConfirm={(eventId) => {
          addSelectedToSetListMutation.mutateAsync(eventId);
        }}
      />

      <MusicImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={invalidateLibrary}
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
