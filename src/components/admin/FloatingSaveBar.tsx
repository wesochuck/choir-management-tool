import { Button } from '../ui';

interface FloatingSaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function FloatingSaveBar({ isDirty, isSaving, onSave, onDiscard }: FloatingSaveBarProps) {
  if (!isDirty) return null;

  return (
    <div className="border-border bg-surface fixed bottom-6 left-1/2 z-[1000] flex w-[calc(100%-48px)] max-w-[600px] -translate-x-1/2 items-center gap-6 rounded-md border px-6 py-3 shadow-xl">
      <div className="flex flex-1 items-center gap-2">
        <span className="text-text text-sm font-semibold">
          ⚠️ You have unsaved configuration changes.
        </span>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="small"
          disabled={isSaving}
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          type="button"
          variant="primary"
          size="small"
          disabled={isSaving}
          onClick={onSave}
          loading={isSaving}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
