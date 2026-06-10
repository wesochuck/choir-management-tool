import { Button } from '../Button/Button';

export interface FloatingSaveBarProps {
  visible: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  saving?: boolean;
  dirtyFieldCount?: number;
}

export function FloatingSaveBar({
  visible, onSave, onDiscard,
  saveLabel = 'Save Changes', saving = false, dirtyFieldCount,
}: FloatingSaveBarProps) {
  if (!visible) return null;

  return (
    <div className="sticky bottom-0 z-[100] flex animate-[save-bar-slide-up_0.3s_ease] items-center justify-between gap-4 border-t border-border bg-surface px-6 py-4 max-sm:flex-col max-sm:items-stretch">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span>
          {dirtyFieldCount !== undefined
            ? `${dirtyFieldCount} unsaved field(s)`
            : 'You have unsaved changes.'}
        </span>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:flex-col">
        {onDiscard && (
          <Button variant="ghost" size="small" disabled={saving} onClick={onDiscard}>
            Discard
          </Button>
        )}
        <Button variant="primary" size="small" loading={saving} onClick={onSave}>
          {saving ? 'Saving...' : saveLabel}
        </Button>
      </div>
    </div>
  );
}
