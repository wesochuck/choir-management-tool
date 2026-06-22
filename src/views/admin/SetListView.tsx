import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useEventPlayerLink } from './events/useEventPlayerLink';
import { useDialog } from '../../contexts/DialogContext';
import { useQueryClient } from '@tanstack/react-query';
import { useSetListData } from './setlists/useSetListData';
import { useSetListLibrary } from './setlists/useSetListLibrary';
import { useSetListAudioPlayer } from './setlists/useSetListAudioPlayer';
import { SetListToolbar } from './setlists/SetListToolbar';
import { SetListDurationBar } from './setlists/SetListDurationBar';
import { SetListPrintContent } from './setlists/SetListPrintContent';
import { SetListPrintModal } from './setlists/SetListPrintModal';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AppCard } from '../../components/common/AppCard';
import { SetListInlineCreator } from '../../components/admin/SetListInlineCreator';
import { SortableSetListItem } from '../../components/admin/SortableSetListItem';
import { SetListItemEditModal } from '../../components/admin/SetListItemEditModal';
import { MusicPieceModal } from './music-library/MusicPieceModal';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { FloatingAudioPlayer } from './music-library/FloatingAudioPlayer';
import { PlayerLinkModal } from '../../components/admin/PlayerLinkModal';
import { Button, Spinner } from '../../components/ui';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SetListItem } from '../../services/eventService';

