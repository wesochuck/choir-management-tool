import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece, type MusicPieceInput } from '../../services/musicLibraryService';
import { musicLibraryWorkflows } from '../../services/musicLibraryWorkflows';
import { eventService } from '../../services/eventService';
import { settingsService, getVoicePartsAndSections, type SectionDef, type MusicGenreDef } from '../../services/settingsService';
import { pb } from '../../lib/pocketbase';
import { exportMusicToCSV, findDuplicates, appendPieceToSetList } from '../../lib/musicPieceUtils';
import { buildVisibleMusicLibraryRows } from '../../lib/music/libraryRows';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { MusicPieceModal } from './music-library/MusicPieceModal';
import { MusicLibraryFilters } from './music-library/MusicLibraryFilters';
import { MusicLibraryTable } from './music-library/MusicLibraryTable';
import { FloatingAudioPlayer } from './music-library/FloatingAudioPlayer';

export default function MusicLibraryView() {
  const dialog = useDialog();

  const [pieces, setPieces] = useState<MusicPiece[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [configuredGenres, setConfiguredGenres] = useState<MusicGenreDef[]>([]);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
      setPieces(data);
      setCatalogLookupTemplate(settings.catalogLookupUrlTemplate || '');
      setSections(sectionsData.sections);
      setConfiguredGenres(settings.genres || []);
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
      showMovements: false,
      duplicateIds,
      sectionFilter,
      genreFilter
    });
  }, [pieces, searchTerm, showDuplicatesOnly, duplicateIds, sectionFilter, genreFilter]);

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
        <MusicLibraryFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sectionFilter={sectionFilter}
          onSectionFilterChange={setSectionFilter}
          genreFilter={genreFilter}
          onGenreFilterChange={setGenreFilter}
          genres={configuredGenres}
          sections={sections}
          showDuplicatesOnly={showDuplicatesOnly}
          onShowDuplicatesOnlyChange={setShowDuplicatesOnly}
          duplicateCount={duplicateIds.size}
          selectedCount={selectedIds.size}
          isBulkDeleting={isBulkDeleting}
          onBulkDelete={handleBulkDelete}
        />

        <MusicLibraryTable 
          pieces={pieces}
          filteredPieces={filteredPieces}
          sections={sections}
          genres={configuredGenres}
          isLoading={isLoading}
          duplicateIds={duplicateIds}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onSelectAll={(checked) => {
            if (checked) {
                setSelectedIds(new Set(filteredPieces.map(p => p.id)));
            } else {
                setSelectedIds(new Set());
            }
          }}
          onEditPiece={(piece) => { setEditingPiece(piece); setIsModalOpen(true); }}
          onPlayTrack={handlePlayDefaultTrack}
          catalogLookupTemplate={catalogLookupTemplate}
        />
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
        allGenres={configuredGenres}
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

