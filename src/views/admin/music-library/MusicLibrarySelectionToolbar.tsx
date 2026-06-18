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
    <div className="border-primary-light bg-primary-light/30 flex flex-col gap-3 border-y px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
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
            className="ml-2 cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-slate-400 underline transition-colors hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
  );
}