export default function SetListView() {
  const { timezone } = useChoirSettings();
  const { events, refresh } = useEvents();
  const [searchParams] = useSearchParams();
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const setList = useSetListData(events, searchParams, timezone, dialog);
  const library = useSetListLibrary({
    dialog,
    queryClient,
    items: setList.items,
    updateItems: setList.updateItems,
    library: setList.library,
  });
  const audio = useSetListAudioPlayer();
  const playerLink = useEventPlayerLink(dialog);

  // Custom item edit modal
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<SetListItem | null>(null);

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Import modal (legacy — no longer actively used)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleEdit = (item: SetListItem) => {
    const displayRow = setList.itemsWithDetails.find((i) => i.id === item.id);
    const pieceId = item.pieceId || displayRow?.resolvedPiece?.id;
    if (pieceId) {
      library.handleOpenPieceEditor(pieceId);
    } else {
      setItemEditing(item);
      setIsItemEditModalOpen(true);
    }
  };

  const handleSaveItem = async (updatedItem: SetListItem) => {
    await setList.updateItems(
      setList.items.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    setIsItemEditModalOpen(false);
  };

  const handlePrintList = () => {
    window.print();
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(setList.plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dialog.showToast('Set list copied to clipboard.');
    } catch (err) {
      console.error('Failed to copy set list:', err);
    }
  }, [setList.plainText, dialog]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Set Lists"
        description="Manage performance set lists, timings, and singer visibility"
        actions={
          setList.selectedEvent ? (
            <>
              <Button
                variant="secondary"
                onClick={() => playerLink.handleOpenPlayer(setList.selectedEvent)}
                title="Open practice player link generator"
              >
                <span aria-hidden="true">🎧</span>
                <span>Practice Player</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsPrintModalOpen(true)}
                title="View printable set list"
              >
                <span aria-hidden="true">🖨️</span>
                <span>Print &amp; Copy</span>
              </Button>
            </>
          ) : null
        }
      />

      <div className="no-print">
        <AppCard noPadding>
          <SetListToolbar
            events={events}
            selectedEventId={setList.selectedEventId}
            selectedEvent={setList.selectedEvent}
            parentPerformance={setList.parentPerformance}
            localApproved={setList.localApproved}
            timezone={timezone}
            onEventChange={setList.setSelectedEventId}
            onCopyFrom={setList.handleCopyFrom}
            onToggleApproved={setList.handleToggleApproved}
            onGoToParent={() => {
              if (setList.parentPerformance) {
                setList.setSelectedEventId(setList.parentPerformance.id);
              }
            }}
          />

          {setList.selectedEventId ? (
            <div className="flex flex-col gap-4 p-4">
              {setList.selectedEvent?.type === 'Rehearsal' && (
                <div className="border-warning-border bg-warning-bg/70 text-warning-text rounded-r-md border-l-4 p-3 text-sm leading-relaxed">
                  <div className="mb-1 font-semibold">⚠️ Rehearsal Mode</div>
                  <p className="m-0">
                    This rehearsal inherits its set list and singer visibility from the parent
                    Performance: <strong>{setList.parentPerformance?.title || 'Concert'}</strong>.
                    Direct edits here will not be visible on the Singer Dashboard.
                  </p>
                  {setList.parentPerformance && (
                    <Button
                      variant="secondary"
                      size="small"
                      className="mt-2"
                      onClick={() => setList.setSelectedEventId(setList.parentPerformance!.id)}
                    >
                      Manage Parent Set List
                    </Button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4">
                {setList.items.length > 0 && (
                  <SetListDurationBar
                    items={setList.items}
                    durationTotals={setList.durationTotals}
                    localGapSeconds={setList.localGapSeconds}
                    onGapChange={setList.handleAnnouncementGapChange}
                  />
                )}

                <div>
                  <SetListInlineCreator
                    library={setList.library}
                    onAddItem={setList.handleInlineAddItem}
                    onCreateNewPiece={library.handleCreateNewPieceFromSetList}
                    disabled={setList.isLoading}
                  />
                </div>

                {setList.items.length === 0 ? (
                  <div className="text-text-muted p-12 text-center text-sm">
                    No items in set list. Select event/add items above to build.
                  </div>
                ) : (
                  <div className="border-border bg-surface-muted/50 flex flex-col gap-2 rounded-md border p-2">
                    <DndContext
                      sensors={setList.sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={setList.handleDragEnd}
                    >
                      <SortableContext
                        items={setList.items.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {setList.itemsWithDetails.map((item) => (
                          <SortableSetListItem
                            key={item.id}
                            item={item}
                            linkedPiece={item.resolvedPiece || undefined}
                            displayTitle={item.displayTitle}
                            displayComposer={item.displayComposer}
                            displayDuration={item.displayDuration}
                            cumulativeStart={item.cumulativeStart}
                            cumulativeEnd={item.cumulativeEnd}
                            onEdit={handleEdit}
                            onDelete={setList.handleDelete}
                            onPlayTrack={audio.handlePlayRowTrack}
                            onPieceClick={library.handleOpenPieceEditor}
                            genres={setList.configuredGenres}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>

              {setList.items.length > 0 ? (
                <div className="text-text-muted flex flex-col justify-between gap-2 px-2 py-1 text-xs sm:flex-row sm:items-center">
                  <span className="italic">
                    Tip: Drag the ⣿ handle on any row to reorder set list items. Changes are saved
                    automatically.
                  </span>
                  {setList.isPending && (
                    <div className="flex shrink-0 items-center gap-1.5 font-medium">
                      <Spinner size="small" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>
              ) : (
                setList.isPending && (
                  <div className="text-text-muted flex justify-end px-2 py-1 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Spinner size="small" />
                      <span>Saving...</span>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="p-16 text-center">
              <p className="text-text-muted m-0 text-sm">
                Select an event above to view and manage its set list.
              </p>
            </div>
          )}
        </AppCard>
      </div>

      {/* @allow-inline-style - print page styling rule for print-only rendering */}
      <div className="mx-auto hidden max-w-2xl p-8 print:block" style={{ page: 'setlist' }}>
        <SetListPrintContent
          selectedEvent={setList.selectedEvent}
          itemsWithDetails={setList.itemsWithDetails}
          timezone={timezone}
        />
      </div>

      <div className="no-print">
        <MusicPieceModal
          isOpen={library.isLibraryModalOpen}
          piece={library.libraryEditingPiece}
          onClose={library.onCloseLibraryModal}
          onSave={library.handleSaveLibraryPiece}
          onDelete={library.libraryEditingPiece ? library.handleDeleteLibraryPiece : undefined}
          catalogLookupTemplate={setList.catalogLookupTemplate}
          allPieces={setList.library}
          allGenres={setList.configuredGenres}
          initialTitle={library.prefilledTitleForSetList || undefined}
        />

        <SetListItemEditModal
          isOpen={isItemEditModalOpen}
          item={itemEditing}
          onClose={() => setIsItemEditModalOpen(false)}
          onSave={handleSaveItem}
        />

        <MusicImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={refresh}
        />

        <FloatingAudioPlayer
          url={audio.activeAudioUrl}
          title={audio.activeAudioTitle}
          part={audio.activeAudioPart}
          onClose={audio.clearAudio}
        />

        <SetListPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          selectedEvent={setList.selectedEvent}
          itemsWithDetails={setList.itemsWithDetails}
          timezone={timezone}
          onCopy={handleCopy}
          onPrint={handlePrintList}
          copied={copied}
        />

        <PlayerLinkModal
          isOpen={playerLink.isOpen}
          onClose={() => playerLink.setIsOpen(false)}
          url={playerLink.url}
          eventTitle={playerLink.eventTitle}
        />
      </div>
    </div>
  );
}
