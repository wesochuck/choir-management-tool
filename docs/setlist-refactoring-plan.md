# SetListView Refactoring Plan

**Target:** `src/views/admin/SetListView.tsx` — 901 lines → ~250 lines

## Problem

`SetListView.tsx` mixes three independent concerns in one function:

1. **Set list CRUD** — event selection, items state with optimistic rollback, drag-and-drop
   reorder, gap timing, approval toggle
2. **Music library management** — create/edit library pieces from the set list context via
   `MusicPieceModal`
3. **Output views** — print layout (with an identical inline print-preview inside a Modal),
   audio preview, player link

There is no data hook. State (`useState`), effects (`useEffect`), mutations (`useMutation`),
and handlers are all inline. About 400 lines are logic and 450 are JSX.

## Split Overview

```
src/views/admin/setlists/
  useSetListData.ts          ~180 lines   — all state + mutations + derived memos
  useSetListLibrary.ts       ~100 lines   — MusicPieceModal state and handlers
  useSetListAudioPlayer.ts   ~ 40 lines   — audio playback state
  SetListToolbar.tsx          ~100 lines   — event selector + copy + visibility + rehearsal
  SetListDurationBar.tsx      ~ 35 lines   — stats + gap input (inline number field)
  SetListPrintContent.tsx     ~ 50 lines   — reusable numbered song list (print + modal)
  SetListPrintModal.tsx       ~ 90 lines   — Modal wrapping SetListPrintContent
```

---

## Phase 1 — `useSetListData`

Pull all of this out of the component into a dedicated hook file at
`src/views/admin/setlists/useSetListData.ts`.

### State
- `selectedEventId` / `setSelectedEventId`
- `items: SetListItem[]` / `setItems` (with `updateItems` providing optimistic rollback)
- `localGapSeconds` / `localApproved`
- `gapSaveTimerRef` / `selectedEventIdRef` / `hasDefaultedRef`

### Mutations
- `setListMutation` — saves items to event record
- `eventUpdateMutation` — saves `setListApproved` and `announcementGapSeconds`

### Handlers
- `handleDelete(id)` — confirm + filter + save
- `handleDragEnd(event: DragEndEvent)` — arrayMove + save
- `handleInlineAddItem(item)` — append + save
- `handleCopyFrom(sourceEventId)` — confirm + clone with new IDs + save
- `handleToggleApproved(checked)` — optimistic + mutate
- `handleAnnouncementGapChange(seconds)` — debounced via 500ms ref timer
- `updateItems(newItems): Promise<boolean>` — optimistic set + save + rollback on failure
- `saveSetList(newItems): Promise<boolean>` — calls setListMutation

### Memos
- `selectedEvent` = `events.find(id)`
- `parentPerformance` = rehearsal parent lookup
- `durationTotals` = `calculateSetListDurationTotals(items, library, localGapSeconds)`
- `itemsWithDetails` = `resolveSetListDisplayRows(items, library)`
- `plainText` = `buildSetListPlainText(...)`

### Effects
- Initial event default from URL params or future performance
- Load items/gap/approved when `selectedEventId` or `events` changes
- gapSaveTimer cleanup on unmount
- Sync `selectedEventIdRef` to `selectedEventId`

### Sensors
- dnd-kit `useSensors(PointerSensor, KeyboardSensor)` returned for consumer

### Returns
```ts
{
  selectedEventId: string
  setSelectedEventId: (id: string) => void
  selectedEvent: Event | undefined
  parentPerformance: Event | null
  items: SetListItem[]
  itemsWithDetails: SetListDisplayRow[]
  durationTotals: DurationTotals
  plainText: string
  library: MusicPiece[]
  isLoading: boolean
  localGapSeconds: number
  localApproved: boolean
  isPending: boolean
  configuredGenres: MusicGenreDef[]
  catalogLookupTemplate: string
  sensors: Sensors
  handleDelete: (id: string) => Promise<void>
  handleDragEnd: (event: DragEndEvent) => Promise<void>
  handleInlineAddItem: (item: SetListItem) => Promise<void>
  handleCopyFrom: (sourceEventId: string) => Promise<void>
  handleToggleApproved: (checked: boolean) => Promise<void>
  handleAnnouncementGapChange: (seconds: number) => void
}
```

