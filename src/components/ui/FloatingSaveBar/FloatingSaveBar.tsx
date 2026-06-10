import { Button } from '../Button/Button';
import styles from './FloatingSaveBar.module.css';

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
    <div className={styles.bar}>
      <div className={styles.info}>
        <span>
          {dirtyFieldCount !== undefined
            ? `${dirtyFieldCount} unsaved field(s)`
            : 'You have unsaved changes.'}
        </span>
      </div>
      <div className={styles.actions}>
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
