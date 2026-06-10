
interface FloatingSaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function FloatingSaveBar({ isDirty, isSaving, onSave, onDiscard }: FloatingSaveBarProps) {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-md shadow-xl px-6 py-3 flex items-center gap-6 z-[1000] w-[calc(100%-48px)] max-w-[600px]">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-semibold text-text">
          ⚠️ You have unsaved configuration changes.
        </span>
      </div>
      <div className="flex gap-3">
        <button 
          type="button" 
          className="btn btn-ghost btn-sm" 
          disabled={isSaving}
          onClick={onDiscard}
        >
          Discard
        </button>
        <button 
          type="button" 
          className="btn btn-primary btn-sm" 
          disabled={isSaving}
          onClick={onSave}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
