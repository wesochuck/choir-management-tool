import { Button } from '../../../components/ui';

interface MusicLibrarySelectionToolbarProps {
  selectedCount: number;
  isBulkDeleting: boolean;
  isAddingToSetList?: boolean;
  onAddToSetList: () => void;
  onDeleteSelected: () => void;
  onClearSelection?: () => void;
}

export function MusicLibrarySelectionToolbar({
  selectedCount,
  isBulkDeleting,
  isAddingToSetList = false,
  onAddToSetList,
  onDeleteSelected,
  onClearSelection,
}: MusicLibrarySelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="border-primary/35 ring-primary/15 fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-6xl overflow-hidden rounded-2xl border-2 bg-white/98 shadow-[0_12px_35px_rgba(15,23,42,0.22)] ring-1 backdrop-blur"
      role="region"
      aria-label="Selected music title actions"
    >
      <div className="bg-primary h-1" />

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="bg-primary-light text-primary-deep inline-flex size-7 items-center justify-center rounded-full text-sm font-bold">
            {selectedCount}
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {selectedCount === 1 ? 'title selected' : 'titles selected'}
          </span>
          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="ml-2 cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-slate-500 underline transition-colors hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="secondary"
            size="small"
            onClick={onAddToSetList}
            disabled={isAddingToSetList}
            className="w-full sm:w-auto"
          >
            Add to Set List
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={onDeleteSelected}
            disabled={isBulkDeleting}
            className="w-full sm:w-auto"
          >
            {isBulkDeleting ? 'Deleting\u2026' : 'Delete Selected'}
          </Button>
        </div>
      </div>
    </div>
  );
}
