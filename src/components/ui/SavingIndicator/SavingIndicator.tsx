import { Spinner } from '../Spinner/Spinner';
import styles from './SavingIndicator.module.css';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SavingIndicatorProps {
  state: SaveState;
  errorMessage?: string;
  onRetry?: () => void;
  lastSavedAt?: Date;
}

export function SavingIndicator({
  state, errorMessage, onRetry, lastSavedAt,
}: SavingIndicatorProps) {
  if (state === 'idle') return null;

  if (state === 'saving') {
    return (
      <span className={[styles.indicator, styles.saving].join(' ')}>
        <Spinner size="small" /> Saving...
      </span>
    );
  }

  if (state === 'saved') {
    const timeStr = lastSavedAt
      ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <span className={[styles.indicator, styles.saved].join(' ')}>
        {'\u2713'} Saved{timeStr ? ` at ${timeStr}` : ''}
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className={[styles.indicator, styles.error].join(' ')}>
        {'\u26A0'} {errorMessage || 'Save failed'}
        {onRetry && (
          <button className={styles.retryBtn} onClick={onRetry} type="button">Retry</button>
        )}
      </span>
    );
  }

  return null;
}
