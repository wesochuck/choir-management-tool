
interface FloatingSaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function FloatingSaveBar({ isDirty, isSaving, onSave, onDiscard }: FloatingSaveBarProps) {
  if (!isDirty) return null;

  return (
    <div className="floating-save-bar">
      <div className="floating-save-bar-info">
        <span className="floating-save-bar-text">
          ⚠️ You have unsaved configuration changes.
        </span>
      </div>
      <div className="floating-save-bar-actions">
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