---

## Phase 2 — `useSetListLibrary`

Encapsulates the `MusicPieceModal` lifecycle from within the set list context.

### State
- `isLibraryModalOpen` / `setIsLibraryModalOpen`
- `libraryEditingPiece` / `setLibraryEditingPiece`
- `pendingSetListAdd` — when true, newly saved piece is appended to items
- `prefilledTitleForSetList` — passed as `initialTitle` to modal

### Handlers
- `handleOpenPieceEditor(pieceId: string)` — resolves child movements to parent,
  opens modal
- `handleSaveLibraryPiece(data)` — create or update piece, update library cache,
  optionally append to items via `pendingSetListAdd`
- `handleDeleteLibraryPiece()` — delete + refresh cache
- `handleCreateNewPieceFromSetList(title: string)` — opens modal with prefilled
  title, sets `pendingSetListAdd = true`

### Requires from parent
```ts
{
  dialog,
  queryClient,
  items: SetListItem[],
  updateItems: (items: SetListItem[]) => Promise<boolean>,
  library: MusicPiece[],
}
```

---

## Phase 3 — `useSetListAudioPlayer`

### State
- `activeAudioUrl`, `setActiveAudioUrl`
- `activeAudioTitle`, `activeAudioPart`

### Handlers
- `handlePlayRowTrack(piece: MusicPiece)` — resolves track key, builds file URL

---

## Phase 4 — Extract sub-components

### `SetListToolbar.tsx`

Extract lines 463–561 (the toolbar area inside the `AppCard`).

Contains:
- Event selector `<Select>`
- Copy-from selector (conditional on `selectedEvent`)
- Singer Visibility checkbox (conditional on `selectedEvent.type === 'Performance'`)
- Parent set list button (conditional on `selectedEvent.type === 'Rehearsal'`)

Props:
```ts
{
  events: Event[]
  selectedEventId: string
  selectedEvent: Event | undefined
  parentPerformance: Event | null
  localApproved: boolean
  timezone: string
  onEventChange: (id: string) => void
  onCopyFrom: (sourceEventId: string) => Promise<void>
  onToggleApproved: (checked: boolean) => Promise<void>
  onGoToParent: () => void
}
```

### `SetListDurationBar.tsx`

Extract lines 586–620 (the stats bar shown when items exist).

Props:
```ts
{
  items: SetListItem[]
  durationTotals: DurationTotals
  localGapSeconds: number
  onGapChange: (seconds: number) => void
}
```

### `SetListPrintContent.tsx`

Extract the numbered song list renderer. This is identical in two places:

- Lines 703–763 (print-only `div` with `print:block`)
- Lines 835–889 (inside the print Modal)

Props:
```ts
{
  selectedEvent: Event | null | undefined
  itemsWithDetails: SetListDisplayRow[]
  timezone: string
}
```

Returns the JSX output. The consumer can wrap it in whatever container they need
(print-only `div` vs. modal body).

### `SetListPrintModal.tsx`

Extract lines 802–890 (the `Modal` wrapping the print preview).

Props:
```ts
{
  isOpen: boolean
  onClose: () => void
  selectedEvent: Event | null | undefined
  itemsWithDetails: SetListDisplayRow[]
  timezone: string
}
```

Internally uses `SetListPrintContent` to avoid duplication.

---

## Final `SetListView.tsx` (~200–250 lines)

```tsx
import { useDialog } from '../../contexts/DialogContext';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useEventPlayerLink } from '../events/useEventPlayerLink';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AppCard } from '../../components/common/AppCard';
import { SetListInlineCreator } from '../../components/admin/SetListInlineCreator';
import { SortableSetListItem } from '../../components/admin/SortableSetListItem';
import { DndContext, SortableContext, verticalListSortingStrategy } from '@dnd-kit/core';
import { MusicPieceModal } from '../music-library/MusicPieceModal';
import { SetListItemEditModal } from '../../components/admin/SetListItemEditModal';
import { MusicImportModal } from '../../components/admin/MusicImportModal';
import { FloatingAudioPlayer } from '../music-library/FloatingAudioPlayer';
import { PlayerLinkModal } from '../../components/admin/PlayerLinkModal';
import { SetListToolbar } from './setlists/SetListToolbar';
import { SetListDurationBar } from './setlists/SetListDurationBar';
import { SetListPrintContent } from './setlists/SetListPrintContent';
import { SetListPrintModal } from './setlists/SetListPrintModal';
import { useSetListData } from './setlists/useSetListData';
import { useSetListLibrary } from './setlists/useSetListLibrary';
import { useSetListAudioPlayer } from './setlists/useSetListAudioPlayer';

export default function SetListView() {
  const { timezone } = useChoirSettings();
  const { events, refresh } = useEvents();
  const [searchParams] = useSearchParams();
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const setList = useSetListData(events, searchParams, timezone);
  const library = useSetListLibrary(dialog, queryClient, setList.items, setList.updateItems, setList.library);
  const audio = useSetListAudioPlayer();
  const playerLink = useEventPlayerLink(dialog);

  // Manage custom item edit modal and bridge to library edits
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<SetListItem | null>(null);

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
    await setList.updateItems(setList.items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    setIsItemEditModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader ... />

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
        />

        {setList.selectedEventId ? (
          <div className="flex flex-col gap-4 p-4">
            <SetListDurationBar
              items={setList.items}
              durationTotals={setList.durationTotals}
              localGapSeconds={setList.localGapSeconds}
              onGapChange={setList.handleAnnouncementGapChange}
            />

            <SetListInlineCreator
              library={setList.library}
              onAddItem={setList.handleInlineAddItem}
              onCreateNewPiece={library.handleCreateNewPieceFromSetList}
              disabled={setList.isLoading}
            />

            {setList.items.length === 0 ? (
              <EmptyState />
            ) : (
              <DndContext sensors={setList.sensors} collisionDetection={closestCenter}
                onDragEnd={setList.handleDragEnd}>
                <SortableContext items={setList.items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}>
                  {setList.itemsWithDetails.map(item => (
                    <SortableSetListItem 
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      // ...
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            <SavingIndicator isPending={setList.isPending} />
          </div>
        ) : (
          <SelectEventPrompt />
        )}
      </AppCard>

      <SetListPrintContent
        selectedEvent={setList.selectedEvent}
        itemsWithDetails={setList.itemsWithDetails}
        timezone={timezone}
      />

      <MusicPieceModal
        isOpen={library.isLibraryModalOpen}
        piece={library.libraryEditingPiece}
        onClose={library.onCloseLibraryModal}
        onSave={library.handleSaveLibraryPiece}
        onDelete={library.handleDeleteLibraryPiece}
        catalogLookupTemplate={setList.catalogLookupTemplate}
        allPieces={setList.library}
        allGenres={setList.configuredGenres}
        initialTitle={library.prefilledTitleForSetList ?? undefined}
      />

      <SetListItemEditModal 
        isOpen={isItemEditModalOpen}
        item={itemEditing}
        onClose={() => setIsItemEditModalOpen(false)}
        onSave={handleSaveItem}
      />
      {/* Note: MusicImportModal and its isImportModalOpen state are completely dead code in the original SetListView and should be omitted entirely. */}
      <FloatingAudioPlayer ... />
      <SetListPrintModal ... />
      <PlayerLinkModal ... />
    </div>
  );
}
```

---

## Benefits

- **Testable hooks** — data CRUD, library save/delete, and audio playback can each be
  unit-tested with `vitest` + `QueryClientProvider` wrappers.
- **Eliminates duplication** — `SetListPrintContent` replaces the identical song-list
  renderer that currently appears in two places (print-only div + modal body).
- **Modular composition** — the view becomes a flat list of named components; each
  extraction removes a JSX chunk and makes the parent easier to read.
- **No behavioral change** — all handlers, optimistic updates, debounce timing, and
  error handling are preserved exactly.

---

## Verification

After implementation:

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
rtk npx tsc --noEmit --pretty
rtk npx vitest run
```
